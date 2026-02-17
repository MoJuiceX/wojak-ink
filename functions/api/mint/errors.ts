/**
 * Structured error types for the mint pipeline.
 *
 * MintError carries a typed error code that maps to user-friendly messages.
 * Used by process.ts, job.ts, cleanup.ts.
 */

export class MintError extends Error {
  constructor(
    public readonly code: MintErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'MintError';
  }
}

export type MintErrorCode =
  | 'SOLD_OUT'
  | 'INSUFFICIENT_CREDITS'
  | 'WALLET_LOCKED'
  | 'INVALID_TRAITS'
  | 'IPFS_UPLOAD_FAILED'
  | 'MINTGARDEN_FAILED'
  | 'OFFER_CREATION_FAILED'
  | 'OFFER_EXPIRED'
  | 'PAYMENT_NOT_VERIFIED'
  | 'FINALIZE_FAILED'
  | 'IMAGE_EXPIRED'
  | 'TIMEOUT'
  | 'QUEUE_TIMEOUT'
  | 'RATE_LIMITED'
  | 'CONFIG_ERROR'
  | 'SUPPLY_EXHAUSTED'
  | 'JOB_NOT_FOUND'
  | 'INTERNAL_ERROR';

export const MINT_ERROR_MESSAGES: Record<MintErrorCode, string> = {
  SOLD_OUT: 'All 4,200 Wojaks have been minted!',
  INSUFFICIENT_CREDITS: 'Not enough credits for this mint.',
  WALLET_LOCKED: 'You already have a mint in progress. Please wait for it to complete.',
  INVALID_TRAITS: 'Some trait selections are invalid. Please try different options.',
  IPFS_UPLOAD_FAILED: "Couldn't upload your artwork. Please try again in a moment.",
  MINTGARDEN_FAILED: 'The minting service is temporarily busy. Please try again.',
  OFFER_CREATION_FAILED: "Couldn't create the payment offer. Please try again.",
  OFFER_EXPIRED: 'Your payment window expired. Start a new mint to try again.',
  PAYMENT_NOT_VERIFIED: "We couldn't verify your payment on-chain yet. Try again in a moment.",
  FINALIZE_FAILED: 'Something went wrong saving your mint. Our team has been notified.',
  IMAGE_EXPIRED: 'Your session expired. Please try minting again.',
  TIMEOUT: 'Minting took too long. Please try again.',
  QUEUE_TIMEOUT: 'Job timed out in queue. Please try again.',
  RATE_LIMITED: 'The minting service is busy. Your mint is queued and will process shortly.',
  CONFIG_ERROR: 'Minting service is not properly configured. Please contact support.',
  SUPPLY_EXHAUSTED: 'All 4,200 Wojaks have been minted!',
  JOB_NOT_FOUND: 'Mint job not found.',
  INTERNAL_ERROR: 'Something unexpected happened. Please try again.',
};
