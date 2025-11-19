import { useCallback, useRef, useState } from "react";
import type { GraphVisData, GraphVisEdge, GraphVisNode } from "../types/graph";
import type { LinkObject, NodeObject } from "react-force-graph-2d";

export type GraphAPI = {
  graphData: GraphVisData;

  getNode: (id: string) => NodeObject<GraphVisNode> | undefined;
  getLink: (id: string) => LinkObject<GraphVisNode, GraphVisEdge> | undefined;
  getOutgoingLinks: (id: string) => LinkObject<GraphVisNode, GraphVisEdge>[];
  getIncomingLinks: (id: string) => LinkObject<GraphVisNode, GraphVisEdge>[];
  getNeighborNodesAndLinks: (id: string) => {
    nodes: NodeObject<GraphVisNode>[];
    links: LinkObject<GraphVisNode, GraphVisEdge>[];
  };

  addGraphData: ({ newGraphData, replace }: { newGraphData: GraphVisData; replace?: boolean }) => void;
  addLink: (link: LinkObject<GraphVisNode, GraphVisEdge>) => void;
  removeLink: (id: string) => void;
  addNode: (node: GraphVisNode) => void;
  removeNode: (id: string) => void;
  updateNode: (nodeId: string, nodeName: string, nodeLabels: string[]) => void;
  updateLinkName: (linkId: string, linkName: string) => void;
  clear: () => void;

  update: () => void;
};

/**
 * React hook managing a mutable graph data structure with nodes and links.
 * Supports efficient updates via internal refs and exposes a stable graph snapshot.
 */
