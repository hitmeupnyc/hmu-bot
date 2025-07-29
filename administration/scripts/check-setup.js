#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '..', 'server', '.env');
const DB_PATH = path.join(__dirname, '..', 'server', 'data', 'club.db');

function checkSetup() {
  let hasIssues = false;
  let warnings = [];

  console.log('🔍 Checking development environment...');

  // Check if .env exists
  if (!fs.existsSync(ENV_PATH)) {
    console.error('❌ Missing .env file');
    console.log('   💡 Fix: npm run setup:env');
    hasIssues = true;
  } else {
    // Check if .env has JWT_SECRET
    const envContent = fs.readFileSync(ENV_PATH, 'utf8');
    if (envContent.includes('your-super-secret-jwt-key-here')) {
      warnings.push('⚠️  Using default JWT_SECRET (run setup:env to generate new one)');
    }
  }

  // Check if database exists
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database not found');
    console.log('   💡 Fix: npm run setup:db');
    hasIssues = true;
  }

  // Check if required dependencies are installed
  const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.error('❌ Dependencies not installed');
    console.log('   💡 Fix: npm install');
    hasIssues = true;
  }

  // Check if ports are available
  try {
    const { execSync } = require('child_process');
    execSync('lsof -i :3000', { stdio: 'ignore' });
    warnings.push('⚠️  Port 3000 is in use (may conflict with server)');
  } catch (e) {
    // Port is free, which is good
  }

  try {
    const { execSync } = require('child_process');
    execSync('lsof -i :5173', { stdio: 'ignore' });
    warnings.push('⚠️  Port 5173 is in use (may conflict with client)');
  } catch (e) {
    // Port is free, which is good
  }

  // Display warnings
  if (warnings.length > 0) {
    warnings.forEach(warning => console.log(warning));
  }

  if (hasIssues) {
    console.log('\n🔧 To fix all issues, run: npm run setup');
    console.log('📖 Need help? See DEV_QUICK_START.md');
    process.exit(1);
  }

  console.log('✅ Development environment is ready');
  if (warnings.length === 0) {
    console.log('🎉 No issues detected!');
  }
}

if (require.main === module) {
  checkSetup();
}

module.exports = { checkSetup };