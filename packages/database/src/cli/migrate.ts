import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

import { AppDataSource } from '../data-source';

const command = process.argv[2];

async function main() {
  await AppDataSource.initialize();

  switch (command) {
    case 'run':
      console.log('Running pending migrations…');
      const ran = await AppDataSource.runMigrations({ transaction: 'all' });
      console.log(`Ran ${ran.length} migration(s):`, ran.map((m) => m.name));
      break;

    case 'revert':
      console.log('Reverting last migration…');
      await AppDataSource.undoLastMigration({ transaction: 'all' });
      console.log('Reverted.');
      break;

    case 'generate':
      console.log('Use typeorm CLI for generating migrations: npx typeorm migration:generate');
      break;

    default:
      console.error('Unknown command. Use: run | revert | generate');
      process.exit(1);
  }

  await AppDataSource.destroy();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
