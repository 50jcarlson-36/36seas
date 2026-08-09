type CopyleaksResultSummary = {
  id?: string | number;
};

export async function copyleaksAccessToken() {
  const email = process.env.COPYLEAKS_EMAIL;
  const key = process.env.COPYLEAKS_API_KEY;
  if (!email || !key) throw new Error("Copyleaks credentials are not configured.");

  const response = await fetch("https://id.copyleaks.com/v3/account/login/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, key }),
  });
  if (!response.ok) throw new Error("The originality provider rejected the account credentials.");
  const auth = await response.json() as { access_token?: string };
  if (!auth.access_token) throw new Error("The originality provider did not return an access token.");
  return auth.access_token;
}

export async function requestCopyleaksResultExport(input: {
  scanId: string;
  results: CopyleaksResultSummary[];
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const secret = process.env.COPYLEAKS_WEBHOOK_SECRET;
  if (!baseUrl || !secret) throw new Error("Copyleaks callback settings are not configured.");

  const token = await copyleaksAccessToken();
  const exportId = `${input.scanId}-details`;
  const response = await fetch(`https://api.copyleaks.com/v3/downloads/${input.scanId}/export/${exportId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      completionWebhook: `${baseUrl}/api/originality/export/${input.scanId}/completed`,
      maxRetries: 3,
      developerPayload: secret,
      results: input.results
        .filter((result) => result.id !== undefined && result.id !== null)
        .map((result) => {
          const resultId = String(result.id);
          return {
            id: resultId,
            endpoint: `${baseUrl}/api/originality/export/${input.scanId}/result/${encodeURIComponent(resultId)}`,
            verb: "PUT",
            headers: [["x-36seas-originality-secret", secret]],
          };
        }),
    }),
  });

  // A repeated completed webhook may request the same deterministic export again.
  // Treat an existing export as success so provider retries remain idempotent.
  if (!response.ok && response.status !== 409) {
    const detail = await response.text();
    throw new Error(`Copyleaks result export failed (${response.status}): ${detail.slice(0, 180)}`);
  }
}

export function originalityWebhookAuthorized(request: Request, payload: Record<string, unknown>) {
  const expected = process.env.COPYLEAKS_WEBHOOK_SECRET;
  const received = request.headers.get("x-36seas-originality-secret") || payload.developerPayload;
  return !!expected && received === expected;
}