export function useGraphAPI(): GraphAPI {
  const [graphData, setGraphData] = useState<GraphVisData>({ nodes: [], links: [] });

  const nodeMap = useRef(new Map<string, NodeObject<GraphVisNode>>());
  const linkMap = useRef(new Map<string, LinkObject<GraphVisNode, GraphVisEdge>>());
  const outgoingLinks = useRef(new Map<string, Set<string>>());
  const incomingLinks = useRef(new Map<string, Set<string>>());

  const hasChanges = useRef(false);

  // get a node by its id
  const getNode = useCallback((id: string): NodeObject<GraphVisNode> | undefined => {
    return nodeMap.current.get(id);
  }, []);

  // get a link by its id
  const getLink = useCallback((id: string): LinkObject<GraphVisNode, GraphVisEdge> | undefined => {
    return linkMap.current.get(id);
  }, []);

  const addLink = useCallback((link: LinkObject<GraphVisNode, GraphVisEdge>) => {
    const { id, source, target } = link;

    if (linkMap.current.has(id)) return;

    // cannot create link because either source or target does not exist
    if (!nodeMap.current.has(source) || !nodeMap.current.has(target)) return;

    linkMap.current.set(id, link);
    outgoingLinks.current.get(source)?.add(id);
    incomingLinks.current.get(target)?.add(id);

    hasChanges.current = true;
  }, []);

  const removeLink = useCallback((id: string) => {
    const link = linkMap.current.get(id);
    if (!link) return;

    const { source, target } = link;

    // source/target can be either a string or converted to a LinkObject afterwards
    const sourceId: string = typeof source === "string" ? source : (source as { id: string }).id;
    const targetId: string = typeof target === "string" ? target : (target as { id: string }).id;

    linkMap.current.delete(id);
    outgoingLinks.current.get(sourceId)?.delete(id);
    incomingLinks.current.get(targetId)?.delete(id);

    hasChanges.current = true;
  }, []);

  const addNode = useCallback((node: GraphVisNode) => {
    const { id } = node;
    if (nodeMap.current.has(id)) return;

    nodeMap.current.set(id, node);
    outgoingLinks.current.set(id, new Set());
    incomingLinks.current.set(id, new Set());

    hasChanges.current = true;
  }, []);

  // replaces or merge graphData
  const addGraphData = ({ newGraphData, replace = false }: { newGraphData: GraphVisData; replace?: boolean }) => {
    if (replace) {
      clear();
    }

    for (const node of newGraphData.nodes) {
      addNode(node);
    }

    for (const link of newGraphData.links) {
      addLink(link);
    }
  };

  const removeNode = useCallback((id: string) => {
    if (!nodeMap.current.has(id)) return;

    nodeMap.current.delete(id);

    for (const linkId of outgoingLinks.current.get(id)?.keys() ?? []) {
      linkMap.current.delete(linkId);
    }
    for (const linkId of incomingLinks.current.get(id)?.keys() ?? []) {
      linkMap.current.delete(linkId);
    }

    outgoingLinks.current.delete(id);
    incomingLinks.current.delete(id);

    hasChanges.current = true;
  }, []);

  // clear all the data structures
  const clear = useCallback(() => {
    // no changes
    if (
      nodeMap.current.size === 0 &&
      linkMap.current.size === 0 &&
      outgoingLinks.current.size === 0 &&
      incomingLinks.current.size === 0
    )
      return;

    nodeMap.current.clear();
    linkMap.current.clear();
    outgoingLinks.current.clear();
    incomingLinks.current.clear();

    hasChanges.current = true;
  }, []);

  const getOutgoingLinks = useCallback((id: string): LinkObject<GraphVisNode, GraphVisEdge>[] => {
    return Array.from(outgoingLinks.current.get(id) || [])
      .map((id) => linkMap.current.get(id))
      .filter((link) => link !== undefined);
  }, []);

  const getIncomingLinks = useCallback((id: string): LinkObject<GraphVisNode, GraphVisEdge>[] => {
    return Array.from(incomingLinks.current.get(id) || [])
      .map((id) => linkMap.current.get(id))
      .filter((link) => link !== undefined);
  }, []);

  const getNeighborNodesAndLinks = useCallback(
    (id: string): { nodes: NodeObject<GraphVisNode>[]; links: LinkObject<GraphVisNode, GraphVisEdge>[] } => {
      const neighborNodes = new Set<NodeObject<GraphVisNode>>();
      const neighborLinks = new Set<LinkObject<GraphVisNode, GraphVisEdge>>();

      for (const link of getOutgoingLinks(id)) {
        neighborLinks.add(link);
        const targetNode = nodeMap.current.get((link.target as GraphVisNode).id);
        if (targetNode) {
          neighborNodes.add(targetNode);
        }
      }

      for (const link of getIncomingLinks(id)) {
        neighborLinks.add(link);
        const sourceNode = nodeMap.current.get((link.source as GraphVisNode).id);
        if (sourceNode) {
          neighborNodes.add(sourceNode);
        }
      }

      return { nodes: Array.from(neighborNodes), links: Array.from(neighborLinks) };
    },
    []
  );

  // Updates a node's properties (name, types)
  const updateNode = useCallback((nodeId: string, nodeName: string, nodeLabels: string[]) => {
    const existingNode = nodeMap.current.get(nodeId);
    if (!existingNode) return;

    existingNode.name = nodeName;
    existingNode.labels = nodeLabels ?? [];
    hasChanges.current = true;
  }, []);

  const updateLinkName = useCallback((linkId: string, linkName: string) => {
    const existingLink = linkMap.current.get(linkId);
    if (!existingLink) return;

    existingLink.name = linkName;
    hasChanges.current = true;
  }, []);

  // commits the updates to the graphData. Must be called at the end of a sequence of modifications
  const update = useCallback(() => {
    if (!hasChanges.current) return;

    const newNodes = Array.from(nodeMap.current.values());
    const newLinks = Array.from(linkMap.current.values());

    setGraphData({
      nodes: newNodes,
      links: newLinks,
    });
    hasChanges.current = false;
  }, []);

  return {
    graphData,

    getNode,
    getLink,
    getOutgoingLinks,
    getIncomingLinks,
    getNeighborNodesAndLinks,

    addGraphData,
    addLink,
    removeLink,
    addNode,
    removeNode,
    updateNode,
    updateLinkName,
    clear,

    update,
  };
}
