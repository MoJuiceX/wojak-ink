/**
 * Atomic Mint Number Helper
 *
 * Provides race-condition-free sequential numbering for mints using
 * UPDATE...RETURNING which is atomic in SQLite/D1.
 *
 * SECURITY: Supply cap is enforced atomically in the WHERE clause.
 * If next_number > supplyTotal, the UPDATE matches 0 rows and
 * RETURNING yields null — the function throws SUPPLY_EXHAUSTED.
 * This prevents concurrent requests from exceeding the supply cap.
 */

/**
 * Get next mint number atomically, enforcing supply cap.
 *
 * Uses UPDATE...RETURNING to atomically increment and return the counter.
 * The WHERE clause rejects increments beyond supplyTotal, making the
 * supply check and reservation a single atomic operation.
 *
 * @param db - D1 database instance
 * @param supplyTotal - Maximum allowed mint number (e.g. 4200)
 * @returns The next available mint number (1, 2, 3, ...)
 * @throws Error with message 'SUPPLY_EXHAUSTED' if supply cap reached
 */
export async function getNextMintNumber(db: D1Database, supplyTotal: number): Promise<number> {
  // Atomic increment with supply cap: WHERE next_number <= supplyTotal
  // ensures no number above the cap is ever issued, even under concurrency.
  const result = await db
    .prepare(
      `UPDATE mint_counter
       SET next_number = next_number + 1
       WHERE id = 1 AND next_number <= ?
       RETURNING next_number - 1 AS mint_number`
    )
    .bind(supplyTotal)
    .first<{ mint_number: number }>();

  if (!result || result.mint_number == null) {
    throw new Error('SUPPLY_EXHAUSTED');
  }

  return result.mint_number;
}
