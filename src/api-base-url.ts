export const DEFAULT_NATIVE_API_BASE_URL = "https://www.thecozycasa.net";

export function normalizeApiBaseURL(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function resolveApiBaseURL({
  envApiURL,
  platformOS,
  webOrigin,
}: {
  envApiURL: string | undefined;
  platformOS: string;
  webOrigin: string | undefined;
}): string | undefined {
  if (platformOS === "web") {
    return webOrigin;
  }

  const configuredURL = envApiURL?.trim();
  return normalizeApiBaseURL(
    configuredURL && configuredURL.length > 0
      ? configuredURL
      : DEFAULT_NATIVE_API_BASE_URL,
  );
}
