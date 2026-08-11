import * as path from 'path';
import * as fs from 'fs';

/**
 * Returns the path to the persistent data directory.
 * Uses process.env.DATA_DIR if set, otherwise falls back to the project root.
 * Note: process.cwd() is assumed to be the project root for the pipeline.
 */
export function getDataDir(): string {
  return process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : process.cwd();
}

/**
 * Returns the path to a specific file in the persistent data directory.
 */
export function getDataFile(filename: string): string {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.resolve(dir, filename);
}
