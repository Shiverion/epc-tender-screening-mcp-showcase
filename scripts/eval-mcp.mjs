import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const root = process.cwd();
const cases = JSON.parse(await readFile(resolve(root, 'evals/cases.json'), 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function textOf(result) {
  return result.content?.[0]?.text ?? '{}';
}

function includesAny(rows, substrings) {
  const haystack = JSON.stringify(rows).toLowerCase();
  return substrings.every((substring) => haystack.includes(String(substring).toLowerCase()));
}

const client = new Client({ name: 'epc-mcp-eval', version: '0.0.1' });
const transport = new StdioClientTransport({
  command: 'npm',
  args: ['run', 'mcp:stdio'],
  cwd: root,
  env: { ...process.env, MCP_ALLOW_EXAMPLE_FALLBACK: 'false' },
});

await client.connect(transport);

try {
  const tools = await client.listTools();
  const toolNames = tools.tools.map((tool) => tool.name);
  const requiredTools = [
    'screen_tender',
    'extract_tender_requirements',
    'match_company_profile',
    'generate_compliance_matrix',
    'generate_bid_no_bid_memo',
    'search_public_tenders',
  ];
  for (const toolName of requiredTools) {
    assert(toolNames.includes(toolName), `Missing expected tool: ${toolName}`);
  }

  const missingDataResult = await client.callTool({ name: 'screen_tender', arguments: {} });
  assert(missingDataResult.isError === true, 'screen_tender without connected data should fail safely');

  const searchResult = await client.callTool({
    name: 'search_public_tenders',
    arguments: { query: 'piping EPC Balikpapan', limit: 5 },
  });
  const search = JSON.parse(textOf(searchResult));
  assert(search.count === 0, 'search_public_tenders should not crawl without source URLs');
  assert(String(search.note).includes('No public tender sources'), 'search_public_tenders should explain missing sources');

  const blockedSourceResult = await client.callTool({
    name: 'search_public_tenders',
    arguments: {
      query: 'internal metadata',
      source_urls: ['http://localhost:3000/secret', 'http://127.0.0.1:3000/secret'],
      limit: 5,
    },
  });
  const blockedSource = JSON.parse(textOf(blockedSourceResult));
  assert(blockedSource.count === 0, 'blocked local source URLs should return no results');
  assert(
    JSON.stringify(blockedSource.warnings).includes('Invalid or blocked URL'),
    'blocked local source URLs should produce an explicit warning'
  );

  const results = [];
  for (const testCase of cases) {
    const companyProfileText = await readFile(resolve(root, testCase.companyProfilePath), 'utf8');
    const tenderText = await readFile(resolve(root, testCase.tenderPath), 'utf8');
    const result = await client.callTool({
      name: 'screen_tender',
      arguments: {
        tender_text: tenderText,
        company_profile_text: companyProfileText,
        historical_search_query: tenderText.split(/\r?\n/).slice(0, 8).join(' '),
      },
    });
    assert(!result.isError, `${testCase.name}: screen_tender returned tool error`);
    const payload = JSON.parse(textOf(result));
    assert(payload.bid_no_bid_memo.recommendation === testCase.expectedRecommendation, `${testCase.name}: expected ${testCase.expectedRecommendation}, got ${payload.bid_no_bid_memo.recommendation}`);
    if (testCase.minRiskScore !== undefined) {
      assert(payload.summary.risk_score >= testCase.minRiskScore, `${testCase.name}: risk score ${payload.summary.risk_score} below ${testCase.minRiskScore}`);
    }
    if (testCase.maxRiskScore !== undefined) {
      assert(payload.summary.risk_score <= testCase.maxRiskScore, `${testCase.name}: risk score ${payload.summary.risk_score} above ${testCase.maxRiskScore}`);
    }
    if (testCase.minFitScore !== undefined) {
      assert(payload.summary.fit_score >= testCase.minFitScore, `${testCase.name}: fit score ${payload.summary.fit_score} below ${testCase.minFitScore}`);
    }
    if (testCase.requiredRedFlagSubstrings) {
      assert(includesAny(payload.bid_no_bid_memo.red_flags, testCase.requiredRedFlagSubstrings), `${testCase.name}: required red flag substrings missing`);
    }
    if (testCase.requiredVerificationSubstrings) {
      assert(includesAny(payload.bid_no_bid_memo.verification_items, testCase.requiredVerificationSubstrings), `${testCase.name}: required verification substrings missing`);
    }
    assert(payload.compliance_matrix.every((row) => row.evidence_trace), `${testCase.name}: compliance row missing evidence_trace`);
    results.push({
      name: testCase.name,
      recommendation: payload.bid_no_bid_memo.recommendation,
      fit_score: payload.summary.fit_score,
      risk_score: payload.summary.risk_score,
      requirements: payload.summary.total_requirements,
    });
  }

  console.log(JSON.stringify({ passed: true, cases: results }, null, 2));
} finally {
  await client.close();
}
