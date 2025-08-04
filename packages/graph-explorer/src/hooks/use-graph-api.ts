import { useCallback, useEffect, useRef, useState } from "react";
import type { LinkId, MDBGraphData, MDBGraphLink, MDBGraphNode, NodeId } from "../types/graph";
import type { LinkObject, NodeObject } from "react-force-graph-2d";

export type UseGraphAPIOptions = {
  initialGraphData?: MDBGraphData;
};

export type GraphAPI = {
  graphData: MDBGraphData;

  getNode: (id: NodeId) => NodeObject<MDBGraphNode> | undefined;
  getLink: (id: LinkId) => LinkObject<MDBGraphNode, MDBGraphLink> | undefined;
  getOutgoingNodes: (id: NodeId) => NodeObject<MDBGraphNode>[];
  getIncomingNodes: (id: NodeId) => NodeObject<MDBGraphNode>[];

  addLink: (link: LinkObject<MDBGraphNode, MDBGraphLink>) => void;
  addNode: (node: MDBGraphNode) => void;
  clear: () => void;

  update: () => void;
};

/**
 * React hook managing a mutable graph data structure with nodes and links.
 * Supports efficient updates via internal refs and exposes a stable graph snapshot.
 * Prefer the use of the api methods instead of modifying initialGraphData directly.
 */
export function useGraphAPI({ initialGraphData = { nodes: [], links: [] } }: UseGraphAPIOptions): GraphAPI {
  const [graphData, setGraphData] = useState<MDBGraphData>({ nodes: [], links: [] });

  const nodeMap = useRef(new Map<NodeId, NodeObject<MDBGraphNode>>());
  const linkMap = useRef(new Map<LinkId, LinkObject<MDBGraphNode, MDBGraphLink>>());
  const outgoingNodes = useRef(new Map<NodeId, Set<NodeId>>());
  const incomingNodes = useRef(new Map<NodeId, Set<NodeId>>());

  const hasChanges = useRef(false);

  const addLink = useCallback((link: LinkObject<MDBGraphNode, MDBGraphLink>) => {
    const { id, source, target } = link;

    if (linkMap.current.has(id)) return;

    // cannot create link because either source or target does not exist
    if (!nodeMap.current.has(source) || !nodeMap.current.has(target)) return;

    linkMap.current.set(id, link);
    outgoingNodes.current.get(source)?.add(target);
    incomingNodes.current.get(target)?.add(source);

    hasChanges.current = true;
  }, []);

  const addNode = useCallback((node: MDBGraphNode) => {
    const { id } = node;
    if (nodeMap.current.has(id)) return;

    nodeMap.current.set(id, node);
    outgoingNodes.current.set(id, new Set());
    incomingNodes.current.set(id, new Set());

    hasChanges.current = true;
  }, []);

  // clear all the data structures
  const clear = useCallback(() => {
    // no changes
    if (
      nodeMap.current.size === 0 &&
      linkMap.current.size === 0 &&
      outgoingNodes.current.size === 0 &&
      incomingNodes.current.size === 0
    )
      return;

    nodeMap.current.clear();
    linkMap.current.clear();
    outgoingNodes.current.clear();
    incomingNodes.current.clear();

    hasChanges.current = true;
  }, []);

  // get a node by its id
  const getNode = useCallback((id: NodeId): NodeObject<MDBGraphNode> | undefined => {
    return nodeMap.current.get(id);
  }, []);

  // get a link by its id
  const getLink = useCallback((id: LinkId): LinkObject<MDBGraphNode, MDBGraphLink> | undefined => {
    return linkMap.current.get(id);
  }, []);

  const getOutgoingNodes = useCallback((id: NodeId): NodeObject<MDBGraphNode>[] => {
    return Array.from(outgoingNodes.current.get(id) || []).map((id) => nodeMap.current.get(id)!);
  }, []);

  const getIncomingNodes = useCallback((id: NodeId): NodeObject<MDBGraphNode>[] => {
    return Array.from(incomingNodes.current.get(id) || []).map((id) => nodeMap.current.get(id)!);
  }, []);

  // commits the updates to the graphData. Must be called at the end of a sequence of modifications
  const update = useCallback(() => {
    if (!hasChanges) return;

    setGraphData({
      nodes: Array.from(nodeMap.current.values()),
      links: Array.from(linkMap.current.values()),
    });
  }, []);

  // changes on initialGraphData resets everything
  useEffect(() => {
    clear();
    for (const node of initialGraphData.nodes) {
      addNode(node);
    }

    for (const link of initialGraphData.links) {
      addLink(link);
    }
    update();

    return () => clear();
  }, [initialGraphData]);

  return {
    graphData,

    getNode,
    getLink,
    getOutgoingNodes,
    getIncomingNodes,

    addLink,
    addNode,
    clear,

    update,
  };
}
