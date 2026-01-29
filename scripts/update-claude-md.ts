#!/usr/bin/env npx ts-node
/**
 * CLAUDE.md Auto-Updater
 *
 * Analyzes recent git changes and conversation patterns to suggest
 * updates to CLAUDE.md. Can be run manually or via git hooks.
 *
 * Usage:
 *   npx ts-node scripts/update-claude-md.ts
 *   npx ts-node scripts/update-claude-md.ts --auto  # Auto-apply changes
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const CLAUDE_MD_PATH = path.join(__dirname, '..', 'CLAUDE.md');

async function getRecentChanges(): Promise<string> {
  try {
    // Get recent commits with their diffs (last 5 commits)
    const log = execSync(
      'git log -5 --pretty=format:"### %s%n%b" --stat',
      { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
    );
    return log;
  } catch {
    return 'No recent git history available';
  }
}

async function getModifiedFiles(): Promise<string[]> {
  try {
    const files = execSync(
      'git diff --name-only HEAD~5 HEAD 2>/dev/null || git diff --name-only HEAD',
      { encoding: 'utf-8' }
    );
    return files.split('\n').filter(f => f.trim());
  } catch {
    return [];
  }
}

async function analyzeAndUpdate(autoApply: boolean = false) {
  const anthropic = new Anthropic();

  // Read current CLAUDE.md
  const currentContent = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8');

  // Get recent changes
  const recentChanges = await getRecentChanges();
  const modifiedFiles = await getModifiedFiles();

  console.warn('Analyzing recent changes...');
  console.warn(`   Modified files: ${modifiedFiles.length}`);

  const prompt = `You are a documentation maintainer for the wojak.ink project. Your job is to keep CLAUDE.md up-to-date with lessons learned.

## Current CLAUDE.md:
${currentContent}

## Recent Git Changes:
${recentChanges}

## Modified Files:
${modifiedFiles.join('\n')}

## Your Task:
1. Analyze the recent changes and identify NEW lessons, patterns, or important information
2. Check if any existing information in CLAUDE.md is now outdated or incorrect
3. Suggest specific updates to CLAUDE.md

## Rules:
- Only suggest changes if there's genuinely new/important information
- Keep the document concise - remove redundant info
- Focus on information that will help future coding sessions
- Preserve the existing structure and format
- If nothing significant needs updating, say "No updates needed"

## Output Format:
If updates are needed, output the COMPLETE updated CLAUDE.md content between <updated_claude_md> tags.
If no updates needed, just say "No updates needed" and explain why.

Analyze now:`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }]
  });

  const responseText = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  // Check if updates are needed
  if (responseText.includes('No updates needed')) {
    console.warn('CLAUDE.md is up-to-date. No changes needed.');
    console.warn(responseText);
    return;
  }

  // Extract updated content
  const match = responseText.match(/<updated_claude_md>([\s\S]*?)<\/updated_claude_md>/);

  if (!match) {
    console.warn('Could not extract updated content. Manual review needed.');
    console.warn(responseText);
    return;
  }

  const updatedContent = match[1].trim();

  if (autoApply) {
    // Auto-apply changes
    fs.writeFileSync(CLAUDE_MD_PATH, updatedContent);
    console.warn('CLAUDE.md has been updated automatically.');
  } else {
    // Show diff and ask for confirmation
    console.warn('\nSuggested updates to CLAUDE.md:\n');
    console.warn('─'.repeat(60));
    console.warn(updatedContent);
    console.warn('─'.repeat(60));
    console.warn('\nTo apply these changes, run with --auto flag');
    console.warn('Or manually review and copy the content above.');
  }
}

// Main
const autoApply = process.argv.includes('--auto');
analyzeAndUpdate(autoApply).catch(console.error);
