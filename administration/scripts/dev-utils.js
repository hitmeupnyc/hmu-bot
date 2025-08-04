#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function findProcessOnPort(port) {
  try {
    const result = execSync(`lsof -ti:${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    return result.trim().split('\n').filter(pid => pid);
  } catch (e) {
    return [];
  }
}

function killPort(port) {
  const pids = findProcessOnPort(port);
  if (pids.length > 0) {
    try {
      execSync(`kill -9 ${pids.join(' ')}`);
      log('green', `✅ Killed processes on port ${port}: ${pids.join(', ')}`);
    } catch (e) {
      log('red', `❌ Failed to kill processes on port ${port}`);
    }
  } else {
    log('blue', `ℹ️  Port ${port} is already free`);
  }
}

function checkHealth() {
  try {
    const result = execSync('curl -s http://localhost:3000/health', { encoding: 'utf8' });
    const health = JSON.parse(result);
    log('green', '✅ Server is healthy');
    console.log(JSON.stringify(health, null, 2));
  } catch (e) {
    log('red', '❌ Server is not responding');
    log('yellow', '💡 Try: npm run dev:server');
  }
}

function resetDatabase() {
  const dbPath = path.join(__dirname, '..', 'server', 'data');
  try {
    // Remove database files
    if (fs.existsSync(path.join(dbPath, 'club.db'))) {
      fs.unlinkSync(path.join(dbPath, 'club.db'));
    }
    if (fs.existsSync(path.join(dbPath, 'club.db-wal'))) {
      fs.unlinkSync(path.join(dbPath, 'club.db-wal'));
    }
    if (fs.existsSync(path.join(dbPath, 'club.db-shm'))) {
      fs.unlinkSync(path.join(dbPath, 'club.db-shm'));
    }
    
    log('green', '✅ Database files removed');
    
    // Run migrations and seeds
    execSync('npm run setup:db', { stdio: 'inherit' });
    log('green', '✅ Database reset complete');
  } catch (e) {
    log('red', '❌ Failed to reset database');
    console.error(e.message);
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'kill-ports':
    log('blue', '🔌 Checking ports...');
    killPort(3000);
    killPort(5173);
    break;
    
  case 'health':
    log('blue', '🏥 Checking server health...');
    checkHealth();
    break;
    
  case 'reset-db':
    log('blue', '🗄️  Resetting database...');
    resetDatabase();
    break;
    
  case 'status':
    log('blue', '📊 Development status:');
    console.log('');
    
    // Check ports
    const serverPids = findProcessOnPort(3000);
    const clientPids = findProcessOnPort(5173);
    
    if (serverPids.length > 0) {
      log('green', `✅ Server running on port 3000 (PID: ${serverPids.join(', ')})`);
    } else {
      log('red', '❌ Server not running on port 3000');
    }
    
    if (clientPids.length > 0) {
      log('green', `✅ Client running on port 5173 (PID: ${clientPids.join(', ')})`);
    } else {
      log('red', '❌ Client not running on port 5173');
    }
    
    console.log('');
    checkHealth();
    break;
    
  default:
    log('blue', '🛠️  Available commands:');
    console.log('  npm run dev:kill-ports  - Kill processes on ports 3000/5173');
    console.log('  npm run dev:health       - Check server health');
    console.log('  npm run dev:reset-db     - Reset database with fresh data');
    console.log('  npm run dev:status       - Show development status');
}

module.exports = { killPort, checkHealth, resetDatabase };