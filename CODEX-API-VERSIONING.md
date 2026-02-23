# Codex API Versioning & Evolution Strategy

**Generated:** 2026-02-23 13:30 UTC  
**Status:** Ready for implementation  
**Effort Estimate:** 30 minutes  
**ROI:** High (allows safe API evolution, prevents breaking changes)

---

## Overview

**Current State:** Single API version, no versioning strategy.  
**Problem:** Phase 9 adds multiplayer endpoints that may break old mobile clients.  
**Solution:** Semantic versioning + backwards compatibility layers + deprecation timeline.

**Outcome:** Add features without forcing user upgrades.

---

## 1. VERSIONING STRATEGY (5 min)

### Task 1A: Semantic Versioning

**API versions follow MAJOR.MINOR.PATCH:**

- **MAJOR:** Breaking changes (old clients stop working)
- **MINOR:** New features (backwards compatible)
- **PATCH:** Bug fixes (backwards compatible)

**Examples:**
```
v1.0.0  → Initial launch
v1.1.0  → Add multiplayer endpoints (MINOR, backwards compatible)
v1.2.0  → Add tournaments API (MINOR, backwards compatible)
v2.0.0  → Remove deprecated /api/v1/login (MAJOR, breaking)
```

### Task 1B: URL Versioning

```
/api/v1/games           → Version 1 (current)
/api/v2/games           → Version 2 (new, backwards compatible with v1)
/api/v3/games           → Version 3 (future)
```

**Implementation:**

**File: `functions/api/[[version]]/[...route].ts`**

```typescript
export async function handler(req: Request) {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  
  // Extract version: /api/v1/games → "v1"
  const version = pathParts[2]; // v1, v2, etc.
  const resource = pathParts[3]; // games, leaderboard, etc.
  
  // Route to correct handler
  switch (version) {
    case 'v1':
      return handleV1(req, resource);
    case 'v2':
      return handleV2(req, resource);
    default:
      return errorResponse(400, 'Unsupported API version');
  }
}
```

---

## 2. REQUEST/RESPONSE VALIDATION (8 min)

### Task 2A: Define API Schemas

**File: `src/schema/api.ts`**

```typescript
import { z } from 'zod';

// V1 Game Response
export const GameResponseV1 = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  thumbnail_url: z.string(),
});

// V2 Game Response (adds new fields)
export const GameResponseV2 = GameResponseV1.extend({
  difficulty_rating: z.number().min(1).max(10),
  play_count: z.number(),
  avg_score: z.number(),
  supports_multiplayer: z.boolean(),
});

// Create request schema
export const CreateGameRequestV1 = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  category: z.string(),
});

export const CreateGameRequestV2 = CreateGameRequestV1.extend({
  difficulty_rating: z.number().min(1).max(10),
  max_players: z.number().optional(),
});
```

### Task 2B: Validate Requests

```typescript
// Endpoint: GET /api/v1/games/:id
export async function getGameV1(req: Request, gameId: string) {
  const game = await db.query('SELECT * FROM games WHERE id = ?', [gameId]);
  
  // Validate against schema
  const validated = GameResponseV1.parse({
    id: game.id,
    name: game.name,
    description: game.description,
    category: game.category,
    thumbnail_url: game.thumbnail_url,
    // Note: v2 fields excluded for v1
  });
  
  return jsonResponse(validated);
}

// Endpoint: GET /api/v2/games/:id
export async function getGameV2(req: Request, gameId: string) {
  const game = await db.query('SELECT * FROM games WHERE id = ?', [gameId]);
  
  // Validate against schema
  const validated = GameResponseV2.parse({
    id: game.id,
    name: game.name,
    description: game.description,
    category: game.category,
    thumbnail_url: game.thumbnail_url,
    difficulty_rating: game.difficulty_rating || 5,
    play_count: game.play_count || 0,
    avg_score: game.avg_score || 0,
    supports_multiplayer: game.supports_multiplayer || false,
  });
  
  return jsonResponse(validated);
}
```

