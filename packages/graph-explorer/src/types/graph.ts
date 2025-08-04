import { type GraphData } from "react-force-graph-2d";

export type NodeId = string;
export type LinkId = string;

export type MDBGraphNode = {
  id: NodeId;
  name: string;
  types?: string[];
};

export type MDBGraphLink = {
  id: LinkId;
  name: string;
  source: NodeId;
  target: NodeId;
};

export type MDBGraphData = GraphData<MDBGraphNode, MDBGraphLink>;
