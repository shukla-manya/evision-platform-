/**
 * Translates the Dynamo-style query/scan shapes used across the codebase into MongoDB filters.
 * IndexName is ignored — Mongo uses the same documents and field paths as former GSIs.
 */

export type DynamoStyleValues = Record<string, unknown>;
export type DynamoStyleNames = Record<string, string>;

export type DynamoLikeQueryInput = {
  TableName: string;
  IndexName?: string;
  KeyConditionExpression?: string;
  FilterExpression?: string;
  ExpressionAttributeNames?: DynamoStyleNames;
  ExpressionAttributeValues?: DynamoStyleValues;
  Limit?: number;
  ExclusiveStartKey?: Record<string, unknown>;
  ProjectionExpression?: string;
  ScanIndexForward?: boolean;
};

export type DynamoLikeScanInput = {
  TableName: string;
  FilterExpression?: string;
  ExpressionAttributeNames?: DynamoStyleNames;
  ExpressionAttributeValues?: DynamoStyleValues;
  Limit?: number;
  ExclusiveStartKey?: Record<string, unknown>;
  ProjectionExpression?: string;
};

function resolveAttr(token: string, names: DynamoStyleNames): string {
  return token.startsWith('#') ? names[token] ?? token.slice(1) : token;
}

/** Parse a single condition into a Mongo fragment (may be compound $and). */
function clauseToMongo(
  clause: string,
  names: DynamoStyleNames,
  values: DynamoStyleValues,
): Record<string, unknown> | null {
  const c = clause.trim();
  if (!c) return null;

  const notExists = /^attribute_not_exists\s*\(\s*([a-zA-Z0-9_]+)\s*\)$/i.exec(c);
  if (notExists) {
    return { [notExists[1]]: { $exists: false } };
  }

  const eq = /^([#a-zA-Z0-9_]+)\s*=\s*(:[a-zA-Z0-9_]+)$/.exec(c);
  if (eq) {
    const field = resolveAttr(eq[1], names);
    const v = values[eq[2]];
    return { [field]: v };
  }

  return null;
}

function expressionToFilter(
  expr: string | undefined,
  names: DynamoStyleNames,
  values: DynamoStyleValues,
): Record<string, unknown> {
  if (!expr?.trim()) return {};
  const parts = expr.split(/\s+AND\s+/i).map((p) => p.trim()).filter(Boolean);
  const fragments: Record<string, unknown>[] = [];
  for (const p of parts) {
    const m = clauseToMongo(p, names, values);
    if (m) fragments.push(m);
  }
  if (!fragments.length) return {};
  if (fragments.length === 1) return fragments[0];
  return { $and: fragments };
}

export function mongoFilterFromQueryInput(input: DynamoLikeQueryInput): Record<string, unknown> {
  const names = input.ExpressionAttributeNames ?? {};
  const values = input.ExpressionAttributeValues ?? {};
  const kc = expressionToFilter(input.KeyConditionExpression, names, values);
  const fe = expressionToFilter(input.FilterExpression, names, values);
  if (!Object.keys(kc).length && !Object.keys(fe).length) return {};
  if (Object.keys(kc).length && !Object.keys(fe).length) return kc;
  if (!Object.keys(kc).length && Object.keys(fe).length) return fe;
  return { $and: [kc, fe] };
}

export function mongoFilterFromScanInput(input: DynamoLikeScanInput): Record<string, unknown> {
  const names = input.ExpressionAttributeNames ?? {};
  const values = input.ExpressionAttributeValues ?? {};
  return expressionToFilter(input.FilterExpression, names, values);
}

export function mongoProjectionFromExpression(expr: string | undefined): Record<string, 0 | 1> | undefined {
  if (!expr?.trim()) return undefined;
  const o: Record<string, 0 | 1> = { _id: 0 };
  for (const raw of expr.split(',')) {
    const name = raw.trim().replace(/^#/, '').split(/\s+/)[0];
    if (name) o[name] = 1;
  }
  return o;
}
