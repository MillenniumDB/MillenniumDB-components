import { useCallback, useRef } from "react";
import { GraphExplorer, type GraphExplorerProps } from "./graph-explorer";
import { Driver, Result, Session } from "millenniumdb-driver";
import { useGraphAPI, type GraphAPI } from "./hooks/use-graph-api";
import type { NodeObject } from "react-force-graph-2d";
import type { MDBGraphData, MDBGraphNode } from "./types/graph";
import type { FetchNodesItem } from "./components/node-search/node-search";
import { getFetchNodesQuery } from "./utils/queries";
import { Button } from "@mantine/core";

export type MDBGraphExplorerProps = GraphExplorerProps & {
  driver: Driver;
  initialGraphData: MDBGraphData;
};

export const MDBGraphExplorer = ({ driver, initialGraphData, ...props }: MDBGraphExplorerProps) => {
  const graphAPI = useGraphAPI({ initialGraphData });

  const fetchNodesSessionRef = useRef<Session | null>(null);
  const fetchNodesResultRef = useRef<Result | null>(null);

  const handleNodeExpand = useCallback(async (node: NodeObject<MDBGraphNode>, event: MouseEvent, outgoing: boolean) => {
    try {
      const session = driver.session();

      if (outgoing) {
        const result = session.run(`MATCH (${node.id})-[?edgeId :?type]->(?target) RETURN *`);
        await result.variables(); // TODO: unused, but necessary due to a driver bug
        const records = await result.records();
        for (const record of records) {
          const edgeId = record.get("edgeId");
          const type = record.get("type");
          const target = record.get("target");
          graphAPI.addNode({ id: target.id, name: `${target}` });
          graphAPI.addLink({ id: edgeId, name: `${type}`, source: node.id, target: target.id });
        }
      } else {
        const result = session.run(`MATCH (?source)-[?edgeId :?type]->(${node.id}) RETURN *`);
        await result.variables(); // TODO: unused, but necessary due to a driver bug
        const records = await result.records();
        for (const record of records) {
          const source = record.get("source");
          const edgeId = record.get("edgeId");
          const type = record.get("type");
          graphAPI.addNode({ id: source.id, name: `${source}` });
          graphAPI.addLink({ id: edgeId, name: `${type}`, source: source.id, target: node.id });
        }
      }
      graphAPI.update();
    } catch {
    } finally {
    }
  }, []);

  const handleSearchSelection = useCallback((node: MDBGraphNode) => {
    graphAPI.addNode(node);
    graphAPI.update();
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

  return (
    <GraphExplorer
      {...props}
      graphAPI={graphAPI}
      searchProperties={["name", "nombre"]}
      onNodeExpand={handleNodeExpand}
      fetchNodes={handleFetchNodes}
      abortFetchNodes={handleAbortFetchNodes}
      onSearchSelection={handleSearchSelection}
    />
  );
};
