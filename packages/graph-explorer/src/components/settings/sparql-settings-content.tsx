import classes from "./settings.module.css";

import { useEffect, useState, useMemo } from "react";
import { Box, Button, Divider, TagsInput, Textarea, TextInput } from "@mantine/core";
import type { GraphSettings } from "./settings";

type SPARQLSettingsContentProps = {
  initialSettings: GraphSettings;
  onSave: (newSettings: GraphSettings) => void;
  close: () => void;
};

export const SPARQLSettingsContent = ({
  initialSettings,
  onSave,
  close,
}: SPARQLSettingsContentProps) => {
  const [tags, setTags] = useState<string[]>(initialSettings.searchProperties);
  const [currentTag, setCurrentTag] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [labelsPredicate, setLabelsPredicate] = useState<string>("");

  const [prefixesInput, setPrefixesInput] = useState<string>(() =>
    Object.entries(initialSettings.prefixes ?? {})
      .map(([p, ns]) => `@prefix ${p}: <${ns}> .`)
      .join("\n")
  );

  function isValidProperty(str: string) {
    return /^[A-Za-z][A-Za-z0-9_]*$/.test(str);
  }

  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags.filter((v) => isValidProperty(v)));
  };

  const handleCurrentTagChange = (newValue: string) => {
    if (newValue.length === 0) {
      setError("");
    } else {
      setError(isValidProperty(newValue) ? "" : "Invalid property");
    }
    setCurrentTag(newValue);
  };

  const { prefixesMap, prefixesError } = useMemo(() => {
    const map: Record<string, string> = {};
    let hasError = false;

    const lines = prefixesInput.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    const re = /^@prefix\s+([A-Za-z][\w-]*):\s*<([^>]+)>\s*\.\s*$/;

    for (const line of lines) {
      const m = line.match(re);
      if (!m) {
        hasError = true;
        continue;
      }
      const [, prefix, iri] = m;
      if (map[prefix]) {
        hasError = true;
        continue;
      }
      map[prefix] = iri;
    }

    return { prefixesMap: map, prefixesError: hasError };
  }, [prefixesInput]);

  const handleCancel = () => {
    resetState();
    close();
  };

  const handleSave = () => {
    if (prefixesError) return;
    onSave({
      searchProperties: tags,
      labelsPredicate,
      prefixes: prefixesMap,
    });
    close();
  };

  // update state when initialSettings changes
  useEffect(() => {
    resetState();
  }, [initialSettings]);

  const resetState = () => {
    setTags(initialSettings.searchProperties);
    setLabelsPredicate(initialSettings.labelsPredicate);
    setCurrentTag("");
    setError("");
    setPrefixesInput(
      Object.entries(initialSettings.prefixes ?? {})
        .map(([p, ns]) => `@prefix ${p}: <${ns}> .`)
        .join("\n")
    );
  };

  return (
    <>
      <TagsInput
        label="Node search properties"
        w="100%"
        mb="md"
        error={error}
        placeholder="Enter a property"
        value={tags}
        onChange={handleTagsChange}
        searchValue={currentTag}
        onSearchChange={handleCurrentTagChange}
        splitChars={[" ", ",", "\n", "\t"]}
      />

      <TextInput
        label="Node labels predicate"
        placeholder="Enter a predicate"
        w="100%"
        mb="md"
        value={labelsPredicate}
        onChange={(event) => setLabelsPredicate(event.currentTarget.value)}
      />

      <Textarea
        label="RDF prefixes"
        placeholder={`@prefix ex: <http://example.com/> .\n@prefix foaf: <http://xmlns.com/foaf/0.1/> .`}
        autosize
        minRows={4}
        w="100%"
        value={prefixesInput}
        onChange={(e) => setPrefixesInput(e.currentTarget.value)}
        error={prefixesError ? "Some lines are invalid" : undefined}
      />

      <Divider my="xs" />
      <Box className={classes.actionsContainer}>
        <Button variant="default" onClick={handleCancel}>
          {"Cancel"}
        </Button>
        <Button onClick={handleSave}>{"Save"}</Button>
      </Box>
    </>
  );
}
