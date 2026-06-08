const tools = [
  ['connect_company_profile_text', 'Save uploaded company profile text as local screening context.'],
  ['connect_current_tender_text', 'Save uploaded tender text as the current tender.'],
  ['connect_tender_source_urls', 'Allowlist public tender source pages for discovery.'],
  ['search_public_tenders', 'Search explicit source URLs without crawling the whole internet.'],
  ['get_data_status', 'Show whether real local data or sample fallback is active.'],
  ['extract_tender_requirements', 'Extract admin, legal, technical, HSE, finance, procurement, schedule, and risk requirements.'],
  ['match_company_profile', 'Match requirements against company capabilities and evidence.'],
  ['generate_compliance_matrix', 'Return requirement-level status, evidence, risk, and action.'],
  ['generate_bid_no_bid_memo', 'Generate an advisory fit score, risk score, red flags, and bid/no-bid recommendation.'],
  ['search_historical_proposals', 'Search local historical proposal examples for grounding.'],
];

const workflow = [
  'Upload or connect company profile text',
  'Upload or connect tender text',
  'Extract requirements',
  'Match against company evidence',
  'Generate compliance matrix',
  'Produce bid/no-bid memo',
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#080a0f] text-zinc-100">
      <section className="border-b border-zinc-800 bg-[#0c1018]">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">MCP Server Showcase</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">EPC Tender Screening MCP</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300 md:text-lg">
              A focused Model Context Protocol server that lets AI agents screen tender documents, match company
              evidence, produce compliance matrices, and generate human-review bid/no-bid memos.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-4 font-mono text-sm text-zinc-300">
            <div className="text-zinc-500">Remote endpoint</div>
            <div className="mt-2 text-cyan-200">/api/mcp</div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-10 md:grid-cols-3">
        <div className="border border-zinc-800 bg-zinc-950 p-6">
          <div className="text-sm uppercase tracking-[0.18em] text-zinc-500">Transport</div>
          <div className="mt-3 text-2xl font-semibold text-white">HTTP + stdio</div>
          <p className="mt-3 text-sm leading-6 text-zinc-400">Use Streamable HTTP for hosted connectors or stdio for local MCP clients.</p>
        </div>
        <div className="border border-zinc-800 bg-zinc-950 p-6">
          <div className="text-sm uppercase tracking-[0.18em] text-zinc-500">Data</div>
          <div className="mt-3 text-2xl font-semibold text-white">Upload-first</div>
          <p className="mt-3 text-sm leading-6 text-zinc-400">Agents pass extracted text from uploaded profile and tender files into MCP tools.</p>
        </div>
        <div className="border border-zinc-800 bg-zinc-950 p-6">
          <div className="text-sm uppercase tracking-[0.18em] text-zinc-500">Safety</div>
          <div className="mt-3 text-2xl font-semibold text-white">Advisory only</div>
          <p className="mt-3 text-sm leading-6 text-zinc-400">Every recommendation requires tender, finance, legal, and management review.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold text-white">Workflow</h2>
            <p className="mt-2 text-sm text-zinc-400">The server separates discovery, evidence matching, and screening.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-6">
          {workflow.map((item, index) => (
            <div key={item} className="min-h-28 border border-zinc-800 bg-[#0c1018] p-4">
              <div className="mb-4 text-xs font-semibold text-cyan-300">{String(index + 1).padStart(2, '0')}</div>
              <div className="text-sm leading-5 text-zinc-200">{item}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="text-2xl font-semibold text-white">Tools</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {tools.map(([name, description]) => (
            <div key={name} className="border border-zinc-800 bg-zinc-950 p-4">
              <div className="font-mono text-sm text-cyan-200">{name}</div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10 pb-16">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="border border-zinc-800 bg-[#0c1018] p-6">
            <h2 className="text-2xl font-semibold text-white">Local Run</h2>
            <pre className="mt-5 overflow-x-auto bg-black p-4 text-sm text-zinc-300">{`npm install
npm run dev
npm run mcp:stdio`}</pre>
          </div>
          <div className="border border-zinc-800 bg-[#0c1018] p-6">
            <h2 className="text-2xl font-semibold text-white">Connector Test Prompt</h2>
            <pre className="mt-5 whitespace-pre-wrap bg-black p-4 text-sm text-zinc-300">{`Use get_data_status.
Then screen the uploaded tender against the uploaded company profile and produce a bid/no-bid memo.`}</pre>
          </div>
        </div>
      </section>
    </main>
  );
}
