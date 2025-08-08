import { useCallback, useRef } from "react";
import { GraphExplorer, type GraphExplorerProps } from "./graph-explorer";
import { Driver } from "millenniumdb-driver";
import type { GraphAPI } from "./hooks/use-graph-api";
import type { NodeObject } from "react-force-graph-2d";
import type { MDBGraphNode } from "./types/graph";

export type MDBGraphExplorer = GraphExplorerProps & {
  driver: Driver;
};

export const MDBGraphExplorer = ({ driver, ...props }: MDBGraphExplorer) => {
  const graphAPI = useRef<GraphAPI | null>(null);

  const handleNodeExpand = useCallback((node: NodeObject<MDBGraphNode>, event: MouseEvent) => {
    console.log("expand", node);
  }, []);

  return <GraphExplorer ref={graphAPI} {...props} onNodeExpand={handleNodeExpand} />;
};
