import { DEMO_ACCESS_TOKEN, oauthCorsHeaders, oauthJson } from '@/lib/oauth-shim';

export const dynamic = 'force-dynamic';

async function parseTokenRequest(req: Request): Promise<Record<string, string>> {
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      return (await req.json()) as Record<string, string>;
    } catch {
      return {};
    }
  }
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(await req.text()).entries());
  }
  return {};
}

async function tokenResponse(req?: Request) {
  const body = req ? await parseTokenRequest(req) : {};
  const grantType = body.grant_type ?? 'authorization_code';
  if (!['authorization_code', 'refresh_token'].includes(grantType)) {
    return oauthJson({ error: 'unsupported_grant_type' }, { status: 400 });
  }
  return oauthJson({
    access_token: DEMO_ACCESS_TOKEN,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'epc-tender-demo-refresh',
    scope: 'mcp tender:read tender:screen',
  });
}

export async function GET() {
  return tokenResponse();
}

export async function POST(req: Request) {
  return tokenResponse(req);
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: oauthCorsHeaders });
}
