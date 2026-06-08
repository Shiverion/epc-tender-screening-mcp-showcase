# Architecture

```mermaid
flowchart LR
    Agent["ChatGPT / Claude / MCP Client"] --> Transport["MCP Transport"]
    Transport --> HTTP["Streamable HTTP /api/mcp"]
    Transport --> Stdio["stdio npm run mcp:stdio"]
    HTTP --> Server["EPC Tender Screening MCP"]
    Stdio --> Server
    Server --> Upload["Uploaded Text Context"]
    Server --> Sources["Allowlisted Tender Sources"]
    Server --> Archive["Historical Proposal JSON"]
    Server --> Screening["Screening Engine"]
    Screening --> Matrix["Compliance Matrix"]
    Screening --> Memo["Bid / No-Bid Memo"]
    Matrix --> Review["Human Review"]
    Memo --> Review
```

## Design Principles

- MCP-first: the core product is the tool layer, not a web UI.
- Upload-first: agents extract text from files and pass it to MCP tools.
- Source-controlled discovery: public tender search only uses explicit source URLs.
- Deterministic evals: sample fixtures are checked through the real MCP stdio transport.
- Human review: outputs are advisory and require tender, legal, finance, and management review.

## Runtime Modes

| Mode | Command / URL | Purpose |
|---|---|---|
| stdio | `npm run mcp:stdio` | Local MCP clients |
| HTTP | `/api/mcp` | Hosted custom connectors |
| OAuth demo | `/oauth/*` and `/.well-known/*` | Connector registration experiments |
