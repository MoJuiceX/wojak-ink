// GET /api/profile/display-name?did=xxx — Get display name
// PUT /api/profile/display-name — Set display name
// Body: { did: string, name: string, source: 'custom' | 'random' }

import { authenticateRequest } from '../../lib/auth';
import { isValidDid } from '../game/_shared';

interface Env {
  DB: D1Database;
  CLERK_DOMAIN: string;
}

// Random name generation components
const ADJECTIVES = [
  'Based', 'Degen', 'Diamond', 'Paper', 'Crypto', 'Moon', 'Alpha',
  'Gigachad', 'Wojak', 'Pepe', 'Dank', 'Epic', 'Rare', 'Golden',
  'Mega', 'Ultra', 'Super', 'Turbo', 'Hyper', 'Cosmic',
];

const NOUNS = [
  'Wojak', 'Anon', 'Chad', 'Holder', 'Trader', 'Farmer', 'Ape',
  'Bull', 'Bear', 'Whale', 'Shrimp', 'Goblin', 'Fren', 'Degen',
  'King', 'Lord', 'Master', 'Wizard', 'Sage', 'Hunter',
];

function generateRandomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const did = url.searchParams.get('did');

    // Check if requesting random name
    if (url.pathname.endsWith('/random-name')) {
      return Response.json({ name: generateRandomName() });
    }

    if (!did) {
      return Response.json({ error: 'Missing did parameter' }, { status: 400 });
    }

    const db = context.env.DB;
    const profile = await db.prepare(
      'SELECT display_name, name_source FROM did_profiles WHERE did_id = ?'
    ).bind(did).first<{ display_name: string | null; name_source: string }>();

    // If profile exists with a display name, return it
    if (profile?.display_name) {
      return Response.json({
        did,
        displayName: profile.display_name,
        source: profile.name_source,
      });
    }

    // No profile or no name — generate a random one and save it
    const randomName = generateRandomName();
    await db.prepare(`
      INSERT INTO did_profiles (did_id, display_name, name_source, created_at, updated_at)
      VALUES (?, ?, 'random', datetime('now'), datetime('now'))
      ON CONFLICT(did_id) DO UPDATE SET
        display_name = COALESCE(display_name, ?),
        name_source = COALESCE(name_source, 'random'),
        updated_at = datetime('now')
    `).bind(did, randomName, randomName).run();

    return Response.json({
      did,
      displayName: randomName,
      source: 'random',
    });
  } catch (error) {
    console.error('[api/profile/display-name] GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    // Verify authentication
    if (!context.env.CLERK_DOMAIN) {
      return Response.json({ error: 'Auth not configured' }, { status: 500 });
    }

    const auth = await authenticateRequest(context.request, context.env.CLERK_DOMAIN);
    if (!auth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve candidate DID: JWT did claim (if valid) or game_players row for this Clerk user
    let candidateDid: string | null = null;
    const tokenDid = auth.payload?.did as string | undefined;
    if (tokenDid && isValidDid(tokenDid)) {
      candidateDid = tokenDid;
    } else {
      const row = await context.env.DB.prepare(
        'SELECT did_id FROM game_players WHERE clerk_user_id = ?'
      ).bind(auth.userId).first<{ did_id: string }>();
      if (row?.did_id) candidateDid = row.did_id;
    }
    if (!candidateDid) {
      return Response.json({ error: 'Link your DID first' }, { status: 403 });
    }

    const body = await context.request.json<{
      did: string;
      name: string;
      source: 'custom' | 'random';
    }>();

    const { did, name, source } = body;

    if (did !== candidateDid) {
      return Response.json({ error: 'Cannot update another user\'s profile' }, { status: 403 });
    }

    if (!name || typeof name !== 'string') {
      return Response.json({ error: 'Missing or invalid name' }, { status: 400 });
    }

    // Validate name length and characters (spec: 2-20 chars, alphanumeric + spaces)
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 20) {
      return Response.json({ error: 'Name must be 2-20 characters' }, { status: 400 });
    }

    // Allow alphanumeric, spaces, and common punctuation (apostrophes, hyphens, periods, underscores)
    if (!/^[a-zA-Z0-9 '\-._]+$/.test(trimmedName)) {
      return Response.json({ error: 'Name can only contain letters, numbers, spaces, and basic punctuation' }, { status: 400 });
    }

    const db = context.env.DB;

    // Upsert profile
    await db.prepare(`
      INSERT INTO did_profiles (did_id, display_name, name_source, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(did_id) DO UPDATE SET
        display_name = ?,
        name_source = ?,
        updated_at = datetime('now')
    `).bind(did, trimmedName, source || 'custom', trimmedName, source || 'custom').run();

    return Response.json({
      success: true,
      displayName: trimmedName,
      source: source || 'custom',
    });
  } catch (error) {
    console.error('[api/profile/display-name] PUT error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
};
