#!/usr/bin/env tsx

import { OpenApi } from '@effect/platform';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { Api } from '../src/api';

const outputRoot = join(__dirname, '..', 'dist-sdk');

/**
 * Export OpenAPI specification to JSON file
 * This script generates the OpenAPI spec from the Effect API definition
 * and saves it to server/openapi.json for external consumption
 */
async function exportOpenApiSpec() {
  try {
    console.log('🔄 Generating OpenAPI specification...');

    // Generate OpenAPI spec from the API definition
    const openApiSpec = OpenApi.fromApi(Api);

    // Add additional metadata
    const enhancedSpec = {
      ...openApiSpec,
      info: {
        ...openApiSpec.info,
        title: 'Club Management System API',
        version: '1.0.0',
        description:
          'RESTful API for managing club members, events, and authentication',
      },
      servers: [
        {
          url: 'http://localhost:5173',
          description: 'Development server',
        },
        {
          url: 'https://api.example.com',
          description: 'Production server',
        },
      ],
    };

    // Write to JSON file

    await mkdir(outputRoot).catch(() => {});
    const outputPath = join(outputRoot, 'openapi.json');
    await writeFile(outputPath, JSON.stringify(enhancedSpec, null, 2));

    console.log('✅ OpenAPI specification exported successfully!');
    console.log(`📁 File saved to: ${outputPath}`);
    console.log(
      `📊 Found ${Object.keys(enhancedSpec.paths || {}).length} API endpoints`
    );
  } catch (error) {
    console.error('❌ Failed to export OpenAPI specification:', error);
    process.exit(1);
  }
}

// Run the export
exportOpenApiSpec();
