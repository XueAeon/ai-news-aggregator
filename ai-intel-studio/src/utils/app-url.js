const baseUrl = import.meta.env.BASE_URL || '/';
const trimmedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

export const isGitHubPagesRuntime = import.meta.env.PROD && baseUrl !== '/';

export function resolveAppPath(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (isGitHubPagesRuntime) {
    return `${trimmedBaseUrl}/#${normalizedPath}`;
  }

  return normalizedPath;
}

export function toAbsoluteAppUrl(path = '/') {
  return `${window.location.origin}${resolveAppPath(path)}`;
}
