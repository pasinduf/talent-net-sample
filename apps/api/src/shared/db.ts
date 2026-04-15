import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { getDataSource } from '@talent-net/database';

/**
 * Returns an initialized TypeORM DataSource.
 * Reuses the singleton connection on warm Lambda invocations.
 */
export async function db(): Promise<DataSource> {
  return getDataSource();
}
