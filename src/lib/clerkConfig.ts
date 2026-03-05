const CLERK_PLACEHOLDER = 'pk_test_placeholder_no_real_key';

export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
  | string
  | undefined;

export function isValidClerkPublishableKey(
  publishableKey: string | undefined | null
): publishableKey is string {
  return (
    typeof publishableKey === 'string' &&
    publishableKey.length > 0 &&
    publishableKey !== CLERK_PLACEHOLDER &&
    (publishableKey.startsWith('pk_test_') || publishableKey.startsWith('pk_live_'))
  );
}

export const HAS_VALID_CLERK_PUBLISHABLE_KEY = isValidClerkPublishableKey(
  CLERK_PUBLISHABLE_KEY
);
