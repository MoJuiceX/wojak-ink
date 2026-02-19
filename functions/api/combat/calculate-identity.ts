// functions/api/combat/calculate-identity.ts
// POST /api/combat/calculate-identity — preview combat identity from generator traits
// No auth required (used before mint)

import { jsonResponse, errorResponse } from './_shared';
import { calculateCombatIdentity } from '../../../src/lib/combat/identity-calculator';
import { getMovePoolForType } from '../../../src/lib/combat/data/moves';
import type { CombatType } from '../../../src/lib/combat/types';

export const onRequestPost: PagesFunction = async (context) => {
  try {
    let body: { traits: { traitId: string; layer: string }[]; colors: Record<string, string>; details: Record<string, string> };
    try {
      body = await context.request.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    const { traits, colors, details } = body;

    if (!traits || !Array.isArray(traits) || traits.length === 0) {
      return errorResponse('Missing or empty traits array');
    }

    const identity = calculateCombatIdentity({ traits, colors: colors ?? {}, details: details ?? {} });

    const availableMoves = getMovePoolForType(identity.type as CombatType).map((m) => ({
      id: m.id,
      name: m.name,
      power: m.power,
      accuracy: m.accuracy,
      category: m.category,
      description: m.description,
    }));

    return jsonResponse({
      type: identity.type,
      nature: identity.nature,
      ability: identity.ability,
      typeScores: identity.typeScores,
      statScores: identity.statScores,
      availableMoves,
    });
  } catch (error) {
    console.error('[api/combat/calculate-identity] Unhandled error:', error);
    return Response.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
};
