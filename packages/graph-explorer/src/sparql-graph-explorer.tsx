import type { Driver, Result, Session } from "@millenniumdb/driver";
import type { GraphVisData, GraphVisNode, GraphVisNodeValue } from "./types/graph";
import { useCallback, useRef, type CSSProperties } from "react";
import type { GraphSettings } from "./components/settings/settings";
import type { GraphColorConfig } from "./hooks/use-graph-colors";
import { GraphExplorer } from "./graph-explorer";
import type { GraphAPI } from "./hooks/use-graph-api";
import type { NodeObject } from "react-force-graph-2d";
import { SPARQLSideBarContent } from "./components/side-bar/sparql-sidebar-content";
import { SPARQLSettingsContent } from "./components/settings/sparql-settings-content";
import { getLinksAndNeighbors, getNameAndLabels, textSearchNodes } from "./utils/sparql-graph-utils";
import { formatGraphValue, getGraphValueId } from "./utils/node-id-utils";
import type { FetchNodesItem } from "./components/node-search/node-search";

export type SPARQLGraphExplorerProps = {
  driver: Driver;
  initialGraphData?: GraphVisData;
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
    async (node: NodeObject<GraphVisNode>, event: MouseEvent, outgoing: boolean, settings: GraphSettings) => {
      if (!graphAPI.current) return;
      let session;

      try {
        session = driver.session();

        const linksAndNeighbors = await getLinksAndNeighbors(
          session,
          node.value,
          settings.nameKeys,
          settings.labelsKey!,
          settings.prefixes,
          outgoing
        );
        for (const linkAndNeighbor of linksAndNeighbors) {
          const {
            neighborId,
            neighborValue,
            neighborName,
            neighborLabels,
            edgeId,
            edgeValue,
            edgeName
          } = linkAndNeighbor;
          graphAPI.current.addNode({
            id: neighborId,
            value: neighborValue,
            name: neighborName,
            labels: neighborLabels,
          });

          const source = outgoing ? getGraphValueId(node.value) : neighborId;
          const target = outgoing ? neighborId : getGraphValueId(node.value);

          graphAPI.current.addLink({
            id: edgeId,
            value: edgeValue,
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

  const handleSearchSelection = useCallback(async (nodeValue: GraphVisNodeValue, settings: GraphSettings) => {
    if (!graphAPI.current) return;

    let session;
    try {
      session = driver.session();

      const { name, labels } = await getNameAndLabels(
        session,
        nodeValue,
        settings.nameKeys,
        settings.labelsKey!,
        settings.prefixes
      );
      graphAPI.current.addNode({
        id: getGraphValueId(nodeValue),
        value: nodeValue,
        name,
        labels,
      });
    } catch (error) {
      console.error("Error in handleSearchSelection:", error);
    } finally {
      graphAPI.current.update();
      session?.close();
    }
  }, []);

  const handleRenderSidebarContent = (
    selectedNodeIds: Set<string>,
    selectedLinkIds: Set<string>,
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

      const nodes = graphAPI.current.graphData.nodes;
      const updates = await Promise.all(
        nodes.map(async (node) => {
          let session;
          try {
            session = driver.session();
            const { name, labels } = await getNameAndLabels(
              session, node.value, settings.nameKeys, settings.labelsKey!, settings.prefixes
            );
            return { id: node.id, name, labels };
          } catch (err) {
            console.error(`Failed to update node ${node.id}:`, err);
            return null;
          } finally {
            session?.close();
          }
        })
      );

      for (const u of updates) {
        if (u) graphAPI.current.updateNode(u.id, u.name, u.labels);
      }

      // Update links
      const linkIdsAndNames = graphAPI.current.graphData.links.map((l) => ({ id: l.id, value: l.value }));
      const linkNamesUpdates = linkIdsAndNames.map(({ id, value }) => {
        const newName = formatGraphValue(value, settings.prefixes!);
        return { id, name: newName };
      });

      for (const u of linkNamesUpdates) {
        graphAPI.current.updateLinkName(u.id, u.name);
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
