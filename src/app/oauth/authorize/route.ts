import { buildAuthorizeRedirect, oauthCorsHeaders } from '@/lib/oauth-shim';

export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  return buildAuthorizeRedirect(req);
}

export async function POST(req: Request) {
  return buildAuthorizeRedirect(req);
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: oauthCorsHeaders });
}
