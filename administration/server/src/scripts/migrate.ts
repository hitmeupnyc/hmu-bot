import { DatabaseService } from '../services/DatabaseService';

async function migrate() {
  console.log('🔄 Running database migration...');
  
  try {
    const dbService = DatabaseService.getInstance();
    dbService.initialize();
    console.log('✅ Database migration completed successfully');
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  migrate();
}