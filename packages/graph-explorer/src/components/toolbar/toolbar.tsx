import classes from "./toolbar.module.css";

import { ActionIcon, Paper } from "@mantine/core";
import type { Icon } from "@tabler/icons-react";

export type ToolId = "move" | "rectangular-selection";

export type ToolDef = {
  id: ToolId;
  title: string;
  icon: Icon;
  onClick: () => void;
};

export type ToolbarProps = {
  tools: ToolDef[];
  activeToolId: ToolId;
};

export const Toolbar = ({ tools, activeToolId }: ToolbarProps) => {
  return (
    <Paper className={classes.root} withBorder radius="lg" shadow="lg">
      {tools.map(({ id, title, icon: Icon, onClick }) => (
        <ActionIcon
          key={id}
          size="md"
          aria-label={title}
          radius="md"
          onClick={onClick}
          variant={activeToolId === id ? "filled" : "default"}
        >
          <Icon height="70%" width="70%" strokeWidth={1.5} />
        </ActionIcon>
      ))}
    </Paper>
  );
};
