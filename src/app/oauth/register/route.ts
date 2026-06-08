import { oauthCorsHeaders, oauthJson } from '@/lib/oauth-shim';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  return oauthJson({
    client_id: 'epc-tender-demo-client',
    client_secret: 'epc-tender-demo-secret',
    client_id_issued_at: Math.floor(Date.now() / 1000),
    token_endpoint_auth_method: body.token_endpoint_auth_method ?? 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    redirect_uris: body.redirect_uris ?? [],
    scope: 'mcp tender:read tender:screen',
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: oauthCorsHeaders });
}
