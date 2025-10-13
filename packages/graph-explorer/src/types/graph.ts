import { type GraphData } from "react-force-graph-2d";

export type NodeId = string;
export type LinkId = string;
export type IRI = string;

export type MDBGraphNode = {
  id: NodeId;
  name: string;
  types?: string[];
  labelBox?: LabelBox;
  showLabel?: boolean;
};

export type MDBGraphLink = {
  id: LinkId;
  iri?: IRI;
  name: string;
  source: NodeId;
  target: NodeId;
  labelBox?: LabelBox;
  showLabel?: boolean;
};

export type LabelBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MDBGraphData = GraphData<MDBGraphNode, MDBGraphLink>;
