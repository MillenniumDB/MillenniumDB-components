import classes from "./side-bar.module.css";

import type { NodeId } from "../../types/graph";
import { ActionIcon, Box, CloseButton, Divider, Paper, ScrollArea, Tooltip, Transition } from "@mantine/core";
import { useEffect, useState, type ReactNode } from "react";
import { IconChevronCompactLeft } from "@tabler/icons-react";
import type { GraphSettings } from "../settings/settings";

type SideBarProps = {
  selectedNodeIds: Set<NodeId>;
  getColorForLabel: (label: string) => string;
  settings: GraphSettings;
  renderContent?: ((
    selectedNodeIds: Set<NodeId>,
    getColorForLabel: (label: string) => string,
    settings: GraphSettings
  ) => ReactNode) | undefined;
};

export const SideBar = ({ selectedNodeIds, getColorForLabel, settings, renderContent }: SideBarProps) => {
  const [open, setOpen] = useState<boolean>(false);
  const [autoTriggered, setAutoTriggered] = useState<boolean>(false);

  // Auto-open the first time
  useEffect(() => {
    if (selectedNodeIds.size > 0 && !autoTriggered) {
      setOpen(true);
      setAutoTriggered(true); // won't trigger again
    }
  }, [selectedNodeIds, autoTriggered]);

  return (
    <>
      <Transition mounted={open} transition="slide-left" duration={300} timingFunction="ease">
        {(styles) => (
          <Paper className={classes.root} style={{ ...styles }} shadow="lg">
            <Box className={classes.closeButtonContainer}>
              <CloseButton onClick={() => setOpen(false)} />
            </Box>
            <Divider />
            <Box className={classes.contentContainer}>
              {renderContent?.(selectedNodeIds, getColorForLabel, settings)}
            </Box>
          </Paper>
        )}
      </Transition>
      {!open && (
        <Box className={classes.openSidebarContainer}>
          <Tooltip label="Open sidebar" position="left" withArrow>
            <ActionIcon onClick={() => setOpen(true)} variant="transparent" color="default">
              <IconChevronCompactLeft />
            </ActionIcon>
          </Tooltip>
        </Box>
      )}
    </>
  );
};
