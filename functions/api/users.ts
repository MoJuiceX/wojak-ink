/**
 * Users API
 *
 * GET /api/users - List all users with display names
 * Query params: search, limit, offset
 */

import { Env } from '../types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const search = url.searchParams.get('search') || '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  try {
    // Count total
    let countQuery = 'SELECT COUNT(*) as total FROM profiles WHERE display_name IS NOT NULL';
    let dataQuery = `
      SELECT
        user_id as id,
        display_name,
        avatar_type,
        avatar_value,
        avatar_source
      FROM profiles
      WHERE display_name IS NOT NULL
    `;

    if (search) {
      const searchCondition = ` AND LOWER(display_name) LIKE ?`;
      countQuery += searchCondition;
      dataQuery += searchCondition;
    }

    dataQuery += ` ORDER BY display_name ASC LIMIT ? OFFSET ?`;

    const searchPattern = `%${search.toLowerCase()}%`;

    const countResult = search
      ? await context.env.DB.prepare(countQuery).bind(searchPattern).first<{ total: number }>()
      : await context.env.DB.prepare(countQuery).first<{ total: number }>();

    const total = countResult?.total || 0;

    const results = search
      ? await context.env.DB.prepare(dataQuery).bind(searchPattern, limit, offset).all()
      : await context.env.DB.prepare(dataQuery).bind(limit, offset).all();

    const users = (results.results || []).map((row: { id: string; display_name: string; avatar_type: string | null; avatar_value: string | null; avatar_source: string | null }) => ({
      id: row.id,
      displayName: row.display_name,
      avatar: {
        type: row.avatar_type || 'emoji',
        value: row.avatar_value || '🎮',
        source: row.avatar_source || 'default',
      },
    }));

    return new Response(JSON.stringify({
      users,
      total,
      hasMore: offset + users.length < total,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Users API] Error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
    });
  }
};
