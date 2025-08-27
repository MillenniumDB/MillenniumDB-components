import type { NodeId } from "../types/graph";

export const getFetchNodesQuery = (query: string, properties: string[], limit: number = 50): string => {
  const orConditions = properties.map((prop) => `REGEX(?node.${prop},"(^|\\s)(${query}).*","i")`).join(" OR ");
  const whereStatement = orConditions.length > 0 ? `WHERE ${orConditions}` : "";
  return `MATCH (?node)
${whereStatement}
RETURN *
LIMIT ${limit}`;
};

export const getDescribeQuery = (nodeId: NodeId): string => {
  return `DESCRIBE ${nodeId}`;
};
