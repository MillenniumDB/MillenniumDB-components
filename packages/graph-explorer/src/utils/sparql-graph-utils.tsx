import { IRI, type Session } from "@millenniumdb/driver";
import { getFetchNodesQueryRDF } from "./queries";

export const getNameAndLabelsFromRecords = (
  records: any[],
  namePredicates: string[],
  labelsPredicate: string,
  varKeys: Partial<{ predicate: string; object: string }> = {}
): {  name: string | null; labels: string[] } => {
  const {
    predicate: predKey = "p",
    object: objKey = "o",
  } = varKeys;

  if (records.length === 0) {
    return { name: null, labels: [] };
  }

  const firstByPredicate = new Map<string, string>();
  const labels: string[] = [];

  for (const record of records) {
    const predStr = record.get(predKey).toString();
    const objStr = record.get(objKey).toString();

    if (!firstByPredicate.has(predStr)) {
      firstByPredicate.set(predStr, objStr);
    }
    if (predStr === labelsPredicate) {
      labels.push(objStr);
    }
  }

  let name = null;
  for (const predicate of namePredicates) {
    const value = firstByPredicate.get(predicate);
    if (value != null && value !== "") {
      name = value;
      break;
    }
  }
  return { name, labels };
};

export type NameAndLabels = {
  name: string;
  labels: string[];
};

export const getNameAndLabels = async (
  session: Session,
  iri: string,
  namePredicates: string[],
  labelsPredicate: string
): Promise<NameAndLabels> => {
  const query = `SELECT ?p ?o WHERE { ${iri} ?p ?o . }`;
  const result = session.run(query);
  const records = await result.records();

  const { name, labels } = getNameAndLabelsFromRecords(records, namePredicates, labelsPredicate);
  return { name: name ?? iri, labels };
};

export type LinkAndNeighbor = {
  neighborId: string;
  edgeId: string;
  edgeName: string;
  neighborLabels: string[];
  neighborName: string;
};

export type IriDescription = {
  iri: string;
  name: string;
  type: string;
  labels: string[];
  literals: Record<string, any>;
};

export const getIriDescription = async (
  session: Session,
  iri: string,
  namePredicates: string[],
  labelsPredicate: string
): Promise<IriDescription | null> => {
  const query = `SELECT ?p ?o WHERE { ${iri} ?p ?o . }`;
  const result = session.run(query);
  const records = await result.records();

  const literals = records.reduce((acc: Record<string, any>, record: any) => {
    const predicate = record.get("p").toString();
    const object = record.get("o");
    if (object instanceof IRI) {
      return acc;
    }
    acc[predicate] = object.toString();
    return acc;
  }, {});

  const { name, labels } = getNameAndLabelsFromRecords(records, namePredicates, labelsPredicate);
  return { iri, name: name ?? iri, type: "IRI", labels, literals };
};

export const getLinksAndNeighbors = async (
  session: Session,
  iri: string,
  namePredicates: string[],
  labelsPredicate: string,
  outgoing: boolean,
): Promise<LinkAndNeighbor[]> => {
  // TODO: Handle blank nodes?
  let query;
  if (outgoing) {
    query = `SELECT ?predicate ?neighbor ?neighborPredicate ?neighborObject
WHERE {
  ${iri} ?predicate ?neighbor .
  FILTER(isIRI(?neighbor))
  OPTIONAL {
    ?neighbor ?neighborPredicate ?neighborObject .
  }
}`;
  } else {
    query = `SELECT ?predicate ?neighbor ?neighborPredicate ?neighborObject
WHERE {
  ?neighbor ?predicate ${iri} .
  OPTIONAL {
    ?neighbor ?neighborPredicate ?neighborObject .
  }
}`;
  }

  const result = session.run(query);
  const records = await result.records();

  const byNeighbor = new Map<string, any[]>();
  for (const record of records) {
    const neighbor = record.get("neighbor").toString();
    if (!byNeighbor.has(neighbor)){
      byNeighbor.set(neighbor, []);
    }
    byNeighbor.get(neighbor)!.push(record);
  }

  const linksAndNeighbors: LinkAndNeighbor[] = [];
  for (const [neighborId, records] of byNeighbor.entries()) {
    const firstRecord = records[0];

    const edgeIri = firstRecord.get("predicate").toString();
    const edgeId = `${outgoing ? iri : neighborId}-${edgeIri}-${outgoing ? neighborId : iri}`;
    const edgeName = edgeIri;

    let neighborName = neighborId;
    let neighborLabels: string[] = [];

    if (firstRecord.get("neighborObject") != null) {
      const { name, labels } = getNameAndLabelsFromRecords(
        records,
        namePredicates,
        labelsPredicate,
        { predicate: "neighborPredicate", object: "neighborObject" }
      );
      neighborName = name ?? neighborId;
      neighborLabels = labels;
    }

    linksAndNeighbors.push({
      neighborId,
      edgeId,
      edgeName,
      neighborName,
      neighborLabels,
    });
  }

  return linksAndNeighbors;
};

export type TextSearchItem = {
  category: string;
  id: string;
  name: string;
};

export const textSearchNodes = async (session: Session, text: string, predicates: string[], limit: number = 50) => {
  // TODO: Include subject regex search by IRI
  let bindStatement = "";
  let filterStatement = "FILTER(";

  for (let i = 0; i < predicates.length; ++i) {
    const rgxVar = `?hasMatch_${i}`;
    bindStatement += `BIND(REGEX(STR(?object), R"(^|\\s)(${text})","i") AS ${rgxVar})\n`;
    filterStatement += `(${rgxVar} && ?predicate = ${predicates[i]})`;
    if (i === predicates.length - 1) {
      filterStatement += `)`;
    } else {
      filterStatement += ` || `;
    }
  }
  // filterStatement += `REGEX(STR(?subject), R"(${text})", "i"))`;

  let query = `SELECT *
WHERE {
  ?subject ?predicate ?object .
  ${bindStatement} .
  ${filterStatement} .
}
LIMIT ${limit}`;

  console.log(query);

  const result = session.run(query);

  const records = await result.records();

  return records.map((record: any) => {
    const subjectId = record.get("subject").toString();
    let name = subjectId;
    let category = "";
    for (let i = 0; i < predicates.length; ++i) {
      const hasMatch = record.get(`hasMatch_${i}`);
      if (hasMatch) {
        name = record.get(`object`); // should be string already
        category = predicates[i];
        break;
      }
    }

    return {
      category: category.length === 0 ? "id" : category,
      id: subjectId,
      name,
    };
  });
};
