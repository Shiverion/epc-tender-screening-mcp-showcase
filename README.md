# EPC Tender Screening MCP

An MCP-only server for evidence-based EPC tender screening.

This project lets MCP-compatible AI agents:

- run a full `screen_tender` workflow,
- extract tender requirements from uploaded tender text,
- match requirements against a company profile,
- generate compliance matrices,
- produce bid/no-bid advisory memos,
- search explicit public tender source URLs,
- search local historical proposal examples for grounding.

The project is designed as a clean public MCP repository. It does not include private company documents, credentials, UI pages, or production tender archives.

## Why This Exists

Tender teams spend significant time reading long procurement documents, checking eligibility, finding supporting evidence, and deciding whether to bid. This MCP server gives AI agents a structured tool layer for that workflow while keeping the final decision human-reviewed.

## Tools

| Tool | Purpose |
|---|---|
| `screen_tender` | Run the full screening workflow end to end |
| `connect_company_profile_text` | Save uploaded/extracted company profile text as local context |
| `connect_current_tender_text` | Save uploaded/extracted tender text as current tender |
| `connect_tender_source_urls` | Allowlist public tender source URLs for discovery |
| `search_public_tenders` | Search explicit source URLs without crawling the whole internet |
| `get_data_status` | Show connected data sources and fallback state |
| `extract_tender_requirements` | Extract tender requirements |
| `match_company_profile` | Match requirements against company capabilities |
| `generate_compliance_matrix` | Generate requirement-level compliance rows |
| `generate_bid_no_bid_memo` | Generate advisory fit/risk scores and recommendation |
| `search_historical_proposals` | Search local historical proposal examples |

## System Design

### Requirements

**Functional**
- Expose requirement extraction, company matching, compliance matrices, advisory bid/no-bid memos, and the end-to-end `screen_tender` workflow to MCP clients.
- Support local stdio clients and remote Streamable HTTP connectors.

**Non-functional**
- Attach an evidence trace to compliance rows and keep fixture-based evals deterministic.
- Restrict discovery to configured public tender URLs and require human review of recommendations.

### High-Level Architecture

```text
MCP client → stdio transport ─┐
            HTTP /api/mcp ────┴→ MCP server
                                  ├→ connected tender/profile text
                                  ├→ allowlisted public sources
                                  ├→ local JSON proposal examples
                                  └→ screen_tender → matrix + advisory memo
OAuth-compatible connector routes: /oauth/* and /.well-known/*
```

The source currently registers **11 MCP tools**, including `screen_tender`. Connector routes provide OAuth-compatible metadata and demo flows; production deployments should configure real authorization.

### Data Model / API Contract

| Interface | Contract |
| --- | --- |
| MCP tools | Text/JSON inputs and structured screening results from `src/mcp/server.ts` |
| HTTP transport | Streamable MCP at `/api/mcp` |
| Local transport | `npm run mcp:stdio` |
| Local context | Example and local JSON/Markdown files under `data/` |

### Scale and Reliability

- Public tender search fetches configured sources, blocks common private-host forms, applies a 12-second timeout, and caps response text at 1 MB.
- The workflow is synchronous and file-backed; no shared database or job queue is configured.
- GitHub Actions runs install, lint, build, and deterministic MCP evals. The current workflow does not run `npm audit`.

### Trade-offs

| Decision | Benefit | Cost |
| --- | --- | --- |
| One MCP workflow orchestrates screening | Clients get one consistent end-to-end operation | A request depends on each parsing and source step completing |
| File-backed showcase context | Easy to inspect and replace for a demo | Not shared across server instances |

### What to Revisit as It Grows

- Validate resolved IP addresses as well as host strings before fetching public sources.
- Add `npm audit` to CI alongside lint, build, and evals.
- Replace demo OAuth behavior with per-user authorization and shared storage.

## Quick Start

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

The root URL returns JSON metadata only. There is no UI.

The Streamable HTTP MCP endpoint is:

```text
http://localhost:3000/api/mcp
```

The root URL returns JSON metadata only:

```bash
curl http://localhost:3000
```

For local connector testing without auth:

```bash
MCP_REQUIRE_AUTH=false npm run dev
```

On Windows PowerShell:

```powershell
$env:MCP_REQUIRE_AUTH="false"
npm run dev
```

## Stdio MCP

```bash
npm run mcp:stdio
```

Example Claude Desktop style config:

```json
{
  "mcpServers": {
    "epc-tender-screening": {
      "command": "npm",
      "args": ["run", "mcp:stdio"],
      "cwd": "/absolute/path/to/epc-tender-screening-mcp-showcase"
    }
  }
}
```

## Remote Connector Auth

The repo includes a demo OAuth shim for hosted connector experiments.

Set:

```bash
MCP_PUBLIC_BASE_URL=https://your-domain.example
MCP_API_KEY=replace-this-token
```

Connector values:

```text
MCP URL: https://your-domain.example/api/mcp
Authorization URL: https://your-domain.example/oauth/authorize
Token URL: https://your-domain.example/oauth/token
Client ID: epc-tender-demo-client
Client Secret: epc-tender-demo-secret
Scope: mcp tender:read tender:screen
```

For production, replace the demo OAuth shim with real OAuth and per-user authorization.

Demo token auth is disabled by default in production. For temporary hosted demos only, set:

```bash
MCP_ALLOW_DEMO_AUTH=true
MCP_DEMO_ACCESS_TOKEN=replace-this-demo-token
```

Do not use the default demo token for a public deployment.

## ChatGPT Upload Workflow

Upload company profile and tender files to ChatGPT, then ask:

```text
Extract text from the uploaded company profile and tender files.
Call screen_tender with tender_text and company_profile_text.
Summarize the recommendation, red flags, missing documents, and next human actions.
```

For one-shot analysis without saving:

```text
Extract text from both uploaded files, then call generate_bid_no_bid_memo with tender_text and company_profile_text.
```

## Public Tender Discovery

This project does not crawl the open internet. It searches explicit sources only.

```text
connect_tender_source_urls
search_public_tenders
```

Use `search_public_tenders` for discovery leads only. Upload or connect the actual tender document before screening.

## Data Files

Safe example files:

```text
data/company-profile.example.json
data/sample-tender.md
data/historical-proposals.example.json
```

Private local files are ignored by git:

```text
data/company-profile.local.json
data/current-tender.local.md
data/tender-sources.local.json
```

Example fallback is disabled by default. To demo with bundled example files:

```bash
MCP_ALLOW_EXAMPLE_FALLBACK=true npm run dev
```

On Windows PowerShell:

```powershell
$env:MCP_ALLOW_EXAMPLE_FALLBACK="true"
npm run dev
```

## Safety

The bid/no-bid memo is advisory only. Every output should be reviewed by tender, finance, legal, HSE, and management owners before submission.

Do not use this project to automatically submit tenders or make binding commercial decisions.

## Development

```bash
npm run lint
npm run build
npm run eval
```

The eval suite runs through the real MCP stdio transport and checks tool exposure, safe failure behavior, screening outputs, and evidence traces.

## Docs

- [Architecture](docs/architecture.md)
- [Demo transcript](docs/demo-transcript.md)
- [Evals](docs/evals.md)

## CI

GitHub Actions runs:

```text
npm ci
npm run lint
npm run build
npm run eval
```

## License

MIT
