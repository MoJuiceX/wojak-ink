#!/usr/bin/env npx ts-node
/**
 * Merge LEARNINGS.md into CLAUDE.md
 *
 * Takes unchecked learnings from LEARNINGS.md and asks Claude
 * to intelligently merge them into CLAUDE.md.
 *
 * Usage:
 *   npx ts-node scripts/merge-learnings.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

const CLAUDE_MD_PATH = path.join(__dirname, '..', 'CLAUDE.md');
const LEARNINGS_PATH = path.join(__dirname, '..', 'LEARNINGS.md');

async function mergeLearnings() {
  // Check if LEARNINGS.md exists
  if (!fs.existsSync(LEARNINGS_PATH)) {
    console.warn('No LEARNINGS.md file found. Nothing to merge.');
    return;
  }

  const claudeMd = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8');
  const learnings = fs.readFileSync(LEARNINGS_PATH, 'utf-8');

  // Check if there are unchecked items
  if (!learnings.includes('- [ ]')) {
    console.warn('No unchecked learnings to merge.');
    return;
  }

  console.warn('Merging learnings into CLAUDE.md...\n');

  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [{
      role: 'user',
      content: `You are updating a project's CLAUDE.md file with new learnings.

## Current CLAUDE.md:
${claudeMd}

## New Learnings (from LEARNINGS.md):
${learnings}

## Task:
1. Find all UNCHECKED items (- [ ]) in the learnings
2. Intelligently merge them into the appropriate sections of CLAUDE.md
3. Keep CLAUDE.md concise - don't duplicate information
4. Remove outdated information if the new learnings supersede it

## Output:
Provide the complete updated CLAUDE.md between <updated_claude_md> tags.
Then list which learnings were merged so we can mark them as done.`
    }]
  });

  const responseText = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  const match = responseText.match(/<updated_claude_md>([\s\S]*?)<\/updated_claude_md>/);

  if (match) {
    fs.writeFileSync(CLAUDE_MD_PATH, match[1].trim());
    console.warn('CLAUDE.md updated successfully!\n');
    console.warn('Remember to mark merged items as [x] in LEARNINGS.md');
  } else {
    console.warn('Could not extract updated content.');
    console.warn(responseText);
  }
}

mergeLearnings().catch(console.error);
