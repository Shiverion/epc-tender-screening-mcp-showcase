# Demo Transcript

This transcript is designed for ChatGPT or Claude with the MCP server connected.

## Scenario

The user uploads:

- a company profile PDF,
- a tender announcement or tender document.

## Prompt

```text
Extract text from the uploaded company profile and tender files.
Call screen_tender with tender_text and company_profile_text.
Summarize the recommendation, red flags, missing documents, and next human actions.
```

## Expected Tool Flow

1. `screen_tender`
2. Optional: `search_historical_proposals`
3. Optional: `generate_compliance_matrix` for detailed table output

## Expected Response Shape

```text
Recommendation: Management Review / No Bid / Review Further / Bid
Fit score: 0-100
Risk score: 0-100

Key red flags:
- Requirement
- Why it matters
- Evidence quote
- Action owner

Missing or verification items:
- Legal / SBU / KBLI
- Finance / bid bond
- Technical / project experience
- Procurement / vendor support

Next actions:
- Assign document owners
- Confirm eligibility
- Request missing support letters
- Send memo to management for review
```

## Example Result

For the included bad-fit marine transport fixture, the expected recommendation is:

```text
No Bid
```

Reason:

```text
The tender requires marine bunker fuel transport, vessel and crew capability, and transport/logistics KBLI codes that are not found in the example EPC company profile.
```
