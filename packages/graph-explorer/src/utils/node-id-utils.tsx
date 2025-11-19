import {
  GraphNode,
  GraphAnon,
  GraphEdge,
  IRI,
  StringLang,
  StringDatatype,
  SimpleDate,
  Time,
  DateTime,
  Decimal,
} from "@millenniumdb/driver";
import type { MdbGraphObject } from "../types/graph";

export function getGraphValueId(value: MdbGraphObject): string {
  if (value instanceof IRI) return `iri:${value.iri}`;
  if (value instanceof StringLang) return `strlang:${value.str}@${value.lang}`;
  if (value instanceof StringDatatype) return `strdt:${value.str}^^${value.datatype.iri}`;
  if (value instanceof GraphNode) return `node:${value.id}`;
  if (value instanceof GraphAnon) return `anon:${value.id}`;
  if (value instanceof GraphEdge) return `edge:${value.id}`;
  if (value instanceof SimpleDate) return `date:${value.toString()}`;
  if (value instanceof Time) return `time:${value.toString()}`;
  if (value instanceof DateTime) return `datetime:${value.toString()}`;
  if (value instanceof Decimal) return `decimal:${value.str}`;

  if (typeof value === "string") return `str:${value}`;
  if (typeof value === "number") return `num:${value}`;
  if (typeof value === "boolean") return `bool:${value}`;
  if (value === null) return "null";
  if (value === undefined) return "undefined";

  throw new Error(`Unsupported value type: ${value}`);
}

export function formatGraphValue(value: MdbGraphObject, prefixes: Record<string, string> = {}): string {
  if (value instanceof IRI) {
    for (const [prefix, namespace] of Object.entries(prefixes)) {
      if (value.iri.startsWith(namespace)) {
        return `${prefix}:${value.iri.slice(namespace.length)}`;
      }
    }
    return `<${value.iri}>`;
  }
  if (value instanceof StringLang) return `"${value.str}"@${value.lang}`;
  if (value instanceof StringDatatype) return `"${value.str}"^^<${value.datatype.iri}>`;
  if (value instanceof GraphNode) return `${value.id}`;
  if (value instanceof GraphAnon) return `_:${value.id}`;
  if (value instanceof GraphEdge) return `_e${value.id}`;
  if (value instanceof SimpleDate) return value.toString();
  if (value instanceof Time) return value.toString();
  if (value instanceof DateTime) return value.toString();
  if (value instanceof Decimal) return value.str;

  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null) return "null";
  if (value === undefined) return "undefined";

  return String(value);
}
