import { useCallback, useEffect, useRef, useState } from "react";
import type { LinkId, MDBGraphData, MDBGraphLink, MDBGraphNode, NodeId } from "../types/graph";
import type { LinkObject, NodeObject } from "react-force-graph-2d";

export type GraphAPI = {
  graphData: MDBGraphData;

  getNode: (id: NodeId) => NodeObject<MDBGraphNode> | undefined;
  getLink: (id: LinkId) => LinkObject<MDBGraphNode, MDBGraphLink> | undefined;
  getOutgoingLinks: (id: NodeId) => LinkObject<MDBGraphNode, MDBGraphLink>[];
  getIncomingLinks: (id: NodeId) => LinkObject<MDBGraphNode, MDBGraphLink>[];

  addGraphData: ({ newGraphData, replace }: { newGraphData: MDBGraphData; replace?: boolean }) => void;
  addLink: (link: LinkObject<MDBGraphNode, MDBGraphLink>) => void;
  removeLink: (id: LinkId) => void;
  addNode: (node: MDBGraphNode) => void;
  removeNode: (id: NodeId) => void;
  updateNode: (node: MDBGraphNode) => void;
  clear: () => void;

  update: () => void;
};

/**
 * React hook managing a mutable graph data structure with nodes and links.
 * Supports efficient updates via internal refs and exposes a stable graph snapshot.
 */
export function useGraphAPI(): GraphAPI {
  const [graphData, setGraphData] = useState<MDBGraphData>({ nodes: [], links: [] });

  const nodeMap = useRef(new Map<NodeId, NodeObject<MDBGraphNode>>());
  const linkMap = useRef(new Map<LinkId, LinkObject<MDBGraphNode, MDBGraphLink>>());
  const outgoingLinks = useRef(new Map<NodeId, Set<LinkId>>());
  const incomingLinks = useRef(new Map<NodeId, Set<LinkId>>());

  const hasChanges = useRef(false);

  // get a node by its id
  const getNode = useCallback((id: NodeId): NodeObject<MDBGraphNode> | undefined => {
    return nodeMap.current.get(id);
  }, []);

  // get a link by its id
  const getLink = useCallback((id: LinkId): LinkObject<MDBGraphNode, MDBGraphLink> | undefined => {
    return linkMap.current.get(id);
  }, []);

  const addLink = useCallback((link: LinkObject<MDBGraphNode, MDBGraphLink>) => {
    const { id, source, target } = link;

    if (linkMap.current.has(id)) return;

    // cannot create link because either source or target does not exist
    if (!nodeMap.current.has(source) || !nodeMap.current.has(target)) return;

    linkMap.current.set(id, link);
    outgoingLinks.current.get(source)?.add(id);
    incomingLinks.current.get(target)?.add(id);

    hasChanges.current = true;
  }, []);

  const removeLink = useCallback((id: LinkId) => {
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

  const addNode = useCallback((node: MDBGraphNode) => {
    const { id } = node;
    if (nodeMap.current.has(id)) return;

    nodeMap.current.set(id, node);
    outgoingLinks.current.set(id, new Set());
    incomingLinks.current.set(id, new Set());

    hasChanges.current = true;
  }, []);

  // replaces or merge graphData
  const addGraphData = ({ newGraphData, replace = false }: { newGraphData: MDBGraphData; replace?: boolean }) => {
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

  const removeNode = useCallback((id: NodeId) => {
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

  const getOutgoingLinks = useCallback((id: NodeId): LinkObject<MDBGraphNode, MDBGraphLink>[] => {
    return Array.from(outgoingLinks.current.get(id) || []).map((id) => linkMap.current.get(id)!);
  }, []);

  const getIncomingLinks = useCallback((id: NodeId): LinkObject<MDBGraphNode, MDBGraphLink>[] => {
    return Array.from(incomingLinks.current.get(id) || []).map((id) => linkMap.current.get(id)!);
  }, []);

  const updateNode = useCallback((node: MDBGraphNode) => {
    const existingNode = nodeMap.current.get(node.id);
    if (!existingNode) return;

    existingNode.name = node.name;
    existingNode.types = node.types ?? [];
    hasChanges.current = true;
  }, []);

  // commits the updates to the graphData. Must be called at the end of a sequence of modifications
  const update = useCallback(() => {
    if (!hasChanges.current) return;

    setGraphData({
      nodes: Array.from(nodeMap.current.values()),
      links: Array.from(linkMap.current.values()),
    });
    hasChanges.current = false;
  }, []);

  return {
    graphData,

    getNode,
    getLink,
    getOutgoingLinks,
    getIncomingLinks,

    addGraphData,
    addLink,
    removeLink,
    addNode,
    removeNode,
    updateNode,
    clear,

    update,
  };
}
