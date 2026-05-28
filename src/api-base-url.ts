export const DEFAULT_NATIVE_API_BASE_URL =
  "https://cozycasa-test-cyckd3afgvcchnd5.westeurope-01.azurewebsites.net";

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
  return configuredURL && configuredURL.length > 0
    ? normalizeApiBaseURL(configuredURL)
    : DEFAULT_NATIVE_API_BASE_URL;
}
