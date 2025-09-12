import type { Driver, Result, Session, Record as MDBRecord } from "@millenniumdb/driver";
import type { LinkId, MDBGraphData, MDBGraphNode, NodeId } from "./types/graph";
import { useCallback, useRef, type CSSProperties } from "react";
import type { GraphSettings } from "./components/settings/settings";
import type { GraphColorConfig } from "./hooks/use-graph-colors";
import { GraphExplorer } from "./graph-explorer";
import type { GraphAPI } from "./hooks/use-graph-api";
import type { NodeObject } from "react-force-graph-2d";
import { getFetchNodesQueryRDF } from "./utils/queries";
import type { FetchNodesItem } from "./components/node-search/node-search";
import { SPARQLSideBarContent } from "./components/side-bar/sparql-sidebar-content";
import { getIriDescription } from "./utils/node-utils";
import { SPARQLSettingsContent } from "./components/settings/sparql-settings-content";

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

            const iriDescription = await getIriDescription(object.toString(), settings, session);
            if (iriDescription) {
              graphAPI.current.addNode({
                id: `${object}`,
                name: iriDescription.name,
                types: iriDescription.labels,
              });
            } else {
              graphAPI.current.addNode({ id: `${object}`, name: `${object}` });
            }

            const id = `${node.id}-${predicate}-${object}`;
            graphAPI.current.addLink({ id, name: `${predicate}`, source: `${node.id}`, target: `${object}` });
          }
        } else {
          const result = session.run(`SELECT * WHERE { ?subject ?predicate ${node.id} . }`);
          const records = await result.records();
          for (const record of records) {
            const subject = record.get("subject");
            const predicate = record.get("predicate");

            const iriDescription = await getIriDescription(subject.toString(), settings, session);
            if (iriDescription) {
              graphAPI.current.addNode({
                id: `${subject}`,
                name: iriDescription.name,
                types: iriDescription.labels,
              });
            } else {
              graphAPI.current.addNode({ id: `${subject}`, name: `${subject}` });
            }

            const id = `${subject}-${predicate}-${node.id}`;
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

  const handleFetchNodes = useCallback(async (query: string, settings: GraphSettings): Promise<FetchNodesItem[]> => {
    // TODO: Handle blank nodes?
    if (!graphAPI.current) return [];

    const properties = settings.searchProperties ?? [];
    try {
      const fetchNodesQuery = getFetchNodesQueryRDF(query, properties);
      fetchNodesSessionRef.current = driver.session();
      fetchNodesResultRef.current = fetchNodesSessionRef.current.run(fetchNodesQuery);
      const records = await fetchNodesResultRef.current.records();
      return records.map((record: MDBRecord) => {
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

  const handleSearchSelection = useCallback(async (node: MDBGraphNode, settings: GraphSettings) => {
    if (!graphAPI.current) return;

    let session;

    try {
      session = driver.session();
      const nodeDescription = await getIriDescription(node.id, settings, session);
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
            const iriDescription = await getIriDescription(id, settings, session);
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
