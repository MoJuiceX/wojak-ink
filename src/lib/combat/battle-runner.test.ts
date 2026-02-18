// src/lib/combat/battle-runner.test.ts
import { describe, it, expect } from 'vitest';
import { runAutoBattle } from './battle-runner';

describe('battle-runner', () => {
  it('runs a FIRE vs WATER auto-battle to completion', () => {
    const result = runAutoBattle(
      { nftId: 'nft-a', type: 'FIRE', nature: 'Balanced', ability: 'Blaze', moves: ['poke_fire_fire-punch', 'poke_fire_flamethrower', 'poke_fire_lava-plume', 'poke_fire_ember'], level: 50 },
      { nftId: 'nft-b', type: 'WATER', nature: 'Balanced', ability: 'Torrent', moves: ['poke_water_wave-crash', 'poke_water_bubble-beam', 'poke_water_aqua-jet', 'poke_water_bouncy-bubble'], level: 50 },
    );

    expect(result.status).toBe('finished');
    expect(result.totalTurns).toBeGreaterThanOrEqual(1);
    expect(result.totalTurns).toBeLessThanOrEqual(50);
    expect(result.turns.length).toBe(result.totalTurns);
  });

  it('has a winner or null (draw)', () => {
    const result = runAutoBattle(
      { nftId: 'nft-a', type: 'FIRE', nature: 'Balanced', ability: 'Blaze', moves: ['poke_fire_fire-punch', 'poke_fire_flamethrower', 'poke_fire_lava-plume', 'poke_fire_ember'], level: 50 },
      { nftId: 'nft-b', type: 'WATER', nature: 'Balanced', ability: 'Torrent', moves: ['poke_water_wave-crash', 'poke_water_bubble-beam', 'poke_water_aqua-jet', 'poke_water_bouncy-bubble'], level: 50 },
    );

    // Winner should be one of the two NFTs or null (draw)
    expect([null, 'nft-a', 'nft-b']).toContain(result.winnerId);
  });

  it('WATER typically beats FIRE (type advantage)', () => {
    // Run 10 battles, WATER should win majority
    let waterWins = 0;
    for (let i = 0; i < 10; i++) {
      const result = runAutoBattle(
        { nftId: 'nft-a', type: 'FIRE', nature: 'Balanced', ability: 'Blaze', moves: ['poke_fire_fire-punch', 'poke_fire_flamethrower', 'poke_fire_lava-plume', 'poke_fire_ember'], level: 50 },
        { nftId: 'nft-b', type: 'WATER', nature: 'Balanced', ability: 'Torrent', moves: ['poke_water_wave-crash', 'poke_water_bubble-beam', 'poke_water_aqua-jet', 'poke_water_bouncy-bubble'], level: 50 },
      );
      if (result.winnerId === 'nft-b') waterWins++;
    }
    // Water should win at least 5 out of 10
    expect(waterWins).toBeGreaterThanOrEqual(5);
  });

  it('handles battles with identical types', () => {
    const result = runAutoBattle(
      { nftId: 'nft-a', type: 'NEUTRAL', nature: 'Balanced', ability: 'Adaptability', moves: ['poke_normal_pound', 'poke_normal_pay-day', 'poke_normal_quick-attack', 'poke_normal_supersonic'], level: 50 },
      { nftId: 'nft-b', type: 'NEUTRAL', nature: 'Balanced', ability: 'Resilience', moves: ['poke_normal_pound', 'poke_normal_pay-day', 'poke_normal_quick-attack', 'poke_normal_supersonic'], level: 50 },
    );
    expect(result.status).toBe('finished');
    expect(result.totalTurns).toBeGreaterThanOrEqual(1);
  });

  it('higher level fighter has advantage', () => {
    let highLevelWins = 0;
    for (let i = 0; i < 10; i++) {
      const result = runAutoBattle(
        { nftId: 'nft-a', type: 'FIRE', nature: 'Balanced', ability: 'Blaze', moves: ['poke_fire_fire-punch', 'poke_fire_flamethrower', 'poke_fire_lava-plume', 'poke_fire_ember'], level: 80 },
        { nftId: 'nft-b', type: 'FIRE', nature: 'Balanced', ability: 'Blaze', moves: ['poke_fire_fire-punch', 'poke_fire_flamethrower', 'poke_fire_lava-plume', 'poke_fire_ember'], level: 20 },
      );
      if (result.winnerId === 'nft-a') highLevelWins++;
    }
    expect(highLevelWins).toBeGreaterThanOrEqual(8);
  });

  it('completes within max 50 turns', () => {
    const result = runAutoBattle(
      { nftId: 'nft-a', type: 'METAL', nature: 'Balanced', ability: 'Filter', moves: ['poke_steel_iron-defense', 'poke_steel_steel-roller', 'poke_steel_bullet-punch', 'poke_steel_magnet-bomb'], level: 50 },
      { nftId: 'nft-b', type: 'METAL', nature: 'Balanced', ability: 'Heavy Metal', moves: ['poke_steel_iron-defense', 'poke_steel_steel-roller', 'poke_steel_bullet-punch', 'poke_steel_magnet-bomb'], level: 50 },
    );
    expect(result.totalTurns).toBeLessThanOrEqual(50);
    expect(result.status).toBe('finished');
  });
});
