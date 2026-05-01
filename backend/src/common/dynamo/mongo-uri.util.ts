/** Local default when no valid Mongo connection string is in env. */
export const DEFAULT_MONGO_URI = 'mongodb://127.0.0.1:27017/evision';

function isMongoScheme(uri: string): boolean {
  return uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://');
}

/** Prefer MONGODB_URI; only use DATABASE_URL if it looks like Mongo (avoids postgres:// etc.). */
export function resolveMongoConnectionString(
  mongodbUri: string | undefined,
  databaseUrl: string | undefined,
): string {
  for (const raw of [mongodbUri, databaseUrl]) {
    const u = raw?.trim();
    if (u && isMongoScheme(u)) return u;
  }
  return DEFAULT_MONGO_URI;
}

export function resolveMongoConnectionStringFromProcessEnv(): string {
  return resolveMongoConnectionString(process.env.MONGODB_URI, process.env.DATABASE_URL);
}
