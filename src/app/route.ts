export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({
    name: 'epc-tender-screening-mcp',
    description: 'MCP server for evidence-based EPC tender screening.',
    transport: {
      streamable_http: '/api/mcp',
      stdio: 'npm run mcp:stdio',
    },
    oauth_metadata: {
      authorization_server: '/.well-known/oauth-authorization-server',
      protected_resource: '/.well-known/oauth-protected-resource',
    },
    tools: [
      'connect_company_profile_text',
      'connect_current_tender_text',
      'connect_tender_source_urls',
      'search_public_tenders',
      'get_data_status',
      'extract_tender_requirements',
      'match_company_profile',
      'generate_compliance_matrix',
      'generate_bid_no_bid_memo',
      'search_historical_proposals',
    ],
  });
}
