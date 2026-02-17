// Activity feed API — returns recent game events for a player.
interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const did = url.searchParams.get('did');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '5'), 50);
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0'));

  if (!did) {
    return Response.json({ error: 'DID required' }, { status: 400 });
  }

  try {
    const { results } = await env.DB.prepare(
      `SELECT id, event_type, event_data, created_at
       FROM game_activity
       WHERE did_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(did, limit, offset).all();

    const events = (results || []).map((row: Record<string, unknown>) => ({
      id: row.id,
      eventType: row.event_type,
      eventData: JSON.parse((row.event_data as string) || '{}'),
      createdAt: row.created_at,
    }));

    return Response.json({ success: true, events });
  } catch (_err) {
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
