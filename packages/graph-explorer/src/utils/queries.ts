import type { NodeId } from "../types/graph";

export const getFetchNodesQueryMQL = (query: string, properties: string[], limit: number = 50): string => {
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

export const getFetchNodesQueryRDF = (query: string, predicate: string[], limit: number = 50): string => {
  // TODO: Fix SPARQL escaping
  const orConditions = predicate
    .map((pred) => `(?predicate = ${pred} && REGEX(?str, "(^|\\\\s)(${query}).*", "i"))`)
    .join("||");
  const filterStatement = orConditions.length > 0 ? `FILTER (${orConditions})` : "";

  return `SELECT ?subject ?predicate ?object
  WHERE {
    ?subject ?predicate ?object .
    BIND(STR(?object) AS ?str) .
    ${filterStatement} .
    }
    LIMIT ${limit}`;
};

export const getLiteralStatementsQuery = (iri: string) => {
  return `SELECT * WHERE { ${iri} ?p ?o . FILTER(!ISIRI(?o)) }`;
};
