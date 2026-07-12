import { chromium, type FullConfig } from '@playwright/test';
import { type ChildProcess, spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

let demoServer: ChildProcess | null = null;

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting flows-admin-demo server for screenshot capture...');

  // Create output directories
  const outputDirs = [
    '/Volumes/Projects/Thepia/thepia.com/src/assets/flows-demo',
    '/Volumes/Projects/Thepia/thepia.com/src/assets/flows-demo/desktop',
    '/Volumes/Projects/Thepia/thepia.com/src/assets/flows-demo/tablet',
  ];

  for (const dir of outputDirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    } catch (error) {
      console.log(`📁 Directory already exists: ${dir}`);
    }
  }

  // Start the flows-admin-demo server
  return new Promise<void>((resolve, reject) => {
    console.log('🔧 Starting flows-admin-demo server...');

    demoServer = spawn('pnpm', ['--filter', 'flows-admin-demo', 'dev'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd(),
      env: { ...process.env },
    });

    let serverReady = false;
    const timeout = setTimeout(() => {
      if (!serverReady) {
        reject(new Error('Demo server failed to start within 60 seconds'));
      }
    }, 60000);

    demoServer.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log(`[Demo Server] ${output}`);

      // Look for server ready indicators
      if (
        output.includes('Local:') ||
        output.includes('localhost:5173') ||
        output.includes('ready in')
      ) {
        if (!serverReady) {
          serverReady = true;
          clearTimeout(timeout);
          console.log('✅ Demo server is ready!');

          // Wait a bit more for full initialization
          setTimeout(() => {
            resolve();
          }, 3000);
        }
      }
    });

    demoServer.stderr?.on('data', (data) => {
      console.error(`[Demo Server Error] ${data.toString()}`);
    });

    demoServer.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to start demo server: ${error.message}`));
    });

    demoServer.on('exit', (code) => {
      if (code !== 0 && !serverReady) {
        clearTimeout(timeout);
        reject(new Error(`Demo server exited with code ${code}`));
      }
    });
  });
}

export default globalSetup;
