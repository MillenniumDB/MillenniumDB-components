import type { Driver, Result, Session } from "@millenniumdb/driver";
import type { MDBGraphData, MDBGraphNode, NodeId } from "./types/graph";
import { useCallback, useRef, type CSSProperties } from "react";
import type { GraphSettings } from "./components/settings/settings";
import type { GraphColorConfig } from "./hooks/use-graph-colors";
import { GraphExplorer } from "./graph-explorer";
import type { GraphAPI } from "./hooks/use-graph-api";
import type { NodeObject } from "react-force-graph-2d";
import { getFetchNodesQueryRDF } from "./utils/queries";
import type { FetchNodesItem } from "./components/node-search/node-search";
import { Box } from "@mantine/core";
import { SPARQLSideBarContent } from "./components/side-bar/sparql-sidebar-content";

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
      // TODO: Handle blank nodes?
      if (!graphAPI.current) return;
      let session;

      try {
        session = driver.session();

        if (outgoing) {
          const result = session.run(`SELECT * WHERE { ${node.id} ?predicate ?object . FILTER(ISIRI(?object)) . }`);
          const records = await result.records();
          for (const record of records) {
            const predicate = record.get("predicate");
            const object = record.get("object");

            const id = `${node.id}-${predicate}-${object}`;
            graphAPI.current.addNode({ id: `${object}`, name: `${object}` });
            graphAPI.current.addLink({ id, name: `${predicate}`, source: `${node.id}`, target: `${object}` });
          }
        } else {
          const result = session.run(`SELECT * WHERE { ?subject ?predicate ${node.id} . }`);
          const records = await result.records();
          for (const record of records) {
            const subject = record.get("subject");
            const predicate = record.get("predicate");

            const id = `${subject}-${predicate}-${node.id}`;
            graphAPI.current.addNode({ id: `${subject}`, name: `${subject}` });
            graphAPI.current.addLink({ id, name: `${predicate}`, source: `${subject}`, target: `${node.id}` });
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

  const handleFetchNodes = useCallback(async (query: string, properties: string[]): Promise<FetchNodesItem[]> => {
    // TODO: Handle blank nodes?
    if (!graphAPI.current) return [];

    try {
      const fetchNodesQuery = getFetchNodesQueryRDF(query, properties);
      fetchNodesSessionRef.current = driver.session();
      fetchNodesResultRef.current = fetchNodesSessionRef.current.run(fetchNodesQuery);
      const records = await fetchNodesResultRef.current.records();
      return records.map((record) => {
        const subject = record.get("subject");
        const object = record.get("object");
        const graphNode: MDBGraphNode = {
          id: `${subject}`,
          name: `${subject}`,
          types: [], // TODO: implement this
        };
        return {
          category: "id",
          node: graphNode,
          value: `${object}`,
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

  const handleSearchSelection = useCallback(async (node: MDBGraphNode, properties: string[]) => {
    if (!graphAPI.current) return;

    graphAPI.current.addNode(node);
    graphAPI.current.update();
  }, []);

  const handleRenderSidebarContent = (
    selectedNodeIds: Set<NodeId>,
    getColorForLabel: (label: string) => string,
    settings: GraphSettings
  ) => {
    return (
      <SPARQLSideBarContent
        selectedNodeIds={selectedNodeIds}
        getColorForLabel={getColorForLabel}
        settings={settings}
        graphAPI={graphAPI}
        driver={driver}
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
      renderSideBarContent={handleRenderSidebarContent}
      // onSettingsChange={handleSettingsChange}
    />
  );
};
