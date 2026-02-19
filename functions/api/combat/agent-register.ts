// functions/api/combat/agent-register.ts
// POST /api/combat/agent-register — register an agent for a DID
// Returns a one-time API key (never stored in plaintext)

import {
  jsonResponse, errorResponse, isValidDid, isValidAgentName,
  isValidWebhookUrl, generateApiKey, hashApiKey, randomHex,
  buildFighterResponse,
} from './_shared';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: { ownerDid: string; name: string; webhook_url?: string };
  try {
    body = await context.request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const { ownerDid, name, webhook_url } = body;

  if (!ownerDid || !name) {
    return errorResponse('Missing required fields: ownerDid, name');
  }
  if (!isValidDid(ownerDid)) return errorResponse('Invalid DID format');
  if (!isValidAgentName(name)) {
    return errorResponse('Agent name must be 3-50 characters, alphanumeric + dash/underscore');
  }
  if (webhook_url && !isValidWebhookUrl(webhook_url)) {
    return errorResponse('Webhook URL must be HTTPS');
  }

  const db = context.env.DB;

  // Check if agent already exists for this DID
  const existing = await db.prepare(
    'SELECT id, status FROM combat_agents WHERE owner_did = ?'
  ).bind(ownerDid).first<{ id: string; status: string }>();

  if (existing && existing.status === 'active') {
    return errorResponse('Agent already exists for this DID. Retire it first to create a new one.');
  }

  // Generate credentials
  const agentId = crypto.randomUUID();
  const plaintextKey = generateApiKey();
  const keyHash = await hashApiKey(plaintextKey);
  const webhookSecret = randomHex(24);

  // Insert agent
  await db.prepare(`
    INSERT INTO combat_agents (id, owner_did, name, api_key_hash, webhook_url, webhook_secret)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(agentId, ownerDid, name, keyHash, webhook_url ?? null, webhookSecret).run();

  // Fetch fighters under this DID
  const fighters = await db.prepare(
    'SELECT * FROM combat_fighters WHERE owner_did = ? ORDER BY level DESC'
  ).bind(ownerDid).all();

  const fighterList = (fighters.results ?? []).map((row: any) => buildFighterResponse(row));

  return new Response(JSON.stringify({
    agent_id: agentId,
    name,
    api_key: plaintextKey,
    api_key_warning: 'Save this key now. It will not be shown again.',
    webhook_secret: webhookSecret,
    webhook_url: webhook_url ?? null,
    status: 'active',
    tier: 'trial',
    fighters: fighterList,
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
