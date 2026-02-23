#!/usr/bin/env node

/**
 * Read ESLint JSON from stdin and print a compact hotspot summary for Night Shift logs/reports.
 */

let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
}

if (!input.trim()) {
  console.log('No ESLint JSON input received.');
  process.exit(0);
}

let results;
try {
  results = JSON.parse(input);
} catch (error) {
  console.error('Failed to parse ESLint JSON output.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

if (!Array.isArray(results)) {
  console.error('Unexpected ESLint JSON format (expected array).');
  process.exit(1);
}

const fileSummaries = [];
const ruleCounts = new Map();
let errorTotal = 0;
let warningTotal = 0;

for (const file of results) {
  const messages = Array.isArray(file.messages) ? file.messages : [];
  const errorCount = Number(file.errorCount || 0);
  const warningCount = Number(file.warningCount || 0);
  errorTotal += errorCount;
  warningTotal += warningCount;

  for (const msg of messages) {
    if (!msg.ruleId) continue;
    ruleCounts.set(msg.ruleId, (ruleCounts.get(msg.ruleId) || 0) + 1);
  }

  if (errorCount || warningCount) {
    fileSummaries.push({
      filePath: file.filePath,
      errorCount,
      warningCount,
      total: errorCount + warningCount,
      messages,
    });
  }
}

fileSummaries.sort((a, b) => b.total - a.total || b.errorCount - a.errorCount || a.filePath.localeCompare(b.filePath));
const topFiles = fileSummaries.slice(0, 12);

const topRules = [...ruleCounts.entries()]
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .slice(0, 10);

console.log(`ESLint summary: ${errorTotal} errors, ${warningTotal} warnings across ${fileSummaries.length} files.`);

if (!fileSummaries.length) {
  process.exit(0);
}

console.log('\nTop files:');
for (const item of topFiles) {
  const shortPath = item.filePath.replace(process.cwd() + '/', '');
  console.log(`- ${shortPath}: ${item.errorCount} errors, ${item.warningCount} warnings`);
}

if (topRules.length) {
  console.log('\nTop rules:');
  for (const [rule, count] of topRules) {
    console.log(`- ${rule}: ${count}`);
  }
}

console.log('\nSample messages:');
for (const item of topFiles.slice(0, 5)) {
  const shortPath = item.filePath.replace(process.cwd() + '/', '');
  const first = item.messages[0];
  if (!first) continue;
  console.log(`- ${shortPath}:${first.line ?? 0}:${first.column ?? 0} ${first.ruleId ?? 'unknown'} ${first.message}`);
}
