import ForceGraph, { type ForceGraphMethods, type GraphData } from "react-force-graph-2d";
import type { MDBGraphData, MDBGraphLink, MDBGraphNode } from "./types/graph";
import { useGraphAPI } from "./hooks/use-graph-api";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export type GraphExplorerProps = {
  width: number;
  height: number;
  initialGraphData: MDBGraphData;
  backgroundColor?: string;
};

export type GraphExplorerHandle = ReturnType<typeof useGraphAPI>;

export const GraphExplorer = forwardRef<GraphExplorerHandle, GraphExplorerProps>(
  ({ width, height, backgroundColor, initialGraphData }, ref) => {
    const graphApi = useGraphAPI({ initialGraphData });
    useImperativeHandle(ref, () => graphApi, [graphApi]);

    const fgRef = useRef<ForceGraphMethods<MDBGraphNode, MDBGraphLink>>(undefined);

    useEffect(() => {
      // disable center force
      fgRef.current?.d3Force("center", null);
    }, []);

    return (
      <ForceGraph<MDBGraphNode, MDBGraphLink>
        ref={fgRef}
        backgroundColor={backgroundColor ?? "#fff"}
        graphData={graphApi.graphData}
        width={width}
        height={height}
      />
    );
  }
);
