# Sales Index Build Guide

## Overview

The sales index build system is a robust, production-grade script that fetches NFT sales data from MintGarden API with:

- **Adaptive Rate Limiting**: Never hits rate limits, automatically adjusts delay
- **Checkpoint System**: Can resume from any point, never lose progress
- **Enhanced Error Handling**: Graceful recovery from all error types
- **Comprehensive Logging**: Full visibility into build process
- **Data Validation**: Pre and post-build validation scripts

## Quick Start

### 1. Validation Test (Recommended First Step)

Test on known NFTs to verify everything works:

```bash
npm run build:mintgarden-sales:validate
```

Or use the standalone validation script:

```bash
npm run validate:sales-index:pre
```

### 2. Full Build

Run the full build (automatically resumes if checkpoint exists):

```bash
npm run build:mintgarden-sales
```

### 3. Fresh Build (Ignore Checkpoint)

Start from scratch, ignoring any existing checkpoint:

```bash
npm run build:mintgarden-sales:fresh
```

### 4. Resume from Checkpoint

Explicitly resume from last checkpoint:

```bash
npm run build:mintgarden-sales:resume
```

## Features

### Adaptive Rate Limiting

- Starts with 1000ms base delay
- Automatically increases delay after rate limit errors (exponential backoff)
- Gradually decreases delay after successful requests
- Maximum delay: 10 seconds
- Minimum delay: 500ms
- Circuit breaker: Pauses if too many consecutive rate limits

### Checkpoint System

- Saves progress every 100 NFTs processed
- Stores: processed launchers, found trades, error log, state
- Checkpoint file: `public/assets/BigPulp/.sales_index_checkpoint.json`
- Automatically resumes on next run (unless `--fresh` flag used)
- Ctrl+C saves checkpoint and exits gracefully

### Error Handling

Error categories with appropriate retry logic:

- **Rate Limit (429)**: Exponential backoff, retry up to 10 times
- **Server Error (5xx)**: Retry with backoff, max 5 times
- **Client Error (4xx)**: Log and skip (likely invalid NFT)
- **Network Error**: Retry with exponential backoff
- **Timeout**: Increase timeout, retry

All errors are logged to: `public/assets/BigPulp/.sales_index_errors.json`

### Progress Reporting

Real-time progress display:

```
[████████████░░░░░░░░] 60% (2345/3916)
Trades found: 127
Success rate: 98.5%
ETA: 12 minutes
Current delay: 800ms
```

### Logging

Detailed log file: `public/assets/BigPulp/.sales_index_build.log`

- Log levels: INFO, WARN, ERROR, DEBUG
- Timestamped entries
- Context included (NFT ID, launcher, etc.)

## Validation

### Pre-Build Validation

Test extraction logic on known NFTs:

```bash
npm run validate:sales-index:pre
```

### Post-Build Validation

Validate output file for data integrity:

```bash
npm run validate:sales-index:post
```

Or:

```bash
npm run validate:sales-index
```

Validation checks:
- Schema validation
- Data consistency
- Price normalization
- Duplicate detection
- Known sales comparison

## Output Files

### Main Output

- `public/assets/BigPulp/mintgarden_sales_index_v1.json` - Sales index data

### Build Artifacts (Gitignored)

- `public/assets/BigPulp/.sales_index_checkpoint.json` - Checkpoint state
- `public/assets/BigPulp/.sales_index_errors.json` - Error log
- `public/assets/BigPulp/.sales_index_build.log` - Build log

## Troubleshooting

### Build Stuck or Slow

- Check current delay in progress output
- Review error log for rate limit issues
- Script automatically slows down if rate limited

### Build Interrupted

- Checkpoint is automatically saved
- Run `npm run build:mintgarden-sales:resume` to continue
- Or just run `npm run build:mintgarden-sales` (auto-resumes)

### No Trades Found

- Run validation first: `npm run build:mintgarden-sales:validate`
- Check error log for API issues
- Verify known NFTs have sales

### Rate Limit Errors

- Script automatically handles this
- Delay increases automatically
- Circuit breaker pauses if too many errors
- Just wait and let it continue

## Performance

- **Estimated time**: 30-60 minutes for full build (3916 NFTs)
- **Rate**: ~1-2 requests/second (adaptive)
- **Checkpoint interval**: Every 100 NFTs
- **Progress updates**: Every 50 NFTs

## Command Reference

```bash
# Validation
npm run build:mintgarden-sales:validate    # Quick test (1 minute)
npm run validate:sales-index:pre           # Pre-build validation
npm run validate:sales-index:post           # Post-build validation

# Build
npm run build:mintgarden-sales             # Full build (auto-resume)
npm run build:mintgarden-sales:fresh        # Fresh build (ignore checkpoint)
npm run build:mintgarden-sales:resume       # Explicit resume
```

## Success Criteria

✅ Never hits rate limits (adaptive delay prevents this)
✅ Can resume from any point (checkpoint system)
✅ Handles all error cases gracefully
✅ Provides clear progress visibility
✅ Validates data integrity
✅ Completes successfully even with network issues
✅ Takes as long as needed (no time pressure)


