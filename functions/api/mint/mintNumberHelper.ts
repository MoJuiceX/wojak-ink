/**
 * Atomic Mint Number Helper
 *
 * Provides race-condition-free sequential numbering for mints using
 * UPDATE...RETURNING which is atomic in SQLite/D1.
 */

/**
 * Get next mint number atomically
 *
 * Uses UPDATE...RETURNING to atomically increment and return the counter.
 * This prevents race conditions where multiple concurrent mints could get
 * the same number.
 *
 * @returns The next available mint number (1, 2, 3, ...)
 */
export async function getNextMintNumber(db: D1Database): Promise<number> {
  // Atomic increment: UPDATE and return the OLD value (before increment)
  // This ensures each caller gets a unique sequential number
  const result = await db
    .prepare(
      `UPDATE mint_counter
       SET next_number = next_number + 1
       WHERE id = 1
       RETURNING next_number - 1 AS mint_number`
    )
    .first<{ mint_number: number }>();

  if (!result || result.mint_number == null) {
    throw new Error('Failed to get next mint number from counter');
  }

  return result.mint_number;
}
