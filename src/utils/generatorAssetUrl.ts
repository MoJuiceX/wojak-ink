const ABSOLUTE_URL_RE = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

export function resolveGeneratorAssetUrl(file: string, basePath: string): string {
  if (!file) return file;
  if (file.startsWith('/') || ABSOLUTE_URL_RE.test(file)) return file;

  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
  const baseUrl = ABSOLUTE_URL_RE.test(normalizedBase)
    ? new URL(normalizedBase)
    : new URL(normalizedBase, 'https://generator.local');
  const resolved = new URL(file, baseUrl);

  if (baseUrl.origin === 'https://generator.local') {
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  }

  return resolved.toString();
}
