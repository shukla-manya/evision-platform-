import type { PutCommandInput, ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import type { Db } from 'mongodb';
import { evisionPartitionKeyFields } from '../../src/common/dynamo/collection-keys';
import { mongoFilterFromScanInput } from '../../src/common/dynamo/mongo-dynamo-query.util';

export async function evisionPut(db: Db, tableName: string, item: Record<string, unknown>): Promise<void> {
  const keys = evisionPartitionKeyFields(tableName);
  const filter = Object.fromEntries(keys.map((k) => [k, item[k]]));
  await db.collection(tableName).replaceOne(filter, { ...item } as Record<string, unknown>, { upsert: true });
}

export async function evisionScan(
  db: Db,
  input: Pick<ScanCommandInput, 'TableName' | 'FilterExpression' | 'ExpressionAttributeValues'>,
): Promise<{ Items?: Record<string, unknown>[] }> {
  const filter = mongoFilterFromScanInput(input);
  const docs = await db.collection(String(input.TableName)).find(filter).toArray();
  const Items = docs.map((d) => {
    const { _id, ...rest } = d as Record<string, unknown> & { _id?: unknown };
    void _id;
    return rest;
  });
  return { Items };
}

type E2eDocCommand = { input: PutCommandInput & ScanCommandInput };

/** Minimal DynamoDB document client used by HTTP E2E fixtures (Put + Scan only). */
export function createE2eDocClient(db: Db) {
  return {
    send: async (cmd: E2eDocCommand): Promise<{ Items?: Record<string, unknown>[] } | Record<string, never>> => {
      const input = cmd.input as PutCommandInput & ScanCommandInput;
      if (input.Item != null && typeof input.Item === 'object') {
        await evisionPut(db, String(input.TableName), input.Item as Record<string, unknown>);
        return {};
      }
      return evisionScan(db, input);
    },
  };
}
