const DEFAULT_BOOT_DESTINATION = '/gallery';

export interface BootSkipOptions {
  isDev: boolean;
  skipBootInDev: boolean;
  isLocalhost: boolean;
  hasSeenBoot: boolean;
  isPublicRoute: boolean;
  hasSkipBootSetting: boolean;
}

export function getBootDestination(
  pathname: string,
  search: string = '',
  hash: string = ''
): string {
  if (!pathname || pathname === '/') {
    return DEFAULT_BOOT_DESTINATION;
  }

  return `${pathname}${search}${hash}`;
}

export function shouldSkipBootSequence({
  isDev,
  skipBootInDev,
  isLocalhost,
  hasSeenBoot,
  isPublicRoute,
  hasSkipBootSetting,
}: BootSkipOptions): boolean {
  return (
    (isDev && skipBootInDev) ||
    (skipBootInDev && isLocalhost) ||
    hasSeenBoot ||
    isPublicRoute ||
    hasSkipBootSetting
  );
}

