import classes from "./settings.module.css";

import { ActionIcon, Box, Button, Divider, Modal, TagsInput, Tooltip } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState } from "react";

export type GraphSettings = {
  searchProperties: string[];
};

export type SettingsProps = {
  initialSettings: GraphSettings;
  onSave: (newSettings: GraphSettings) => void;
};

export const Settings = ({ initialSettings, onSave }: SettingsProps) => {
  const [opened, { open, close }] = useDisclosure(false);

  const [tags, setTags] = useState<string[]>(initialSettings.searchProperties);
  const [currentTag, setCurrentTag] = useState<string>("");
  const [error, setError] = useState<string>("");

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
    });
    close();
  };

  // update state when initialSettings changes
  useEffect(() => {
    resetState();
  }, [initialSettings]);

  const resetState = () => {
    setTags(initialSettings.searchProperties);
    setCurrentTag("");
    setError("");
  };

  return (
    <>
      <Modal opened={opened} onClose={close} title="Settings" centered size="md">
        <TagsInput
          label="Node search properties"
          w="100%"
          error={error}
          placeholder="Enter a property"
          value={tags}
          onChange={handleTagsChange}
          searchValue={currentTag}
          onSearchChange={handleCurrentTagChange}
          splitChars={[" ", ",", "\n", "\t"]}
        />

        <Divider my="xs" />
        <Box className={classes.actionsContainer}>
          <Button variant="default" onClick={handleCancel}>
            {"Cancel"}
          </Button>
          <Button onClick={handleSave}>{"Save"}</Button>
        </Box>
      </Modal>

      <Tooltip label="Settings" position="right" withArrow>
        <ActionIcon className={classes.root} color="default" variant="transparent" onClick={open}>
          <IconSettings />
        </ActionIcon>
      </Tooltip>
    </>
  );
};
