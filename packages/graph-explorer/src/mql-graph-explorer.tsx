import { forwardRef, useCallback, useImperativeHandle, useRef, type CSSProperties } from "react";
import { GraphExplorer } from "./graph-explorer";
import { Driver, Result, Session } from "@millenniumdb/driver";
import { useGraphAPI, type GraphAPI } from "./hooks/use-graph-api";
import type { NodeObject } from "react-force-graph-2d";
import type { MDBGraphData, MDBGraphNode, NodeId } from "./types/graph";
import type { FetchNodesItem } from "./components/node-search/node-search";
import { getFetchNodesQueryMQL } from "./utils/queries";
import type { GraphColorConfig } from "./hooks/use-graph-colors";
import { MQLSideBarContent } from "./components/side-bar/mql-side-bar-content";
import type { GraphSettings } from "./components/settings/settings";
import { getNodeDescription } from "./utils/node-utils";
import { MQLSettingsContent } from "./components/settings/mql-settings-content";

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

        if (outgoing) {
          const result = session.run(`MATCH (${node.id})-[?edge :?type]->(?target) RETURN *`);
          const records = await result.records();
          for (const record of records) {
            const edgeId = record.get("edge").id;
            const type = record.get("type");
            const target = record.get("target");
            const nodeDescription = await getNodeDescription(target.id, settings.searchProperties, session);
            if (nodeDescription) {
              graphAPI.current.addNode({
                id: target.id,
                name: nodeDescription.name,
                types: nodeDescription.labels,
              });
            } else {
              graphAPI.current.addNode({ id: target.id, name: `${target}` });
            }
            graphAPI.current.addLink({ id: edgeId, name: `${type}`, source: node.id, target: target.id });
          }
        } else {
          const result = session.run(`MATCH (?source)-[?edge :?type]->(${node.id}) RETURN *`);
          const records = await result.records();
          for (const record of records) {
            const source = record.get("source");
            const edgeId = record.get("edge").id;
            const type = record.get("type");
            const nodeDescription = await getNodeDescription(source.id, settings.searchProperties, session);
            if (nodeDescription) {
              graphAPI.current.addNode({
                id: source.id,
                name: nodeDescription.name,
                types: nodeDescription.labels,
              });
            } else {
              graphAPI.current.addNode({ id: source.id, name: `${source}` });
            }
            graphAPI.current.addLink({ id: edgeId, name: `${type}`, source: source.id, target: node.id });
          }
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

  const handleSearchSelection = useCallback(async (node: MDBGraphNode, settings: GraphSettings) => {
    if (!graphAPI.current) return;
    const properties = settings.searchProperties;
    let session;

    try {
      session = driver.session();
      const nodeDescription = await getNodeDescription(node.id, properties, session);
      if (!nodeDescription) {
        graphAPI.current.addNode(node);
        return;
      }
      graphAPI.current.addNode({
        ...node,
        name: nodeDescription.name,
        types: nodeDescription.labels,
      });
    } catch (error) {
      console.error("Error in handleSearchSelection:", error);
      graphAPI.current.addNode(node);
    } finally {
      graphAPI.current.update();
      session?.close();
    }
  }, []);

  const handleFetchNodes = useCallback(async (query: string, properties: string[]): Promise<FetchNodesItem[]> => {
    if (!graphAPI.current) return [];

    try {
      const fetchNodesQuery = getFetchNodesQueryMQL(query, properties);
      fetchNodesSessionRef.current = driver.session();
      fetchNodesResultRef.current = fetchNodesSessionRef.current.run(fetchNodesQuery);
      const records = await fetchNodesResultRef.current.records();
      return records.map((record) => {
        const node = record.get("node");
        const graphNode: MDBGraphNode = {
          id: node.id,
          name: node.id,
          types: [], // TODO: implement this
        };
        for (const property of properties) {
          const value = record.get(`node.${property}`);
          if (value !== null) {
            return {
              category: property,
              node: graphNode,
              value,
            };
          }
        }
        return {
          category: "id",
          node: graphNode,
          value: node.id,
        };
      });
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
            const nodeDescription = await getNodeDescription(id, settings.searchProperties, session);
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
    getColorForLabel: (label: string) => string,
    settings: GraphSettings
  ) => {
    return (
      <MQLSideBarContent
        selectedNodeIds={selectedNodeIds}
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
        <MQLSettingsContent
          initialSettings={settings}
          onSave={onSave}
          close={close}
        />
      );
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
