import classes from "./settings.module.css";

import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Checkbox, Divider, TagsInput, Textarea, TextInput } from "@mantine/core";
import * as URI from "uri-js";
import type { GraphSettings } from "./settings";

type SPARQLSettingsContentProps = {
  initialSettings: GraphSettings;
  onSave: (newSettings: GraphSettings) => void;
  close: () => void;
};

type Errors = {
  name: string;
  search: string;
  labels: string;
  prefixes: string;
};

function isValidIri(str: string): boolean {
  if (typeof str !== "string") return false;
  const parsed = URI.parse(str);
  return !!parsed.scheme && !parsed.error;
}

export const SPARQLSettingsContent = ({
  initialSettings,
  onSave,
  close,
}: SPARQLSettingsContentProps) => {
  const [nameTags, setNameTags] = useState<string[]>(initialSettings.nameKeys ?? []);
  const [searchTags, setSearchTags] = useState<string[]>(initialSettings.searchKeys ?? []);
  const [sameAsName, setSameAsName] = useState<boolean>(
    JSON.stringify(initialSettings.nameKeys ?? []) ===
      JSON.stringify(initialSettings.searchKeys ?? [])
  );
  const [currentNameTag, setCurrentNameTag] = useState<string>("");
  const [currentSearchTag, setCurrentSearchTag] = useState<string>("");
  const [labelsPredicate, setLabelsPredicate] = useState<string>(initialSettings.labelsKey ?? "");
  const [prefixesValue, setPrefixesValue] = useState<string>(() =>
    Object.entries(initialSettings.prefixes ?? {})
      .map(([p, ns]) => `@prefix ${p}: <${ns}> .`)
      .join("\n")
  );

  const [errors, setErrors] = useState<Errors>({ name: "", search: "", labels: "", prefixes: "" });

  // Name tags
  const handleCurrentNameChange = (val: string) => {
    setCurrentNameTag(val);
    if (!val) setErrors((prev) => ({ ...prev, name: "" }));
  };

  const handleNameTagsChange = (next: string[]) => {
    const isTagRemoved = next.length < nameTags.length;
    const candidate = next.find((tag) => !nameTags.includes(tag)) || "";
    if (isTagRemoved || isValidIri(candidate)) {
      setNameTags(next);
      setErrors((prev) => ({ ...prev, name: "" }));
      if (sameAsName) {
        setSearchTags(next);
        setErrors((prev) => ({ ...prev, search: "" }));
      }
    } else {
      setErrors((prev) => ({
        ...prev,
        name: "Invalid IRI. Use http://example.com/predicate.",
      }));
    }
  };

  // Search tags
  const handleCurrentSearchChange = (val: string) => {
    if (sameAsName) return;
    setCurrentSearchTag(val);
    if (!val) setErrors((prev) => ({ ...prev, search: "" }));
  };

  const handleSearchTagsChange = (next: string[]) => {
    if (sameAsName) return;
    const isTagRemoved = next.length < searchTags.length;
    const candidate = next.find((t) => !searchTags.includes(t)) || "";
    if (isTagRemoved || isValidIri(candidate)) {
      setSearchTags(next);
      setCurrentSearchTag("");
      setErrors((prev) => ({ ...prev, search: "" }));
    } else {
      setErrors((prev) => ({
        ...prev,
        search: "Invalid IRI. Use http://example.com/predicate.",
      }));
    }
  };

  const handleSameAsNameChange = (checked: boolean) => {
    setSameAsName(checked);
    if (checked) {
      setSearchTags(nameTags);
      setCurrentSearchTag("");
      setErrors((prev) => ({ ...prev, search: "" }));
    }
  };

  // Labels predicate
  const handleLabelsChange = (val: string) => {
    setLabelsPredicate(val);
    if (!val || isValidIri(val)) {
      setErrors((prev) => ({ ...prev, labels: "" }));
    } else {
      setErrors((prev) => ({
        ...prev,
        labels: "Invalid IRI. Use http://example.com/predicate.",
      }));
    }
  };

  // Prefixes
  function parsePrefixes(input: string): { map: Record<string, string>; error: string | null } {
    const map: Record<string, string> = {};
    const trimmed = input.trim();
    if (!trimmed) return { map, error: null };

    const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const re = /^@prefix\s+([A-Za-z][\w-]*):\s*<([^>]+)>\s*\.\s*$/;

    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(re);
      if (!m) {
        return { map: {}, error: `Invalid format on line ${i + 1}. Use @prefix ex: <http://example.com/> .` };
      }
      const [, prefix, iri] = m;
      if (map[prefix]) {
        return { map: {}, error: `Duplicated prefix "${prefix}" on line ${i + 1}.` };
      }
      map[prefix] = iri;
    }
    return { map, error: null };
  }

  const handlePrefixesChange = (val: string) => {
    setPrefixesValue(val);
    const parsed = parsePrefixes(val);
    setErrors(prev => ({ ...prev, prefixes: parsed.error ?? "" }));
  };

  // Handlers
  const handleCancel = () => {
    resetState();
    close();
  };

  const handleSave = () => {
    if (errors.name || errors.search || errors.labels || errors.prefixes) return;
    const parsed = parsePrefixes(prefixesValue);

    onSave({
      nameKeys: nameTags,
      searchKeys: searchTags,
      labelsKey: labelsPredicate,
      prefixes: parsed.map,
    });
    close();
  };

  // update state when initialSettings changes
  useEffect(() => {
    resetState();
  }, [initialSettings]);

  const resetState = () => {
    setNameTags(initialSettings.nameKeys);
    setSearchTags(initialSettings.searchKeys);
    setSameAsName(
      JSON.stringify(initialSettings.nameKeys) ===
      JSON.stringify(initialSettings.searchKeys)
    );
    setCurrentNameTag("");
    setCurrentSearchTag("");
    setLabelsPredicate(initialSettings.labelsKey ?? "");
    setPrefixesValue(
      Object.entries(initialSettings.prefixes ?? {})
        .map(([p, ns]) => `@prefix ${p}: <${ns}> .`)
        .join("\n")
    );
    setErrors({ name: "", search: "", labels: "", prefixes: "" });
  };

  const saveDisabled = useMemo(
    () => Boolean(errors.name || errors.search || errors.labels || errors.prefixes),
    [errors]
  );

  return (
    <>
      <TagsInput
        label="Name predicates"
        description="IRIs used to fetch the node display names"
        w="100%"
        mb="md"
        error={errors.name}
        placeholder="Enter a predicate"
        value={nameTags}
        onChange={handleNameTagsChange}
        searchValue={currentNameTag}
        onSearchChange={handleCurrentNameChange}
        acceptValueOnBlur={false}
        splitChars={[",", " "]}
      />

      <TagsInput
        label="Search predicates"
        description="IRIs used to search for nodes"
        w="100%"
        mb="xs"
        error={errors.search}
        placeholder="Enter a predicate"
        value={sameAsName ? nameTags : searchTags}
        onChange={handleSearchTagsChange}
        searchValue={sameAsName ? "" : currentSearchTag}
        onSearchChange={handleCurrentSearchChange}
        acceptValueOnBlur={false}
        splitChars={[",", " "]}
        disabled={sameAsName}
      />

      <Checkbox
        checked={sameAsName}
        onChange={(e) => handleSameAsNameChange(e.currentTarget.checked)}
        label="Same as name predicates"
        mb="md"
      />

      <TextInput
        label="Labels predicate"
        description="IRI used to fetch the node labels"
        error={errors.labels}
        placeholder="Enter a predicate"
        w="100%"
        mb="md"
        value={labelsPredicate}
        onChange={(e) => handleLabelsChange(e.currentTarget.value)}
      />

      <Textarea
        label="Prefixes"
        description="SPARQL prefixes used to display IRIs"
        placeholder={`@prefix ex: <http://example.com/> .\n@prefix foaf: <http://xmlns.com/foaf/> .`}
        error={errors.prefixes}
        autosize
        minRows={4}
        w="100%"
        value={prefixesValue}
        onChange={(e) => handlePrefixesChange(e.currentTarget.value)}
      />

      <Divider my="xs" />
      <Box className={classes.actionsContainer}>
        <Button variant="default" onClick={handleCancel}>
          {"Cancel"}
        </Button>
        <Button onClick={handleSave} disabled={saveDisabled}>
          {"Save"}
        </Button>
      </Box>
    </>
  );
};
