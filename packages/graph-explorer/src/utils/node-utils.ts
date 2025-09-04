import { IRI, type Driver, type Session, Record as MDBRecord } from "@millenniumdb/driver";
import type { NodeId } from "../types/graph";
import { getDescribeQuery, getIriLabelsQuery, getIriNameQuery, getLiteralStatementsQuery } from "./queries";

export type NodeDescription = {
  id: NodeId;
  name: string;
  type: string;
  labels: string[];
  properties: Record<string, any>;
};

export type IRIDescription = {
  iri: string;
  name: string;
  type: string;
  labels: string[];
  literals: MDBRecord[];
};

export function valueToString(value: unknown): string | null {
  if (value == null) return null;

  switch (typeof value) {
    case "string": {
      const string = value.trim();
      return string === "" ? null : string;
    }
    case "number":
      return Number.isFinite(value) ? String(value) : null;
    case "bigint":
      return value.toString();
    case "boolean":
      return value ? "true" : "false";
    case "symbol":
      return value.description ? `Symbol(${value.description})` : "Symbol()";
    case "function":
      return value.name ? `[Function ${value.name}]` : "[Function]";
    case "object": {
      if (Array.isArray(value)) {
        if (value.length === 0) return null;
        try {
          return JSON.stringify(value);
        } catch {
          return null;
        }
      }

      if (value instanceof Date) {
        return isNaN(value.getTime()) ? null : value.toISOString();
      }

      if (value instanceof Map) {
        try {
          return JSON.stringify(Object.fromEntries(value));
        } catch {
          return null;
        }
      }
      if (value instanceof Set) {
        try {
          return JSON.stringify(Array.from(value));
        } catch {
          return null;
        }
      }

      try {
        const string = JSON.stringify(value);
        return string === "{}" ? null : string;
      } catch {
        return null;
      }
    }
    default:
      return null;
  }
}

export function getNodeName(id: string, properties: Record<string, unknown>, settingsProperties: string[]): string {
  for (const key of settingsProperties) {
    const raw = properties?.[key];
    const text = valueToString(raw);
    if (text) return text;
  }
  return id;
}

export async function getNodeDescription(
  id: NodeId,
  settingsProperties: string[],
  session: Session
): Promise<NodeDescription | null> {
  try {
    const query = getDescribeQuery(id);

    const result = session.run(query);
    const records = await result.records();

    if (records.length === 0) {
      return null;
    }

    const record = records[0];
    const nodeDescription = {
      id: record.get("object").id,
      name: getNodeName(record.get("object").id, record.get("properties"), settingsProperties),
      type: "Named Node",
      labels: record.get("labels"),
      properties: record.get("properties"),
    };

    return nodeDescription;
  } catch (err) {
    throw new Error(`Failed to get node description: ${err}`);
  }
}

export async function getIriDescription(
  iri: string,
  settingsProperties: string[],
  labelsPredicate: string,
  session: Session
): Promise<IRIDescription | null> {
  try {
    // Literal statements
    let query = getLiteralStatementsQuery(iri);

    let result = session.run(query);
    let records = await result.records();
    const literals = records;

    if (literals.length === 0) {
      return null;
    }

    // Node name
    query = getIriNameQuery(iri, settingsProperties);

    result = session.run(query);
    records = await result.records();

    const nameRecord = records[0] ?? null;
    const name = nameRecord ? nameRecord.get("o") : iri;

    // Node labels
    let labels;

    if (labelsPredicate) {
      query = getIriLabelsQuery(iri, labelsPredicate);

      result = session.run(query);
      records = await result.records();
      labels = records.map((record: any) => record.get("o").toString());
    }

    return {
      iri,
      name,
      type: "IRI",
      labels: labels ?? [],
      // TODO: Should entities be shown here too?
      literals,
    };
  } catch (err) {
    throw new Error(`Failed to get entity description: ${err}`);
  }
}
