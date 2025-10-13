import type { Driver, Result, Session, Record as MDBRecord } from "@millenniumdb/driver";
import type { LinkId, MDBGraphData, MDBGraphNode, NodeId } from "./types/graph";
import { useCallback, useRef, type CSSProperties } from "react";
import type { GraphSettings } from "./components/settings/settings";
import type { GraphColorConfig } from "./hooks/use-graph-colors";
import { GraphExplorer } from "./graph-explorer";
import type { GraphAPI } from "./hooks/use-graph-api";
import type { NodeObject } from "react-force-graph-2d";
import type { FetchNodesItem } from "./components/node-search/node-search";
import { SPARQLSideBarContent } from "./components/side-bar/sparql-sidebar-content";
import { getIriDescription } from "./utils/node-utils";
import { SPARQLSettingsContent } from "./components/settings/sparql-settings-content";
import { getLinksAndNeighbors, getNameAndLabels, getPrefixedIri, textSearchNodes } from "./utils/sparql-graph-utils";

export type SPARQLGraphExplorerProps = {
  driver: Driver;
  initialGraphData?: MDBGraphData;
  initialSettings?: GraphSettings;
  style?: CSSProperties;
  className?: string;
  graphColors?: Partial<GraphColorConfig>;
};

export const SPARQLGraphExplorer = ({ driver, initialGraphData, ...props }: SPARQLGraphExplorerProps) => {
  const graphAPI = useRef<GraphAPI>(null);

  const fetchNodesSessionRef = useRef<Session | null>(null);
  const fetchNodesResultRef = useRef<Result | null>(null);

  const handleNodeExpand = useCallback(
    async (node: NodeObject<MDBGraphNode>, event: MouseEvent, outgoing: boolean, settings: GraphSettings) => {
      if (!graphAPI.current) return;
      let session;

      try {
        session = driver.session();

        const linksAndNeighbors = await getLinksAndNeighbors(
          session,
          node.id,
          settings.nameKeys,
          settings.labelsKey!,
          settings.prefixes,
          outgoing
        );
        for (const linkAndNeighbor of linksAndNeighbors) {
          const { neighborId, edgeId, edgeIri, edgeName, neighborLabels, neighborName } = linkAndNeighbor;
          graphAPI.current.addNode({
            id: neighborId,
            name: neighborName,
            types: neighborLabels,
          });

          const source = outgoing ? node.id : neighborId;
          const target = outgoing ? neighborId : node.id;

          graphAPI.current.addLink({
            id: edgeId,
            iri: edgeIri,
            name: edgeName,
            source,
            target,
          });
        }

        graphAPI.current.update();
      } catch (err) {
        console.error(err);
      } finally {
        session?.close();
      }
    },
    []
  );

  const handleFetchNodes = useCallback(async (query: string, settings: GraphSettings): Promise<FetchNodesItem[]> => {
    // TODO: Handle blank nodes?
    try {
      fetchNodesSessionRef.current = driver.session();
      return await textSearchNodes(fetchNodesSessionRef.current, query, settings.searchKeys, 50);
    } catch (error) {
      console.error(error);
      return [];
    } finally {
      fetchNodesSessionRef.current?.close();
      fetchNodesSessionRef.current = null;
      fetchNodesResultRef.current = null;
    }
  }, []);

  const handleAbortFetchNodes = useCallback(async (): Promise<void> => {
    if (fetchNodesResultRef.current) {
      driver.cancel(fetchNodesResultRef.current);
      fetchNodesSessionRef.current = null;
      fetchNodesResultRef.current = null;
    }
  }, []);

  const handleSearchSelection = useCallback(async (iri: string, settings: GraphSettings) => {
    if (!graphAPI.current) return;
    
    let session;
    try {
      session = driver.session();

      const { name, labels } = await getNameAndLabels(session, iri, settings.nameKeys, settings.labelsKey!, settings.prefixes);
      graphAPI.current.addNode({
        id: iri,
        name,
        types: labels,
      });
    } catch (error) {
      console.error("Error in handleSearchSelection:", error);
    } finally {
      graphAPI.current.update();
      session?.close();
    }
  }, []);

  const handleRenderSidebarContent = (
    selectedNodeIds: Set<NodeId>,
    selectedLinkIds: Set<LinkId>,
    getColorForLabel: (label: string) => string,
    settings: GraphSettings
  ) => {
    return (
      <SPARQLSideBarContent
        selectedNodeIds={selectedNodeIds}
        selectedLinkIds={selectedLinkIds}
        getColorForLabel={getColorForLabel}
        settings={settings}
        graphAPI={graphAPI}
        driver={driver}
      />
    );
  };

  const handleRenderSettingsContent = (
    settings: GraphSettings,
    onSave: (newSettings: GraphSettings) => void,
    close: () => void
  ) => {
    return (
      <SPARQLSettingsContent
        initialSettings={settings}
        onSave={onSave}
        close={close}
      />
    );
  };

  const handleSettingsChange = useCallback(
    async (settings: GraphSettings) => {
      if (!graphAPI.current) return;

      const nodeIds = graphAPI.current.graphData.nodes.map((n) => n.id);
      const updates = await Promise.all(
        nodeIds.map(async (id) => {
          let session;
          try {
            session = driver.session();
            const iriDescription = await getNameAndLabels(
              session, id, settings.nameKeys, settings.labelsKey!, settings.prefixes
            );
            if (!iriDescription) return null;
            return { id, name: iriDescription.name, types: iriDescription.labels };
          } catch (err) {
            console.error(`Failed to update node ${id}:`, err);
            return null;
          } finally {
            session?.close();
          }
        })
      );

      for (const u of updates) {
        if (u) graphAPI.current.updateNode(u);
      }

      // Update links
      const linkIdsAndNames = graphAPI.current.graphData.links.map((l) => ({ id: l.id, iri: l.iri }));
      const linkNamesUpdates = linkIdsAndNames.map(({ id, iri }) => {
        if (!iri) return { id, name: id };
        const newName = getPrefixedIri(iri, settings.prefixes!);
        return { id, name: newName };
      });

      for (const u of linkNamesUpdates) {
        graphAPI.current.updateLinkName(u.name, u.id);
      }

      graphAPI.current.update();
    },
    [driver, graphAPI]
  );

  return (
    <GraphExplorer
      {...props}
      ref={graphAPI}
      initialGraphData={initialGraphData}
      onNodeExpand={handleNodeExpand}
      fetchNodes={handleFetchNodes}
      abortFetchNodes={handleAbortFetchNodes}
      onSearchSelection={handleSearchSelection}
      renderSideBarContent={handleRenderSidebarContent}
      renderSettingsContent={handleRenderSettingsContent}
      onSettingsChange={handleSettingsChange}
    />
  );
};
