import { useCallback, useRef, type CSSProperties } from "react";
import { GraphExplorer } from "./graph-explorer";
import { Driver, Result, Session, Record as MDBRecord } from "@millenniumdb/driver";
import { type GraphAPI } from "./hooks/use-graph-api";
import type { NodeObject } from "react-force-graph-2d";
import type { LinkId, MDBGraphData, MDBGraphNode, NodeId } from "./types/graph";
import type { FetchNodesItem } from "./components/node-search/node-search";
import { getFetchNodesQueryMQL } from "./utils/queries";
import type { GraphColorConfig } from "./hooks/use-graph-colors";
import { MQLSideBarContent } from "./components/side-bar/mql-side-bar-content";
import type { GraphSettings } from "./components/settings/settings";
import { getNodeDescription } from "./utils/node-utils";
import { MQLSettingsContent } from "./components/settings/mql-settings-content";
import { getLinksNameAndLabels, getNameAndLabels, textSearchNodes } from "./utils/mql-graph-utils";

export type MQLGraphExplorerProps = {
  driver: Driver;
  initialGraphData?: MDBGraphData;
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
    async (node: NodeObject<MDBGraphNode>, event: MouseEvent, outgoing: boolean, settings: GraphSettings) => {
      if (!graphAPI.current) return;
      let session;

      try {
        session = driver.session();

        const linksNameAndLabels = await getLinksNameAndLabels(session, node.id, settings.nameKeys, outgoing);
        for (const linkNameAndLabels of linksNameAndLabels) {
          const { otherId, edgeId, type, labels, name } = linkNameAndLabels;
          graphAPI.current.addNode({
            id: otherId,
            name,
            types: labels,
          });

          const source = outgoing ? node.id : otherId;
          const target = outgoing ? otherId : node.id;

          graphAPI.current.addLink({
            id: edgeId,
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

  const handleSearchSelection = useCallback(async (nodeId: string, settings: GraphSettings) => {
    if (!graphAPI.current) return;

    let session;
    try {
      session = driver.session();

      const { name, labels } = await getNameAndLabels(session, nodeId, settings.nameKeys);
      graphAPI.current.addNode({
        id: nodeId,
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

  const handleSettingsChange = useCallback(
    async (settings: GraphSettings) => {
      if (!graphAPI.current) return;

      const nodeIds = graphAPI.current.graphData.nodes.map((n) => n.id);
      const updates = await Promise.all(
        nodeIds.map(async (id) => {
          let session;
          try {
            session = driver.session();
            const nodeDescription = await getNodeDescription(id, settings.nameKeys, session);
            if (!nodeDescription) return null;
            return { id, name: nodeDescription.name, types: nodeDescription.labels };
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
      graphAPI.current.update();
    },
    [driver, graphAPI]
  );

  const handleRenderSidebarContent = (
    selectedNodeIds: Set<NodeId>,
    selectedLinkIds: Set<LinkId>,
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
