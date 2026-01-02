# Strategy for Splitting rare_pairings_index_v1.json

## Problem
The file is 309MB, exceeding GitHub's 100MB limit.

## File Structure Analysis
- **Metadata** (schema_version, generated_at, etc.): ~small
- **Primary views**: ~2.7MB (6 categories)
- **Drilldown views**: ~141MB (30 category pairs)
- **Total**: 309MB

## Solution: Split into 4 Chunk Files

### Approach 1: Split by Drilldown Keys (Recommended)
Split the 30 drilldown keys into 4 groups of ~7-8 keys each:

1. **rare_pairings_index_v1_part1.json** - Metadata + Primary + Drilldown chunks 1-8
2. **rare_pairings_index_v1_part2.json** - Drilldown chunks 9-16
3. **rare_pairings_index_v1_part3.json** - Drilldown chunks 17-24
4. **rare_pairings_index_v1_part4.json** - Drilldown chunks 25-30

Each file should be < 100MB.

### Approach 2: Split by Size (More Balanced)
Distribute drilldown keys to balance file sizes:
- Group keys by size, ensuring each chunk is ~75MB
- This requires calculating sizes during build

## Implementation Steps

1. **Modify build script** (`scripts/build_bigpulp_rare_pairings_index.mjs`):
   - Instead of writing one large file, write 4 chunk files
   - Distribute drilldown keys across chunks
   - Include metadata in part1 only
   - Include primary views in part1 only

2. **Modify loader** (`src/components/windows/BigPulpIntelligenceWindow.jsx`):
   - Update `loadRarePairingsIndex()` to fetch all 4 chunks in parallel
   - Merge chunks back into single data structure
   - Maintain same API for rest of codebase

3. **Update .gitignore**:
   - Remove `rare_pairings_index_v1.json` from .gitignore
   - Add chunk files to git

## Benefits
- ✅ All data stays in repository
- ✅ Parallel loading (faster)
- ✅ Each file < 100MB (GitHub compatible)
- ✅ Minimal code changes (only loader and build script)

