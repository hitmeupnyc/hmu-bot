#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ENV_PATH = path.join(__dirname, '..', 'server', '.env');
const ENV_EXAMPLE_PATH = path.join(__dirname, '..', 'server', '.env.example');

function generateJWTSecret() {
  return crypto.randomBytes(64).toString('hex');
}

function setupEnvironment() {
  console.log('🔧 Setting up environment configuration...');

  // Check if .env already exists
  if (fs.existsSync(ENV_PATH)) {
    console.log('✅ .env file already exists');
    return;
  }

  // Check if .env.example exists
  if (!fs.existsSync(ENV_EXAMPLE_PATH)) {
    console.error('❌ .env.example file not found');
    process.exit(1);
  }

  // Copy .env.example to .env
  let envContent = fs.readFileSync(ENV_EXAMPLE_PATH, 'utf8');

  // Generate and replace JWT_SECRET
  const jwtSecret = generateJWTSecret();
  envContent = envContent.replace(
    'JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random',
    `JWT_SECRET=${jwtSecret}`
  );

  // Set reasonable defaults for development
  envContent = envContent.replace(
    'WEBHOOK_BASE_URL=https://your-domain.com',
    'WEBHOOK_BASE_URL=http://localhost:3000'
  );

  // Write the .env file
  fs.writeFileSync(ENV_PATH, envContent);

  console.log('✅ Created .env file with generated JWT secret');
  console.log('📝 Edit server/.env to add your API keys for external services');
  console.log('💡 See SETUP_GUIDE.md for detailed integration setup');
}

if (require.main === module) {
  setupEnvironment();
}

module.exports = { setupEnvironment };