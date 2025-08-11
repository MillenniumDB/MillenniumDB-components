import classes from "./side-bar.module.css";

import type { NodeId } from "../../types/graph";
import { Box } from "@mantine/core";

type SideBarProps = {
  selectedNodeIds: Set<NodeId>;
};

export const SideBar = ({ selectedNodeIds }: SideBarProps) => {
  return (
    <Box className={classes.root} display={selectedNodeIds.size > 0 ? "block" : "none"}>
      {"TODO: sidebar"}
    </Box>
  );
};
