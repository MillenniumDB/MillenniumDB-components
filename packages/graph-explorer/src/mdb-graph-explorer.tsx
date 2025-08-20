import { forwardRef, useCallback, useImperativeHandle, useRef, type CSSProperties } from "react";
import { GraphExplorer } from "./graph-explorer";
import { Driver, Result, Session } from "@millenniumdb/driver";
import { useGraphAPI, type GraphAPI } from "./hooks/use-graph-api";
import type { NodeObject } from "react-force-graph-2d";
import type { MDBGraphData, MDBGraphNode, NodeId } from "./types/graph";
import type { FetchNodesItem } from "./components/node-search/node-search";
import { getFetchNodesQuery } from "./utils/queries";
import type { GraphColorConfig } from "./constants/colors";
import { MDBSideBarContent } from "./components/side-bar/mdb-side-bar-content";
import type { GraphSettings } from "./components/settings/settings";

export type MDBGraphExplorerProps = {
  driver: Driver;
  initialGraphData?: MDBGraphData;
  initialSettings?: GraphSettings;
  graphAPI: GraphAPI;
  style?: CSSProperties;
  className?: string;
  graphColors?: Partial<GraphColorConfig>;
};

export const MDBGraphExplorer = ({ driver, initialGraphData, ...props }: MDBGraphExplorerProps) => {
  const graphAPI = useRef<GraphAPI>(null);

  const fetchNodesSessionRef = useRef<Session | null>(null);
  const fetchNodesResultRef = useRef<Result | null>(null);

  const handleNodeExpand = useCallback(async (node: NodeObject<MDBGraphNode>, event: MouseEvent, outgoing: boolean) => {
    if (!graphAPI.current) return;

    try {
      const session = driver.session();

      if (outgoing) {
        const result = session.run(`MATCH (${node.id})-[?edgeId :?type]->(?target) RETURN *`);
        const records = await result.records();
        for (const record of records) {
          const edgeId = record.get("edgeId");
          const type = record.get("type");
          const target = record.get("target");
          graphAPI.current.addNode({ id: target.id, name: `${target}` });
          graphAPI.current.addLink({ id: edgeId, name: `${type}`, source: node.id, target: target.id });
        }
      } else {
        const result = session.run(`MATCH (?source)-[?edgeId :?type]->(${node.id}) RETURN *`);
        const records = await result.records();
        for (const record of records) {
          const source = record.get("source");
          const edgeId = record.get("edgeId");
          const type = record.get("type");
          graphAPI.current.addNode({ id: source.id, name: `${source}` });
          graphAPI.current.addLink({ id: edgeId, name: `${type}`, source: source.id, target: node.id });
        }
      }
      graphAPI.current.update();
    } catch {
    } finally {
    }
  }, []);

  const handleSearchSelection = useCallback((node: MDBGraphNode) => {
    if (!graphAPI.current) return;

    graphAPI.current.addNode(node);
    graphAPI.current.update();
  }, []);

  const handleFetchNodes = useCallback(async (query: string, properties: string[]): Promise<FetchNodesItem[]> => {
    if (!graphAPI.current) return [];

    try {
      const fetchNodesQuery = getFetchNodesQuery(query, properties);
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

  const handleRenderSidebarContent = (selectedNodeIds: Set<NodeId>) => {
    return <MDBSideBarContent selectedNodeIds={selectedNodeIds} driver={driver} graphAPI={graphAPI} />;
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
      renderSideBarContent={handleRenderSidebarContent}
    />
  );
};
