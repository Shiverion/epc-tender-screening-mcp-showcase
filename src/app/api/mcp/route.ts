import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { ALLOW_DEMO_AUTH, DEMO_ACCESS_TOKEN, PUBLIC_BASE_URL } from '@/lib/oauth-shim';
import { createEpcTenderMcpServer } from '@/mcp/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Last-Event-ID, mcp-protocol-version, mcp-session-id',
  'Access-Control-Expose-Headers': 'mcp-protocol-version, mcp-session-id',
  'WWW-Authenticate': `Bearer resource_metadata="${PUBLIC_BASE_URL}/.well-known/oauth-protected-resource"`,
};

function isAuthorized(req: Request): boolean {
  if (process.env.MCP_REQUIRE_AUTH === 'false') return true;
  const authHeader = req.headers.get('authorization');
  const expected = process.env.MCP_API_KEY;
  return Boolean(
    (expected && authHeader === `Bearer ${expected}`) ||
      (ALLOW_DEMO_AUTH && authHeader === `Bearer ${DEMO_ACCESS_TOKEN}`)
  );
}

async function handleMcpRequest(req: Request) {
  if (!isAuthorized(req)) {
    return Response.json(
      {
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Unauthorized' },
        id: null,
      },
      { status: 401, headers: corsHeaders }
    );
  }

  const server = createEpcTenderMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);
  const response = await transport.handleRequest(req);
  await server.close();

  for (const [key, value] of Object.entries(corsHeaders)) response.headers.set(key, value);
  return response;
}

export async function GET(req: Request) {
  return handleMcpRequest(req);
}

export async function POST(req: Request) {
  return handleMcpRequest(req);
}

export async function DELETE(req: Request) {
  return handleMcpRequest(req);
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
