import 'reflect-metadata';
import path from 'path';
import dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as entities from './entities';

// Resolve to monorepo root (.env lives there, not in packages/database)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const getDataSourceOptions = (): DataSourceOptions => {
  const databaseUrl = process.env.DATABASE_URL;

  return {
    type: 'postgres',
    url: databaseUrl,
    entities: Object.values(entities).filter((v) => typeof v === 'function'),
    migrations: [__dirname + '/migrations/*.{ts,js}'],
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
  };
};

export const AppDataSource = new DataSource(getDataSourceOptions());

/**
 * Lazy singleton for Lambda environments — reuses an existing connection
 * across warm invocations to avoid connection pool exhaustion.
 */
let connectionPromise: Promise<DataSource> | null = null;

export async function getDataSource(): Promise<DataSource> {
  if (AppDataSource.isInitialized) {
    return AppDataSource;
  }

  if (!connectionPromise) {
    connectionPromise = AppDataSource.initialize().catch((err) => {
      connectionPromise = null;
      throw err;
    });
  }

  return connectionPromise;
}
