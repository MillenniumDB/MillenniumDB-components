import classes from "./settings.module.css";

import { useEffect, useMemo, useState } from "react";
import { Box, Button, Checkbox, Divider, TagsInput } from "@mantine/core";
import type { GraphSettings } from "./settings";

type MQLSettingsContentProps = {
  initialSettings: GraphSettings;
  onSave: (newSettings: GraphSettings) => void;
  close: () => void;
};

type Errors = {
  name: string;
  search: string;
};

const isValidProperty = (str: string) => {
  return /^[A-Za-z][A-Za-z0-9_]*$/.test(str);
};

export const MQLSettingsContent = ({
  initialSettings,
  onSave,
  close,
}: MQLSettingsContentProps) => {
  const [nameTags, setNameTags] = useState<string[]>(initialSettings.nameKeys ?? []);
  const [searchTags, setSearchTags] = useState<string[]>(initialSettings.searchKeys ?? []);
  const [sameAsName, setSameAsName] = useState<boolean>(
    JSON.stringify(initialSettings.nameKeys ?? []) ===
      JSON.stringify(initialSettings.searchKeys ?? [])
  );
  const [currentNameTag, setCurrentNameTag] = useState<string>("");
  const [currentSearchTag, setCurrentSearchTag] = useState<string>("");

  const [errors, setErrors] = useState<Errors>({ name: "", search: "" });

  // Name tags
  const handleCurrentNameChange = (val: string) => {
    setCurrentNameTag(val);
    if (!val) setErrors((prev) => ({ ...prev, name: "" }));
  };

  const handleNameTagsChange = (next: string[]) => {
    const isTagRemoved = next.length < nameTags.length;
    const candidate = next.find((tag) => !nameTags.includes(tag)) || "";
    if (isTagRemoved || isValidProperty(candidate)) {
      setNameTags(next);
      setErrors((prev) => ({ ...prev, name: "" }));
      if (sameAsName) {
        setSearchTags(next);
        setErrors((prev) => ({ ...prev, search: "" }));
      }
    } else {
      setErrors((prev) => ({
        ...prev,
        name: "Invalid property.",
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
    if (isTagRemoved || isValidProperty(candidate)) {
      setSearchTags(next);
      setErrors((prev) => ({ ...prev, search: "" }));
    } else {
      setErrors((prev) => ({
        ...prev,
        search: "Invalid property.",
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

  // Handlers
  const handleCancel = () => {
    resetState();
    close();
  };

  const handleSave = () => {
    if (errors.name || errors.search) return;
    onSave({ nameKeys: nameTags, searchKeys: searchTags });
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
    setErrors({ name: "", search: "" });
  };

  const saveDisabled = useMemo(
    () => Boolean(errors.name || errors.search),
    [errors]
  );

  return (
    <>
      <TagsInput
        label="Name properties"
        description="Properties used to fetch the node display names"
        w="100%"
        mb="md"
        error={errors.name}
        value={nameTags}
        onChange={handleNameTagsChange}
        searchValue={currentNameTag}
        onSearchChange={handleCurrentNameChange}
        acceptValueOnBlur={false}
        splitChars={[",", " "]}
      />

      <TagsInput
        label="Search properties"
        description="Properties used to search for nodes"
        w="100%"
        mb="xs"
        error={errors.search}
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
        label="Same as name properties"
        mb="md"
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
