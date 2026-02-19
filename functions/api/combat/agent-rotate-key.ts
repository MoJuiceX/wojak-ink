// functions/api/combat/agent-rotate-key.ts
// POST /api/combat/agent-rotate-key — generate new API key, invalidate old one

import { jsonResponse, errorResponse, authenticateAgent, generateApiKey, hashApiKey } from './_shared';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const agent = await authenticateAgent(context.request, context.env.DB);
  if (!agent) return errorResponse('Unauthorized', 401);

  const newKey = generateApiKey();
  const newHash = await hashApiKey(newKey);

  await context.env.DB.prepare(
    'UPDATE combat_agents SET api_key_hash = ? WHERE id = ?'
  ).bind(newHash, agent.id).run();

  return jsonResponse({
    api_key: newKey,
    api_key_warning: 'Save this key now. It will not be shown again. Your old key is now invalid.',
  });
};
