import { IRI, type Session } from "@millenniumdb/driver";

export const getPrefixedIri = (iri: string, prefixMap: Record<string, string>): string => {
  const iriName = iri.toString().slice(1, -1);
  for (const [prefix, namespace] of Object.entries(prefixMap)) {
    if (iriName.startsWith(namespace)) {
      return `${prefix}:${iriName.slice(namespace.length)}`;
    }
  }
  return iri;
}

export const getNameAndLabelsFromRecords = (
  iri: string,
  records: any[],
  namePredicates: string[],
  labelsPredicate: string,
  prefixes: Record<string, string> = {},
  varKeys: Partial<{ predicate: string; object: string }> = {}
): {  name: string; labels: string[] } => {
  const {
    predicate: predKey = "p",
    object: objKey = "o",
  } = varKeys;

  if (records.length === 0) {
    const name = getPrefixedIri(iri, prefixes)
    return { name, labels: [] };
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

  let name = iri;
  for (const predicate of namePredicates) {
    const value = firstByPredicate.get(predicate);
    if (value != null && value !== "") {
      name = value;
      break;
    }
  }
  name = getPrefixedIri(name, prefixes);
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
  labelsPredicate: string,
  prefixes: Record<string, string> = {}
): Promise<NameAndLabels> => {
  const query = `SELECT ?p ?o WHERE { ${iri} ?p ?o . }`;
  const result = session.run(query);
  const records = await result.records();

  const { name, labels } = getNameAndLabelsFromRecords(iri, records, namePredicates, labelsPredicate, prefixes);
  return { name, labels };
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
  labelsPredicate: string,
  prefixMap: Record<string, string> = {}
): Promise<IriDescription | null> => {
  const query = `SELECT ?p ?o WHERE { ${iri} ?p ?o . }`;
  const result = session.run(query);
  const records = await result.records();

  const literals = records.reduce((acc: Record<string, any>, record: any) => {
    const predicate = record.get("p").toString();
    // const prefixedPredicate 
    const object = record.get("o");
    if (object instanceof IRI) {
      return acc;
    }
    acc[predicate] = object.toString();
    return acc;
  }, {});

  const { name, labels } = getNameAndLabelsFromRecords(iri, records, namePredicates, labelsPredicate, prefixMap);
  return { iri, name, type: "IRI", labels, literals };
};

export type LinkAndNeighbor = {
  neighborId: string;
  edgeId: string;
  edgeName: string;
  neighborLabels: string[];
  neighborName: string;
};

export const getLinksAndNeighbors = async (
  session: Session,
  iri: string,
  namePredicates: string[],
  labelsPredicate: string,
  prefixes: Record<string, string> = {},
  outgoing: boolean,
): Promise<LinkAndNeighbor[]> => {
  // TODO: Handle blank nodes?
  let query;
  if (outgoing) {
    query = `
      SELECT ?predicate ?neighbor ?neighborPredicate ?neighborObject
      WHERE {
        ${iri} ?predicate ?neighbor .
        FILTER(isIRI(?neighbor))
        OPTIONAL {
          ?neighbor ?neighborPredicate ?neighborObject .
        }
      }
    `;
  } else {
    query = `
      SELECT ?predicate ?neighbor ?neighborPredicate ?neighborObject
      WHERE {
        ?neighbor ?predicate ${iri} .
        OPTIONAL {
          ?neighbor ?neighborPredicate ?neighborObject .
        }
      }
    `;
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
    const edgeName = getPrefixedIri(edgeIri, prefixes);

    let neighborName = getPrefixedIri(neighborId, prefixes);
    let neighborLabels: string[] = [];

    if (firstRecord.get("neighborObject") != null) {
      const { name, labels } = getNameAndLabelsFromRecords(
        neighborId,
        records,
        namePredicates,
        labelsPredicate,
        prefixes,
        { predicate: "neighborPredicate", object: "neighborObject" }
      );
      neighborName = name;
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

export const textSearchNodes = async (session: Session, text: string, searchPredicates: string[], limit: number = 50) => {
  const valuesStatement = `VALUES ?predicate { ${searchPredicates.join(" ")} }`;

  let query = `
    SELECT ?subject ?predicate ?object
    WHERE {
      {
        ${valuesStatement}
        ?subject ?predicate ?object .
        FILTER(REGEX(STR(?object), R"(^|\\s)(${text})", "i"))
      }
      UNION
      {
        {
          SELECT DISTINCT ?subject
          WHERE {
            ?subject ?p ?o .
            FILTER(REGEX(STR(?subject), R"(${text})", "i"))
          }
        }
        BIND("IRI" AS ?predicate)
        BIND(?subject AS ?object)
      }
    }
    LIMIT ${limit}
  `;

  const result = session.run(query);
  const records = await result.records();

  return records.map((record: any) => {
    const subjectId = record.get("subject").toString();
    const name = record.get("object").toString();
    const category = record.get("predicate").toString();

    return {
      category,
      id: subjectId,
      name,
    };
  });
};
