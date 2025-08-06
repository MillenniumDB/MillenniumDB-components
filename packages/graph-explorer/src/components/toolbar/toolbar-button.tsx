import classes from "./toolbar-button.module.css";

import clsx from "clsx";
import type { ElementType } from "react";

export type ToolbarButtonProps = {
  title: string;
  icon: ElementType;
  active?: boolean;
  darkMode?: boolean;
  onClick: () => void;
};

export const ToolbarButton = ({ title, icon: Icon, active, darkMode, onClick }: ToolbarButtonProps) => {
  return (
    <button className={clsx(classes.root, active && classes.active, darkMode && classes.dark)} onClick={onClick}>
      <Icon size={20} />
    </button>
  );
};
