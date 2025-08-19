import type { NodeId } from "../types/graph";

export const getFetchNodesQuery = (query: string, properties: string[], limit: number = 50): string => {
  const orConditions = properties.map((prop) => `REGEX(?node.${prop},"(^|\\s)(${query}).*","i")`).join(" OR ");
  return `MATCH (?node)
WHERE ${orConditions}
RETURN *
LIMIT ${limit}`;
};

export const getDescribeQuery = (nodeId: NodeId): string => {
  return `DESCRIBE ${nodeId}`;
};
