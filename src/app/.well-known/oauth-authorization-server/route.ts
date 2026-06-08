import { oauthCorsHeaders, oauthJson, PUBLIC_BASE_URL } from '@/lib/oauth-shim';

export const dynamic = 'force-dynamic';

export function GET() {
  return oauthJson({
    issuer: PUBLIC_BASE_URL,
    authorization_endpoint: `${PUBLIC_BASE_URL}/oauth/authorize`,
    token_endpoint: `${PUBLIC_BASE_URL}/oauth/token`,
    registration_endpoint: `${PUBLIC_BASE_URL}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
    code_challenge_methods_supported: ['S256', 'plain'],
    scopes_supported: ['mcp', 'tender:read', 'tender:screen'],
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: oauthCorsHeaders });
}
