/**
 * Test that the bundled service worker file is valid
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Bundled Service Worker', () => {
  it('should exist in dist folder', async () => {
    const swPath = resolve(__dirname, '../dist/flows-sw.js');
    const content = await readFile(swPath, 'utf-8');

    expect(content).toBeTruthy();
    expect(content.length).toBeGreaterThan(1000);
  });

  it('should contain seed data', async () => {
    const swPath = resolve(__dirname, '../dist/flows-sw.js');
    const content = await readFile(swPath, 'utf-8');

    // Check for journey seed data
    expect(content).toContain('journey-001');
    expect(content).toContain('Sarah Chen');
    expect(content).toContain('Employee Onboarding');

    // Check for task seed data
    expect(content).toContain('task-001');
    expect(content).toContain('Meet the team');
  });

  it('should contain service worker lifecycle handlers', async () => {
    const swPath = resolve(__dirname, '../dist/flows-sw.js');
    const content = await readFile(swPath, 'utf-8');

    // Check for message handler
    expect(content).toContain('addEventListener');
    expect(content).toContain('message');
  });

  it('should contain IndexedDB operations', async () => {
    const swPath = resolve(__dirname, '../dist/flows-sw.js');
    const content = await readFile(swPath, 'utf-8');

    expect(content).toContain('indexedDB.open');
    expect(content).toContain('createObjectStore');
  });

  it('should contain RPC handler functions', async () => {
    const swPath = resolve(__dirname, '../dist/flows-sw.js');
    const content = await readFile(swPath, 'utf-8');

    // Check for query method names (minified code will have case statements)
    expect(content).toContain('case "journeys"');
    expect(content).toContain('case "tasks"');
    expect(content).toContain('case "journeyById"');

    // Check for mutation method names
    expect(content).toContain('case "insertJourney"');
    expect(content).toContain('case "updateJourney"');
  });
});
