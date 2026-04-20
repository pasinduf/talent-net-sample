import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { getDataSource } from '@talent-net/database';

export async function db(): Promise<DataSource> {
  return getDataSource();
}
