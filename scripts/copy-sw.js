#!/usr/bin/env node
/**
 * Copy service worker from @thepia/flows-client to app's static folder
 *
 * Usage:
 *   node node_modules/@thepia/flows-client/scripts/copy-sw.js [destination]
 *
 * Or add to package.json:
 *   "scripts": {
 *     "copy:sw": "node node_modules/@thepia/flows-client/scripts/copy-sw.js static"
 *   }
 */

import { copyFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Get destination from command line or use default
const dest = process.argv[2] || 'static';
const destDir = resolve(process.cwd(), dest);

// Source files from package
const swSource = resolve(__dirname, '../dist/flows-sw.js');
const mapSource = resolve(__dirname, '../dist/flows-sw.js.map');

// Destination files
const swDest = resolve(destDir, 'flows-sw.js');
const mapDest = resolve(destDir, 'flows-sw.js.map');

async function copyServiceWorker() {
  try {
    // Ensure destination directory exists
    await mkdir(destDir, { recursive: true });

    // Copy service worker
    await copyFile(swSource, swDest);
    console.log(`✓ Copied service worker: ${swDest}`);

    // Copy source map
    await copyFile(mapSource, mapDest);
    console.log(`✓ Copied source map: ${mapDest}`);

    console.log('\n✅ Service worker ready! Register it with:');
    console.log('   navigator.serviceWorker.register(\'/flows-sw.js\')');
  } catch (error) {
    console.error('❌ Failed to copy service worker:', error.message);
    process.exit(1);
  }
}

copyServiceWorker();