### Task 2C: Validate POST Bodies

```typescript
export async function createGame(req: Request, version: 'v1' | 'v2') {
  const body = await req.json();
  
  try {
    const schema = version === 'v1' ? CreateGameRequestV1 : CreateGameRequestV2;
    const validated = schema.parse(body);
    
    // Proceed with validated data
    const game = await db.query('INSERT INTO games (?, ?, ?, ?) VALUES (?)', [
      validated.name,
      validated.description,
      validated.category,
      validated.difficulty_rating || 5,
    ]);
    
    return jsonResponse({ id: game.id, status: 'created' }, 201);
  } catch (error) {
    return errorResponse(400, 'Invalid request: ' + error.message);
  }
}
```

---

## 3. BACKWARDS COMPATIBILITY (5 min)

### Task 3A: Version Adapters

**Pattern: Old client calls v1, server responds with both v1 + v2 data**

```typescript
// Adapter that converts v2 data → v1 format
const adaptGameV2toV1 = (game: GameV2): GameV1 => {
  return {
    id: game.id,
    name: game.name,
    description: game.description,
    category: game.category,
    thumbnail_url: game.thumbnail_url,
    // v2-only fields dropped
  };
};

// Usage
export async function getGameV1(req: Request, gameId: string) {
  const game = await db.query('SELECT * FROM games WHERE id = ?', [gameId]);
  const gameV2 = GameResponseV2.parse(game);
  const gameV1 = adaptGameV2toV1(gameV2);
  
  return jsonResponse(gameV1);
}
```

### Task 3B: Deprecation Headers

```typescript
export async function getGameV1(req: Request, gameId: string) {
  const game = await db.query('SELECT * FROM games WHERE id = ?', [gameId]);
  
  return jsonResponse(GameResponseV1.parse(game), 200, {
    // Signal to clients that v1 is deprecated
    'Deprecation': 'true',
    'Sunset': 'Sun, 31 Dec 2026 23:59:59 GMT', // When v1 goes away
    'Link': '</api/v2/games/' + gameId + '>; rel="successor-version"',
    'X-API-Warn': 'API v1 is deprecated. Migrate to v2 by Dec 31, 2026',
  });
}
```

---

## 4. DEPRECATION TIMELINE (5 min)

### Task 4A: Deprecation Schedule

```markdown
# API Deprecation Timeline

## v1 (Current, deprecated after Dec 2026)
- Launch date: Feb 23, 2026
- Deprecation notice: Mar 1, 2026
- Sunset date: Dec 31, 2026
- Migration guide: https://docs.wojak-ink.com/migrate-v1-v2

## v2 (Current, will be current until Dec 2027)
- Launch date: Mar 1, 2026
- Planned sunset: Dec 31, 2027
- New features: Multiplayer, tournaments, NFTs

## v3 (Future, tentative)
- Planned: Q4 2027
- Expected features: DAOs, blockchain integration
```

### Task 4B: Track Deprecation Status

```typescript
// src/lib/apiStatus.ts
export enum APIVersionStatus {
  DEPRECATED = 'deprecated',
  CURRENT = 'current',
  BETA = 'beta',
  SUNSET = 'sunset',
}

export const API_VERSIONS = {
  v1: {
    status: APIVersionStatus.DEPRECATED,
    sunsetDate: new Date('2026-12-31'),
    warningMessage: 'API v1 deprecated. Migrate to v2.',
  },
  v2: {
    status: APIVersionStatus.CURRENT,
    sunsetDate: new Date('2027-12-31'),
    warningMessage: null,
  },
  v3: {
    status: APIVersionStatus.BETA,
    sunsetDate: null,
    warningMessage: 'API v3 is beta. Not recommended for production.',
  },
};

// Check version status
export const checkVersionStatus = (version: string) => {
  const versionInfo = API_VERSIONS[version];
  
  if (!versionInfo) {
    return { status: 'unknown', message: `API version ${version} not found` };
  }
  
  if (versionInfo.status === APIVersionStatus.SUNSET) {
    return { status: 'offline', message: `API ${version} is no longer available` };
  }
  
  return versionInfo;
};
```

