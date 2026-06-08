import { oauthCorsHeaders, oauthJson, PUBLIC_BASE_URL } from '@/lib/oauth-shim';

export const dynamic = 'force-dynamic';

export function GET() {
  return oauthJson({
    resource: `${PUBLIC_BASE_URL}/api/mcp`,
    authorization_servers: [PUBLIC_BASE_URL],
    scopes_supported: ['mcp', 'tender:read', 'tender:screen'],
    bearer_methods_supported: ['header'],
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: oauthCorsHeaders });
}
