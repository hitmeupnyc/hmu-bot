import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function globalSetup() {
  console.log('🔧 Setting up test environment...');
  
  try {
    // Set up test database
    console.log('📁 Setting up test database...');
    const { stdout, stderr } = await execAsync('cd ../server && npm run db:setup-test');
    console.log(stdout);
    if (stderr) {
      console.warn('Setup warnings:', stderr);
    }
    
    console.log('✅ Test environment setup complete');
  } catch (error) {
    console.error('❌ Test environment setup failed:', error);
    throw error;
  }
}

export default globalSetup;