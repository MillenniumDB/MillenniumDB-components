import type { GraphNode, Session } from "@millenniumdb/driver";

export type NameAndLabels = {
  labels: string[];
  name: string;
};

export const getNameAndLabels = async (
  session: Session,
  nodeId: string,
  properties: string[]
): Promise<NameAndLabels> => {
  const names = properties.map((prop) => `?node.${prop}`).join(",");
  const query = `LET ?node = ${nodeId} RETURN LABELS(?node) AS ?labels ${names.length ? "," + names : ""}`;
  const result = session.run(query);
  const records = await result.records();

  let name = nodeId;

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

export type LinkNameAndLabels = {
  otherId: string;
  edgeId: string;
  type: string;
  labels: string[];
  name: string;
};

export const getLinksNameAndLabels = async (
  session: Session,
  nodeId: string,
  properties: string[],
  outgoing: boolean
): Promise<LinkNameAndLabels[]> => {
  const names = properties.map((prop) => `?other.${prop}`).join(",");

  let query;
  if (outgoing) {
    query = `LET ?node = ${nodeId}
MATCH (?node)-[?edge :?type]->(?other)
RETURN ?other, ?edge, ?type, LABELS(?other) AS ?labels, ${names}`;
  } else {
    query = `LET ?node = ${nodeId}
MATCH (?other)-[?edge :?type]->(?node)
RETURN ?other, ?edge, ?type, LABELS(?other) AS ?labels, ${names}`;
  }

  const result = session.run(query);
  const records = await result.records();

  if (!records.length) {
    return [];
  }

  return records.map((record) => {
    const otherId = record.get("other").toString();
    const edgeId = record.get("edge").toString();
    const type = record.get("type").toString();
    const labels = record.get("labels")?.map((node: GraphNode) => node.toString()) ?? [];

    let name = otherId;
    for (const property of properties) {
      const value = record.get(`other.${property}`);
      if (value !== null) {
        name = value;
        break;
      }
    }

    return {
      otherId,
      edgeId,
      type,
      labels,
      name,
    };
  });
};

export type TextSearchItem = {
  category: string;
  id: string;
  name: string;
};

export const textSearchNodes = async (
  session: Session,
  text: string,
  properties: string[],
  limit: number
): Promise<TextSearchItem[]> => {
  let letStatement = "";
  let filterStatement = "WHERE ";
  for (const property of properties) {
    const rgxVar = `?hasMatch_${property}`;
    letStatement += `LET ${rgxVar} = REGEX(STR(?node.${property}),"(^|\\s)(${text}).*","i")\n`;
    filterStatement += `${rgxVar} OR `;
  }
  filterStatement += `REGEX(STR(?node), "^(${text}).*","i")`;

  const query = `MATCH (?node)
${letStatement}
${filterStatement}
RETURN *
LIMIT ${limit}`;

  const result = session.run(query);
  const records = await result.records();

  return records.map((record) => {
    const nodeId = record.get("node").toString();
    let name = nodeId;
    let category = "";
    for (const property of properties) {
      const hasMatch = record.get(`hasMatch_${property}`);
      if (hasMatch) {
        name = record.get(`node.${property}`);
        category = property;
        break;
      }
    }

    return {
      category: category.length === 0 ? "id" : category,
      id: nodeId,
      name,
    };
  });
};
