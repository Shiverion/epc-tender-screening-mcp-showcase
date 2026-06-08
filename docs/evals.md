# Evals

The repository includes deterministic MCP evals that run through the real stdio transport.

```bash
npm run eval
```

## Cases

| Case | Purpose | Expected |
|---|---|---|
| `good-fit-epc` | EPC scope with one vendor support gap | `Management Review` |
| `bad-fit-marine-transport` | Marine transport tender against EPC profile | `No Bid` |
| `management-review-admin-heavy` | Admin/legal heavy tender with verification items | `Review Further` |

## What The Eval Checks

- Required tools are exposed.
- `screen_tender` fails safely without connected or provided data.
- Public tender search does not crawl without source URLs.
- Fixture recommendations match expected policy.
- Risk and fit scores meet bounds.
- Required red flags and verification items are present.
- Every compliance matrix row includes `evidence_trace`.

## Why This Matters

MCP demos are easy to fake with happy paths. These evals show that the server has explicit failure behavior, deterministic fixtures, and regression checks for tool contracts.
