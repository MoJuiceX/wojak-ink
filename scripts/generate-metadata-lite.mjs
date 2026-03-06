#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const sourcePath = join(rootDir, 'public', 'assets', 'nft-data', 'metadata.json');
const outputPath = join(rootDir, 'public', 'assets', 'nft-data', 'metadata-lite.json');

const raw = JSON.parse(readFileSync(sourcePath, 'utf8'));
const lite = raw.map(({ name, edition, date, attributes }) => ({
  name,
  edition,
  date,
  attributes,
}));

writeFileSync(outputPath, JSON.stringify(lite));

console.log(`[metadata-lite] wrote ${outputPath}`);
