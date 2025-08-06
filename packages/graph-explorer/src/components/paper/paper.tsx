import type { HTMLAttributes } from "react";

import classes from "./paper.module.css";
import clsx from "clsx";

type ShadowSize = "xs" | "sm" | "md" | "lg" | "none";
type RadiusSize = "xs" | "sm" | "md" | "lg" | "none";

interface PaperProps extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  shadow?: ShadowSize;
  radius?: RadiusSize;
  withBorder?: boolean;
  darkMode?: boolean;
}

export const Paper = ({
  children,
  shadow = "sm",
  radius = "sm",
  withBorder = false,
  darkMode = false,
  className = "",
  style,
  ...props
}: PaperProps) => {
  const paperClasses = clsx(
    classes.paper,
    classes[`shadow-${shadow}`],
    classes[`radius-${radius}`],
    withBorder ? classes.border : "",
    darkMode ? classes.dark : "",
    className
  );

  return (
    <div className={paperClasses} style={style} {...props}>
      {children}
    </div>
  );
};
