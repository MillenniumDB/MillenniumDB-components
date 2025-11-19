import type { GraphNode, Session } from "@millenniumdb/driver";
import type { GraphVisEdgeValue, GraphVisNodeValue } from "../types/graph";
import { formatGraphValue, getGraphValueId } from "./node-id-utils";

export type NameAndLabels = {
  labels: string[];
  name: string;
};

export const getNameAndLabels = async (
  session: Session,
  nodeValue: GraphVisNodeValue,
  properties: string[]
): Promise<NameAndLabels> => {
  console.log("Getting name and labels for:", nodeValue);
  const names = properties.map((prop) => `?node.${prop}`).join(", ");
  const query = `LET ?node = ?nodeValue RETURN LABELS(?node) AS ?labels${names.length ? ", " + names : ""}`;
  const result = session.run(query, { nodeValue });
  const records = await result.records();
  console.log("Records received:", records);

  let name = formatGraphValue(nodeValue);

  if (!records.length) {
    return {
      labels: [],
      name,
    };
  }

  const record = records[0];

  const labels = record.get("labels")?.map((node: GraphNode) => node.toString()) ?? [];

  for (const property of properties) {
    const value = record.get(`node.${property}`);
    if (value !== null) {
      name = value;
      break;
    }
  }

  return {
    labels,
    name,
  };
};

export type NodeDescription = {
  id: string;
  nodeValue: GraphVisNodeValue;
  name: string;
  type: string;
  labels: string[];
  properties: Record<string, unknown>;
};

export const getNodeDescription = async (
  session: Session,
  nodeValue: GraphVisNodeValue,
  nameProperties: string[]
): Promise<NodeDescription> => {
  const names = nameProperties.map((prop) => `?node.${prop}`).join(", ");
  const query = `
    LET ?node = ?nodeValue
    RETURN LABELS(?node) AS ?labels, PROPERTIES(?node) AS ?properties${names.length ? ", " + names : ""}
  `;
  const result = session.run(query, { nodeValue });
  const records = await result.records();

  let name = formatGraphValue(nodeValue);

  if (!records.length) {
    return {
      id: getGraphValueId(nodeValue),
      nodeValue,
      name,
      type: "Named Node",
      labels: [],
      properties: {},
    };
  }

  const record = records[0];

  const labels = record.get("labels")?.map((node: GraphNode) => node.toString()) ?? [];
  const properties = record.get("properties") ?? {};

  for (const property of nameProperties) {
    const value = record.get(`node.${property}`);
    if (value !== null) {
      name = value;
      break;
    }
  }

  return {
    id: getGraphValueId(nodeValue),
    nodeValue,
    name,
    type: "Named Node",
    labels,
    properties,
  };
};

export type LinkNameAndLabels = {
  otherId: string;
  otherValue: GraphVisNodeValue;
  edgeId: string;
  edgeValue: GraphVisEdgeValue;
  type: string;
  labels: string[];
  name: string;
};

export const getLinksNameAndLabels = async (
  session: Session,
  nodeValue: GraphVisNodeValue,
  properties: string[],
  outgoing: boolean
): Promise<LinkNameAndLabels[]> => {
  const names = properties.map((prop) => `?other.${prop}`).join(",");

  let query;
  if (outgoing) {
    query = `LET ?node = ?nodeValue
MATCH (?node)-[?edge :?type]->(?other)
RETURN ?other, ?edge, ?type, LABELS(?other) AS ?labels${names.length > 0 ? ", " + names : ""}`;
  } else {
    query = `LET ?node = ?nodeValue
MATCH (?other)-[?edge :?type]->(?node)
RETURN ?other, ?edge, ?type, LABELS(?other) AS ?labels${names.length > 0 ? ", " + names : ""}`;
  }

  const result = session.run(query, { nodeValue });
  const records = await result.records();

  if (!records.length) {
    return [];
  }

  return records.map((record) => {
    const otherId = getGraphValueId(record.get("other"));
    const otherValue = record.get("other") as GraphVisNodeValue;
    const edgeId = getGraphValueId(record.get("edge"));
    const edgeValue = record.get("edge") as GraphVisEdgeValue;
    const type = record.get("type").toString();
    const labels = record.get("labels")?.map((node: GraphNode) => node.toString()) ?? [];

    let name = formatGraphValue(otherValue);
    for (const property of properties) {
      const value = record.get(`other.${property}`);
      if (value !== null) {
        name = value;
        break;
      }
    }

    return {
      otherId,
      otherValue,
      edgeId,
      edgeValue,
      type,
      labels,
      name,
    };
  });
};

export type TextSearchItem = {
  category: string;
  nodeValue: GraphVisNodeValue;
  result: string | undefined;
};

export const textSearchNodes = async (
  session: Session,
  searchText: string,
  properties: string[],
  limit: number
): Promise<TextSearchItem[]> => {
  let letStatement = "";
  let filterStatement = "WHERE ";
  for (const property of properties) {
    const rgxVar = `?hasMatch_${property}`;
    letStatement += `LET ${rgxVar} = REGEX(STR(?node.${property}),?propertiesRegex,"i")\n`;
    filterStatement += `${rgxVar} OR `;
  }
  filterStatement += `REGEX(STR(?node),?nodeIdRegex,"i")`;

  const query = `
    MATCH (?node)
    ${letStatement}
    ${filterStatement}
    RETURN *
    LIMIT ${limit}
  `;

  const propertiesRegex = `(^|\\s)(${searchText}).*`;
  const nodeIdRegex = `^(${searchText}).*`;

  const result = session.run(query, { propertiesRegex, nodeIdRegex });
  const records = await result.records();

  return records.map((record) => {
    const nodeValue = record.get("node");
    let result;
    let category;
    for (const property of properties) {
      const hasMatch = record.get(`hasMatch_${property}`);
      if (hasMatch) {
        result = record.get(`node.${property}`);
        category = property;
        break;
      }
    }

    return {
      category: category === undefined ? "Node id" : category,
      nodeValue,
      result,
    };
  });
};
