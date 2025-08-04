import { FileMigrationProvider, Migrator } from 'kysely';
import { promises as fs } from 'fs';
import path from 'path';
import type { DB } from '../types/database';
import { Kysely } from 'kysely';

export class MigrationProvider {
  private migrator: Migrator;

  constructor(db: Kysely<DB>) {
    this.migrator = new Migrator({
      db,
      provider: new FileMigrationProvider({
        fs,
        path,
        migrationFolder: path.join(__dirname, '../migrations'),
      }),
    });
  }

  async migrateToLatest(): Promise<void> {
    const { error, results } = await this.migrator.migrateToLatest();

    results?.forEach((it) => {
      if (it.status === 'Success') {
        console.log(`✅ Migration "${it.migrationName}" was executed successfully`);
      } else if (it.status === 'Error') {
        console.error(`❌ Failed to execute migration "${it.migrationName}"`);
      }
    });

    if (error) {
      console.error('❌ Failed to migrate:', error);
      throw error;
    }

    if (!results || results.length === 0) {
      console.log('✅ Database is already up to date');
    }
  }

  async migrateDown(): Promise<void> {
    const { error, results } = await this.migrator.migrateDown();

    results?.forEach((it) => {
      if (it.status === 'Success') {
        console.log(`✅ Migration "${it.migrationName}" was rolled back successfully`);
      } else if (it.status === 'Error') {
        console.error(`❌ Failed to rollback migration "${it.migrationName}"`);
      }
    });

    if (error) {
      console.error('❌ Failed to rollback migration:', error);
      throw error;
    }
  }

  async getMigrationStatus() {
    const migrations = await this.migrator.getMigrations();
    return migrations;
  }
}
