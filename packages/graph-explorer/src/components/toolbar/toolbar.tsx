import classes from "./toolbar.module.css";

import { useState } from "react";

type ToolbarButtonProps = {
  title: string;
  icon: string;
};

const ToolbarButton = ({ title, icon }: ToolbarButtonProps) => {
  return (
    <button className={classes.toolbarButton}>
      <span className={classes.toolbarButtonIcon}>{icon}</span>
    </button>
  );
};

export const Toolbar = () => {
  const [activeTool, setActiveTool] = useState("move");

  const tools = [
    { id: "move", title: "Move tool", icon: "->" },
    { id: "rectangle-selection", title: "Rectangle selection", icon: "[]" },
  ];

  return (
    <div className={classes.toolbar}>
      {tools.map(({ id, title, icon }) => (
        <ToolbarButton key={id} title={title} icon={icon} />
      ))}
    </div>
  );
};
