import classes from "./settings.module.css";

import { useEffect, useState } from "react";
import { Box, Button, Divider, TagsInput, TextInput } from "@mantine/core";
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

  const handleCancel = () => {
    resetState();
    close();
  };

  const handleSave = () => {
    onSave({
      searchProperties: tags,
      labelsPredicate,
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
        value={labelsPredicate}
        onChange={(event) => setLabelsPredicate(event.currentTarget.value)}
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