### Task 4C: Implement Version Checks

```typescript
// Middleware: Check if version is still supported
export async function apiVersionMiddleware(req: Request, next: Function) {
  const version = extractVersion(req);
  const status = checkVersionStatus(version);
  
  if (status.status === 'offline') {
    return errorResponse(410, 'API version no longer supported. ' + status.message);
  }
  
  // Add warning header if deprecated
  const response = await next();
  
  if (status.message) {
    response.headers.set('X-API-Warn', status.message);
  }
  
  return response;
}
```

---

## 5. ERROR HANDLING STANDARDIZATION (5 min)

### Task 5A: Unified Error Format

**File: `src/types/errors.ts`**

```typescript
export interface APIError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    request_id: string;
  };
}

export const errorResponse = (status: number, code: string, message: string, details?: any) => {
  return new Response(JSON.stringify({
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      request_id: crypto.randomUUID(),
    },
  }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};
```

### Task 5B: Consistent Error Codes

```typescript
export enum APIErrorCode {
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VERSION_DEPRECATED = 'VERSION_DEPRECATED',
  VERSION_NOT_FOUND = 'VERSION_NOT_FOUND',
}

// Usage
throw new APIErrorException(400, APIErrorCode.INVALID_REQUEST, 'Game name required');
```

### Task 5C: Version-Specific Errors

```typescript
// v1 error format (minimal)
{
  "error": "Not found"
}

// v2 error format (detailed)
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Game not found",
    "game_id": "invalid-id",
    "timestamp": "2026-02-23T13:30:00Z",
    "request_id": "req-123"
  }
}
```

---

## 6. DOCUMENTATION (3 min)

### Task 6A: OpenAPI/Swagger Specs

**File: `docs/openapi.v1.json`**

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Wojak Ink API v1",
    "version": "1.0.0",
    "deprecated": true,
    "x-sunset-date": "2026-12-31",
    "x-migration-guide": "https://docs.wojak-ink.com/migrate-v1-v2"
  },
  "servers": [
    { "url": "https://api.wojak-ink.com/api/v1" }
  ],
  "paths": {
    "/games": {
      "get": {
        "summary": "List all games",
        "deprecated": true
      }
    }
  }
}
```

### Task 6B: Migration Guides

**File: `docs/MIGRATE-V1-V2.md`**

```markdown
# Migrating from API v1 to v2

## Breaking Changes
- None! v2 is fully backwards compatible

## New Features in v2
- `difficulty_rating`: Game difficulty (1-10)
- `play_count`: Number of times played
- `supports_multiplayer`: If game has multiplayer

## Example: Get Game

### v1
```bash
curl https://api.wojak-ink.com/api/v1/games/123
```

Response:
```json
{
  "id": "123",
  "name": "Word Game",
  "category": "puzzle"
}
```

### v2
```bash
curl https://api.wojak-ink.com/api/v2/games/123
```

Response:
```json
{
  "id": "123",
  "name": "Word Game",
  "category": "puzzle",
  "difficulty_rating": 7,
  "play_count": 1500,
  "supports_multiplayer": true
}
```
```

---

## Definition of Done

✅ Semantic versioning implemented  
✅ Multiple API versions coexist  
✅ Backwards compatibility verified  
✅ Deprecation headers added  
✅ Error format standardized  
✅ OpenAPI specs documented  
✅ Migration guides written  

---

## API Version Timeline

```
v1: ────────────────────────────── (Feb 2026 - Dec 2026)
v2: ────────────────────────────── (Mar 2026 - Dec 2027)
v3:                              ────────── (Q4 2027+)
```

---

**API now supports safe evolution without forcing user upgrades.** 🚀
