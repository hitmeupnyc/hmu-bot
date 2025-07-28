import { DatabaseService } from '../services/DatabaseService';

async function migrate() {
  console.log('🔄 Running database migration...');
  
  try {
    const dbService = DatabaseService.getInstance();
    await dbService.initialize();
    console.log('✅ Database migration completed successfully');
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  } finally {
    await DatabaseService.getInstance().close();
  }
}

if (require.main === module) {
  migrate();
}