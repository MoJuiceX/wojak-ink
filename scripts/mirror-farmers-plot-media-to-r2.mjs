import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { execFile as execFileCallback } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const execFile = promisify(execFileCallback);

const COLLECTION_SIZE = 4200;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const sourceDir = process.env.FARMERS_PLOT_SOURCE_DIR
  ? path.resolve(process.env.FARMERS_PLOT_SOURCE_DIR)
  : path.resolve(process.env.HOME || '', 'Pictures/NFT_Collections/Wojak_NFT/Wojak PFPs/Wojak Farmers Plot final');
const bucket = process.env.FARMERS_PLOT_R2_BUCKET;
const prefix = (process.env.FARMERS_PLOT_R2_PREFIX || 'farmers-plot').replace(/^\/+|\/+$/g, '');
const isRealRun = process.argv.includes('--real');

function parseEditionRange(rawValue, fallback) {
  const parsed = Number.parseInt(String(rawValue || ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function ensureReadable(filePath) {
  await fs.access(filePath);
  return filePath;
}

async function uploadEdition(edition) {
  const paddedEdition = String(edition).padStart(4, '0');
  const localFile = await ensureReadable(path.join(sourceDir, `${edition}.png`));
  const key = `${prefix}/${paddedEdition}.png`;

  if (!isRealRun) {
    console.log(`[dry-run] ${localFile} -> ${bucket}/${key}`);
    return;
  }

  await execFile(
    'npx',
    ['wrangler', 'r2', 'object', 'put', `${bucket}/${key}`, '--file', localFile],
    { cwd: repoRoot }
  );
  console.log(`uploaded ${edition} -> ${bucket}/${key}`);
}

async function main() {
  if (!bucket) {
    throw new Error('Set FARMERS_PLOT_R2_BUCKET to the target bucket name before running this script.');
  }

  const startEdition = Math.min(parseEditionRange(process.env.FARMERS_PLOT_START_EDITION, 1), COLLECTION_SIZE);
  const endEdition = Math.min(parseEditionRange(process.env.FARMERS_PLOT_END_EDITION, COLLECTION_SIZE), COLLECTION_SIZE);

  if (startEdition > endEdition) {
    throw new Error(`Invalid edition range: start ${startEdition} > end ${endEdition}`);
  }

  const missingFiles = [];

  for (let edition = startEdition; edition <= endEdition; edition += 1) {
    try {
      await uploadEdition(edition);
    } catch (error) {
      missingFiles.push({ edition, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (missingFiles.length > 0) {
    console.error(`Failed to mirror ${missingFiles.length} edition(s):`);
    for (const failure of missingFiles.slice(0, 20)) {
      console.error(`  #${failure.edition}: ${failure.error}`);
    }
    if (missingFiles.length > 20) {
      console.error(`  ...and ${missingFiles.length - 20} more`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `${isRealRun ? 'Mirrored' : 'Validated'} editions ${startEdition}-${endEdition} to ${bucket}/${prefix}/`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
