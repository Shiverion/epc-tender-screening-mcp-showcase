export const PUBLIC_BASE_URL = process.env.MCP_PUBLIC_BASE_URL ?? 'http://localhost:3000';
export const DEMO_ACCESS_TOKEN = process.env.MCP_DEMO_ACCESS_TOKEN ?? 'epc-tender-demo-token';

export const oauthCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

export function oauthJson(body: Record<string, unknown>, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: {
      ...oauthCorsHeaders,
      ...(init?.headers ?? {}),
    },
  });
}

export function buildAuthorizeRedirect(req: Request): Response {
  const url = new URL(req.url);
  const redirectUri = url.searchParams.get('redirect_uri');
  const state = url.searchParams.get('state');

  if (!redirectUri) {
    return oauthJson({ error: 'invalid_request', error_description: 'Missing redirect_uri' }, { status: 400 });
  }

  const target = new URL(redirectUri);
  target.searchParams.set('code', 'epc-tender-demo-code');
  if (state) target.searchParams.set('state', state);
  return Response.redirect(target, 302);
}
