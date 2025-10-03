import classes from "./settings.module.css";

import { ActionIcon, Box, Button, Divider, Modal, TagsInput, Tooltip } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState, type ReactNode } from "react";

export type GraphSettings = {
  nameKeys: string[];
  searchKeys: string[];
  labelsKey?: string;
  prefixes?: Record<string, string>;
};

export type SettingsProps = {
  initialSettings: GraphSettings;
  onSave: (newSettings: GraphSettings) => void;
  renderContent?: ((
    settings: GraphSettings,
    onSave: (newSettings: GraphSettings) => void,
    close: () => void
  ) => ReactNode) | undefined;
};

export const Settings = ({ initialSettings, onSave, renderContent }: SettingsProps) => {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Modal opened={opened} onClose={close} title="Settings" centered size="md">
        {renderContent?.(initialSettings, onSave, close)}
      </Modal>

      <Tooltip label="Settings" position="right" withArrow>
        <ActionIcon className={classes.root} color="default" variant="transparent" onClick={open}>
          <IconSettings />
        </ActionIcon>
      </Tooltip>
    </>
  );
};
