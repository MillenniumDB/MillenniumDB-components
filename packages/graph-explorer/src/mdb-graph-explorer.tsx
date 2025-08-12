import { useCallback, useRef } from "react";
import { GraphExplorer, type GraphExplorerProps } from "./graph-explorer";
import { Driver, Result, Session } from "millenniumdb-driver";
import type { GraphAPI } from "./hooks/use-graph-api";
import type { NodeObject } from "react-force-graph-2d";
import type { MDBGraphNode } from "./types/graph";
import type { FetchNodesItem } from "./components/node-search/node-search";
import { getFetchNodesQuery } from "./utils/queries";

export type MDBGraphExplorerProps = GraphExplorerProps & {
  driver: Driver;
};

export const MDBGraphExplorer = ({ driver, ...props }: MDBGraphExplorerProps) => {
  const graphAPI = useRef<GraphAPI | null>(null);

  const fetchNodesSessionRef = useRef<Session | null>(null);
  const fetchNodesResultRef = useRef<Result | null>(null);

  const handleNodeExpand = useCallback(async (node: NodeObject<MDBGraphNode>, event: MouseEvent) => {
    try {
      if (!graphAPI.current) return;

      const session = driver.session();
      const result = session.run(`MATCH (${node.id})-[?edgeId :?type]->(?target) RETURN *`);
      await result.variables(); // TODO: unused, but necessary due to a driver bug
      const records = await result.records();
      for (const record of records) {
        const edgeId = record.get("edgeId");
        const type = record.get("type");
        const target = record.get("target");
        graphAPI.current.addNode({ id: target.id, name: `${target}` });
        graphAPI.current.addLink({ id: edgeId, name: `${type}`, source: node.id, target: target.id });
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
    try {
      const fetchNodesQuery = getFetchNodesQuery(query, properties);
      fetchNodesSessionRef.current = driver.session();
      fetchNodesResultRef.current = fetchNodesSessionRef.current.run(fetchNodesQuery);
      await fetchNodesResultRef.current.variables(); // TODO: unused, but necessary due to a driver bug
      const records = await fetchNodesResultRef.current.records();
      return records.map((record) => {
        const node = record.get("node");
        const graphNode: MDBGraphNode = {
          id: node.id,
          name: node.id,
          types: [], // TODO: implement this
        };
        for (let i = 0; i < record.length; ++i) {
          const value = record.get(1 + i);
          if (record.get(1 + i) !== null) {
            return {
              category: properties[i],
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

  return (
    <GraphExplorer
      ref={graphAPI}
      {...props}
      onNodeExpand={handleNodeExpand}
      fetchNodes={handleFetchNodes}
      abortFetchNodes={handleAbortFetchNodes}
      onSearchSelection={handleSearchSelection}
    />
  );
};
