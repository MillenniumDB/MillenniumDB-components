import { useCallback, useRef, type CSSProperties } from "react";
import { GraphExplorer } from "./graph-explorer";
import { Driver, Result, Session } from "@millenniumdb/driver";
import { type GraphAPI } from "./hooks/use-graph-api";
import type { NodeObject } from "react-force-graph-2d";
import type { GraphVisData, GraphVisNode, GraphVisNodeValue } from "./types/graph";
import type { FetchNodesItem } from "./components/node-search/node-search";
import type { GraphColorConfig } from "./hooks/use-graph-colors";
import { MQLSideBarContent } from "./components/side-bar/mql-side-bar-content";
import type { GraphSettings } from "./components/settings/settings";
import { MQLSettingsContent } from "./components/settings/mql-settings-content";
import { getLinksNameAndLabels, getNameAndLabels, textSearchNodes } from "./utils/mql-graph-utils";
import { getGraphValueId } from "./utils/node-id-utils";

export type MQLGraphExplorerProps = {
  driver: Driver;
  initialGraphData?: GraphVisData;
  initialSettings?: GraphSettings;
  style?: CSSProperties;
  className?: string;
  graphColors?: Partial<GraphColorConfig>;
};

export const MQLGraphExplorer = ({ driver, initialGraphData, ...props }: MQLGraphExplorerProps) => {
  const graphAPI = useRef<GraphAPI>(null);

  const fetchNodesSessionRef = useRef<Session | null>(null);
  const fetchNodesResultRef = useRef<Result | null>(null);

  const handleNodeExpand = useCallback(
    async (node: NodeObject<GraphVisNode>, event: MouseEvent, outgoing: boolean, settings: GraphSettings) => {
      if (!graphAPI.current) return;
      let session;

      try {
        session = driver.session();

        const linksNameAndLabels = await getLinksNameAndLabels(session, node.value, settings.nameKeys, outgoing);
        for (const linkNameAndLabels of linksNameAndLabels) {
          const { otherId, otherValue, edgeId, edgeValue, type, labels, name } = linkNameAndLabels;
          graphAPI.current.addNode({
            id: otherId,
            value: otherValue,
            name,
            labels,
          });

          const source = outgoing ? node.id : otherId;
          const target = outgoing ? otherId : node.id;

          graphAPI.current.addLink({
            id: edgeId,
            value: edgeValue,
            name: type,
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

  const handleSearchSelection = useCallback(async (nodeValue: GraphVisNodeValue, settings: GraphSettings) => {
    if (!graphAPI.current) return;

    let session;
    try {
      session = driver.session();

      const { name, labels } = await getNameAndLabels(session, nodeValue, settings.nameKeys);
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

  const handleFetchNodes = useCallback(async (query: string, settings: GraphSettings): Promise<FetchNodesItem[]> => {
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

  const handleRenderSidebarContent = (
    selectedNodeIds: Set<string>,
    selectedLinkIds: Set<string>,
    getColorForLabel: (label: string) => string,
    settings: GraphSettings
  ) => {
    return (
      <MQLSideBarContent
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
    return <MQLSettingsContent initialSettings={settings} onSave={onSave} close={close} />;
  };

  const handleSettingsChange = useCallback(
    async (settings: GraphSettings) => {
      if (!graphAPI.current) return;

      let updates = [];
      const nodes = graphAPI.current.graphData.nodes;
      
      for (const node of nodes) {
        let session: Session | undefined;
        try {
          session = driver.session();
          const nodeDescription = await getNameAndLabels(session, node.value, settings.nameKeys);
          updates.push({ id: node.id, name: nodeDescription.name, types: nodeDescription.labels });
        } catch (err) {
          console.error(`Failed to update node ${node.id}:`, err);
        } finally {
          session?.close();
        }
      }

      for (const u of updates) {
        if (u) graphAPI.current.updateNode(u.id, u.name, u.types);
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
      onSettingsChange={handleSettingsChange}
      renderSideBarContent={handleRenderSidebarContent}
      renderSettingsContent={handleRenderSettingsContent}
    />
  );
};
