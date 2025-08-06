import classes from "./toolbar.module.css";

import { type ElementType } from "react";
import { Paper } from "../paper/paper";
import { ToolbarButton } from "./toolbar-button";

export type ToolId = "move" | "rectangular-selection";

export type ToolDef = {
  id: ToolId;
  title: string;
  icon: ElementType;
  onClick: () => void;
};

export type ToolbarProps = {
  darkMode?: boolean;
  tools: ToolDef[];
  activeToolId: ToolId;
};

export const Toolbar = ({ darkMode = false, tools, activeToolId }: ToolbarProps) => {
  return (
    <Paper className={classes.root} darkMode={darkMode} withBorder radius="lg">
      {tools.map(({ id, title, icon, onClick }) => (
        <ToolbarButton
          darkMode={darkMode}
          key={id}
          title={title}
          icon={icon}
          active={activeToolId === id}
          onClick={onClick}
        />
      ))}
    </Paper>
  );
};
