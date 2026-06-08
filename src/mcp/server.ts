#!/usr/bin/env node

import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod/v4';

type RequirementCategory =
  | 'administrative'
  | 'legal'
  | 'technical'
  | 'hse'
  | 'financial'
  | 'procurement'
  | 'schedule'
  | 'risk';

type ComplianceStatus = 'available' | 'partial' | 'missing' | 'needs_verification';
type RiskLevel = 'low' | 'medium' | 'high';

interface Requirement {
  id: string;
  category: RequirementCategory;
  requirement: string;
  evidence: string;
}

interface ComplianceRow extends Requirement {
  status: ComplianceStatus;
  risk: RiskLevel;
  action: string;
  matchedEvidence: string;
}

interface ProfileItem {
  name: string;
  status: ComplianceStatus | string;
  evidence?: string;
}

interface CompanyProfile {
  company_name?: string;
  business_lines?: string[];
  legal_documents?: ProfileItem[];
  certifications?: ProfileItem[];
  project_experience?: {
    title: string;
    scope?: string[];
    location?: string;
    evidence?: string;
  }[];
  hse_capabilities?: string[];
  financial_capabilities?: ProfileItem[];
  kbli_registered?: string[];
  known_gaps?: string[];
  raw_evidence_text?: string;
}

interface TenderSource {
  name: string;
  url: string;
  type?: 'html' | 'text' | 'rss' | 'pdf' | 'unknown';
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const sampleTenderPath = path.join(repoRoot, 'data/sample-tender.md');
const sampleProfilePath = path.join(repoRoot, 'data/company-profile.example.json');
const sampleHistoricalPath = path.join(repoRoot, 'data/historical-proposals.example.json');
const localTenderPath = path.join(repoRoot, 'data/current-tender.local.md');
const localProfilePath = path.join(repoRoot, 'data/company-profile.local.json');
const localTenderSourcesPath = path.join(repoRoot, 'data/tender-sources.local.json');
const allowExampleFallback = process.env.MCP_ALLOW_EXAMPLE_FALLBACK === 'true';

function textResult(value: Record<string, unknown>) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
    structuredContent: value,
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function configuredPath(envName: string, fallbackPath: string): string {
  const value = process.env[envName]?.trim();
  return value ? path.resolve(value) : fallbackPath;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9% ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter((line) => line.length > 3)
    .filter((line) => !/^source:/i.test(line))
    .filter((line) => !/^#{1,3}\s+page\s+\d+/i.test(line))
    .filter((line) => !/^\d+\.\s*:?\s*$/.test(line))
    .filter((line) => !/^[:.]+$/.test(line));
}

function extractKbliCodes(text: string): string[] {
  return Array.from(new Set(Array.from(text.matchAll(/\b\d{5}\b/g)).map((match) => match[0])));
}

function inferCompanyName(text: string): string {
  const match = text.match(/PT\.?\s+[A-Z0-9][A-Z0-9\s&.,-]{5,80}/i);
  return match?.[0].replace(/\s+/g, ' ').trim() ?? 'Uploaded company profile';
}

function textHas(text: string, pattern: RegExp): boolean {
  return pattern.test(text.toLowerCase());
}

function companyProfileFromText(profileText: string): CompanyProfile {
  const lower = profileText.toLowerCase();
  const serviceKeywords = [
    'epc',
    'procurement',
    'project management',
    'fabrication',
    'piping',
    'pipeline',
    'mechanical',
    'electrical',
    'inspection',
    'testing',
    'painting',
    'coating',
    'civil construction',
    'transportir',
    'angkutan',
    'kapal',
    'bunker',
  ];
  const lines = splitLines(profileText);
  const projectLines = lines.filter((line) =>
    /project|proyek|pekerjaan|kontrak|purchase|installation|fabrication|pipeline|pertamina|pengadaan/i.test(line)
  );

  return {
    company_name: inferCompanyName(profileText),
    business_lines: serviceKeywords.filter((keyword) => lower.includes(keyword)),
    legal_documents: [
      {
        name: 'NIB',
        status: textHas(profileText, /\bnib\b/) ? 'available' : 'needs_verification',
        evidence: textHas(profileText, /\bnib\b/) ? 'Found in uploaded profile text.' : 'Not found in uploaded profile text.',
      },
      {
        name: 'NPWP',
        status: textHas(profileText, /\bnpwp\b/) ? 'available' : 'needs_verification',
        evidence: textHas(profileText, /\bnpwp\b/) ? 'Found in uploaded profile text.' : 'Not found in uploaded profile text.',
      },
      {
        name: 'AHU',
        status: textHas(profileText, /\bahu\b/) ? 'available' : 'needs_verification',
        evidence: textHas(profileText, /\bahu\b/) ? 'Found in uploaded profile text.' : 'Not found in uploaded profile text.',
      },
    ],
    certifications: [
      {
        name: 'SBU Konstruksi',
        status: textHas(profileText, /\bsbu\b/) ? 'available' : 'needs_verification',
        evidence: textHas(profileText, /\bsbu\b/) ? 'Found in uploaded profile text.' : 'Verify exact SBU classification.',
      },
      {
        name: 'ISO 9001',
        status: textHas(profileText, /iso\s*9001/) ? 'available' : 'needs_verification',
        evidence: textHas(profileText, /iso\s*9001/) ? 'Found in uploaded profile text.' : 'Verify ISO certificate file.',
      },
      {
        name: 'ISO 45001',
        status: textHas(profileText, /iso\s*45001/) ? 'available' : 'needs_verification',
        evidence: textHas(profileText, /iso\s*45001/) ? 'Found in uploaded profile text.' : 'Verify ISO certificate file.',
      },
      {
        name: 'SMK3',
        status: textHas(profileText, /\bsmk3\b/) ? 'available' : 'needs_verification',
        evidence: textHas(profileText, /\bsmk3\b/) ? 'Found in uploaded profile text.' : 'Verify SMK3/HSE evidence.',
      },
    ],
    kbli_registered: extractKbliCodes(profileText),
    project_experience: projectLines.slice(0, 20).map((line) => ({
      title: line,
      scope: serviceKeywords.filter((keyword) => line.toLowerCase().includes(keyword)),
      evidence: 'Uploaded company profile text.',
    })),
    hse_capabilities: ['HSE plan', 'JSA', 'toolbox meeting', 'permit to work'].filter((item) =>
      lower.includes(item.toLowerCase())
    ),
    financial_capabilities: [
      {
        name: 'bid bond',
        status: textHas(profileText, /bid bond|jaminan penawaran|bank guarantee/) ? 'available' : 'needs_bank_confirmation',
        evidence: 'Bid bond and bank guarantee must be confirmed per tender.',
      },
    ],
    known_gaps: [
      'Profile text was parsed heuristically. Human verification is required for legal, SBU, ISO, SMK3, KBLI, and finance evidence.',
    ],
    raw_evidence_text: profileText.slice(0, 50000),
  };
}

async function loadTender(tenderText?: string) {
  if (tenderText?.trim()) return { text: tenderText, source: 'request_input' };

  const configuredTenderPath = configuredPath('MCP_TENDER_TEXT_PATH', localTenderPath);
  if (await fileExists(configuredTenderPath)) {
    return { text: await readFile(configuredTenderPath, 'utf8'), source: configuredTenderPath };
  }

  if (!allowExampleFallback) {
    throw new Error('No tender text connected. Provide tender_text, create data/current-tender.local.md, or set MCP_TENDER_TEXT_PATH.');
  }

  return { text: await readFile(sampleTenderPath, 'utf8'), source: `${sampleTenderPath} (example fallback)` };
}

async function loadCompanyProfile(profileJson?: string, profileText?: string) {
  if (profileJson?.trim()) return { profile: JSON.parse(profileJson) as CompanyProfile, source: 'request_input_json' };
  if (profileText?.trim()) return { profile: companyProfileFromText(profileText), source: 'request_input_text' };

  const configuredProfilePath = configuredPath('MCP_COMPANY_PROFILE_PATH', localProfilePath);
  if (await fileExists(configuredProfilePath)) {
    return { profile: JSON.parse(await readFile(configuredProfilePath, 'utf8')) as CompanyProfile, source: configuredProfilePath };
  }

  if (!allowExampleFallback) {
    throw new Error('No company profile connected. Provide company_profile_text/json, create data/company-profile.local.json, or set MCP_COMPANY_PROFILE_PATH.');
  }

  return {
    profile: JSON.parse(await readFile(sampleProfilePath, 'utf8')) as CompanyProfile,
    source: `${sampleProfilePath} (example fallback)`,
  };
}

function categoryFromHeading(heading: string): RequirementCategory | null {
  const lower = heading.toLowerCase();
  if (lower.includes('administrative')) return 'administrative';
  if (lower.includes('legal') || lower.includes('certification')) return 'legal';
  if (lower.includes('technical')) return 'technical';
  if (lower.includes('hse')) return 'hse';
  if (lower.includes('financial')) return 'financial';
  if (lower.includes('procurement')) return 'procurement';
  if (lower.includes('date')) return 'schedule';
  if (lower.includes('risk')) return 'risk';
  return null;
}

function inferCategory(line: string): RequirementCategory {
  const lower = line.toLowerCase();
  if (/(nib|npwp|pakta|administr|surat pernyataan)/.test(lower)) return 'administrative';
  if (/(sbu|legal|iso|cert|smk3|kbli|klbi|kbup|golongan usaha|usaha besar)/.test(lower)) return 'legal';
  if (/(hse|safety|jsa|toolbox|permit)/.test(lower)) return 'hse';
  if (/(jaminan|keuangan|financial|bank|bond|laporan keuangan|tkdn)/.test(lower)) return 'financial';
  if (/(vendor|material|lead time|procurement|dokumen prakualifikasi|smart gep|kapal|crew|transportir|angkutan|bunker|bbm)/.test(lower)) return 'procurement';
  if (/(aanwijzing|batas|deadline|tanggal|date)/.test(lower)) return 'schedule';
  if (/(risk|risiko|ketat|wajib|harus sesuai)/.test(lower)) return 'risk';
  return 'technical';
}

function extractTenderRequirements(tenderText: string): Requirement[] {
  const requirements: Requirement[] = [];
  let currentCategory: RequirementCategory | null = null;

  for (const rawLine of splitLines(tenderText)) {
    const headingMatch = rawLine.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      currentCategory = categoryFromHeading(headingMatch[1]) ?? currentCategory;
      continue;
    }

    const looksLikeRequirement =
      /nib|npwp|sbu|iso|smk3|pengalaman|metode|jadwal|jaminan|vendor|lead time|aanwijzing|batas|risk|risiko|kbli|klbi|kbup|tkdn|kapal|crew|transportir|angkutan|bunker|bbm|usaha besar|dokumen prakualifikasi|smart gep|pendaftaran|penyampaian|gratifikasi|pedoman pengadaan|nomor tender|judul tender|lingkup kerja/i.test(rawLine) ||
      /\b\d{5}(?:,\s*\d{5})+\b/.test(rawLine);

    if (!looksLikeRequirement) continue;
    requirements.push({
      id: `REQ-${String(requirements.length + 1).padStart(3, '0')}`,
      category: currentCategory ?? inferCategory(rawLine),
      requirement: rawLine.replace(/\.$/, ''),
      evidence: rawLine,
    });
  }

  return requirements;
}

function findProfileEvidence(requirement: Requirement, profile: CompanyProfile): string {
  const req = normalize(requirement.requirement);
  const allItems = [
    ...(profile.legal_documents ?? []),
    ...(profile.certifications ?? []),
    ...(profile.financial_capabilities ?? []),
  ];

  for (const item of allItems) {
    const itemName = normalize(item.name);
    if (req.includes(itemName) || itemName.includes(req)) return `${item.name}: ${item.evidence ?? item.status}`;
  }

  for (const project of profile.project_experience ?? []) {
    const scope = (project.scope ?? []).map(normalize);
    if (scope.some((item) => req.includes(item) || item.includes(req))) {
      return `${project.title}: ${project.evidence ?? 'project experience'}`;
    }
  }

  return '';
}

function evaluateRequirement(requirement: Requirement, profile: CompanyProfile): ComplianceRow {
  const req = normalize(requirement.requirement);
  const profileText = JSON.stringify(profile).toLowerCase();
  const matchedEvidence = findProfileEvidence(requirement, profile);
  const hasMatch = Boolean(matchedEvidence) || req.split(' ').some((word) => word.length > 4 && profileText.includes(word));
  const requiredKbliCodes = Array.from(requirement.requirement.matchAll(/\b\d{5}\b/g)).map((match) => match[0]);
  const registeredKbli = new Set((profile.kbli_registered ?? []).map(String));
  const hasUnmatchedKbli = requiredKbliCodes.length > 0 && requiredKbliCodes.every((code) => !registeredKbli.has(code));

  if (/kbli|klbi|kbup/.test(req) || hasUnmatchedKbli) {
    return {
      ...requirement,
      status: hasUnmatchedKbli ? 'missing' : 'needs_verification',
      risk: 'high',
      action: 'Verify exact KBLI/KLBI/KBUP eligibility against official registration before qualification submission.',
      matchedEvidence: hasUnmatchedKbli
        ? `Required KBLI codes not found in profile: ${requiredKbliCodes.join(', ')}`
        : 'KBLI eligibility must be verified.',
    };
  }

  if (/kapal|crew kapal|transportir|angkutan bbm|bunker bbm/.test(req)) {
    return {
      ...requirement,
      status: hasMatch ? 'needs_verification' : 'missing',
      risk: 'high',
      action: 'Confirm transport license, asset availability, crew certification, and operational permits.',
      matchedEvidence: matchedEvidence || 'No direct transport capability evidence found in company profile.',
    };
  }

  if (/vendor|surat dukungan/.test(req)) {
    return {
      ...requirement,
      status: 'missing',
      risk: 'high',
      action: 'Request vendor support letter and lead time confirmation.',
      matchedEvidence: 'Project-specific document required.',
    };
  }

  if (/jaminan|bid bond|bank/.test(req)) {
    return {
      ...requirement,
      status: 'needs_verification',
      risk: 'medium',
      action: 'Ask finance to confirm guarantee amount and bank issuance timeline.',
      matchedEvidence: matchedEvidence || 'Finance confirmation required.',
    };
  }

  if (hasMatch) {
    return {
      ...requirement,
      status: matchedEvidence.toLowerCase().includes('verify') || matchedEvidence.toLowerCase().includes('needs') ? 'needs_verification' : 'available',
      risk: 'low',
      action: 'Attach evidence and confirm validity date.',
      matchedEvidence: matchedEvidence || 'Matched against company profile.',
    };
  }

  return {
    ...requirement,
    status: 'partial',
    risk: 'medium',
    action: 'Assign owner to verify evidence or prepare missing document.',
    matchedEvidence: 'No direct evidence found in company profile.',
  };
}

function scoreCompliance(rows: ComplianceRow[]) {
  const available = rows.filter((row) => row.status === 'available').length;
  const partial = rows.filter((row) => row.status === 'partial').length;
  const needsVerification = rows.filter((row) => row.status === 'needs_verification').length;
  const missing = rows.filter((row) => row.status === 'missing').length;
  const highRisk = rows.filter((row) => row.risk === 'high').length;
  const mediumRisk = rows.filter((row) => row.risk === 'medium').length;
  const total = Math.max(rows.length, 1);
  const fitScore = Math.max(0, Math.round(((available + partial * 0.45 + needsVerification * 0.55) / total) * 100));
  const riskScore = Math.min(100, Math.round(((highRisk * 20 + mediumRisk * 8 + missing * 18 + needsVerification * 6) / total) * 10));

  let recommendation: 'Bid' | 'Review Further' | 'Management Review' | 'No Bid';
  if (riskScore > 70 || missing >= 3) recommendation = 'No Bid';
  else if (riskScore > 50 || fitScore < 65) recommendation = 'Management Review';
  else if (fitScore >= 80 && riskScore <= 35) recommendation = 'Bid';
  else recommendation = 'Review Further';

  return {
    total_requirements: rows.length,
    available,
    partial,
    needs_verification: needsVerification,
    missing,
    high_risk: highRisk,
    medium_risk: mediumRisk,
    fit_score: fitScore,
    risk_score: riskScore,
    recommendation,
  };
}

function safeUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function readTenderSources(): Promise<TenderSource[]> {
  if (!(await fileExists(localTenderSourcesPath))) return [];
  const parsed = JSON.parse(await readFile(localTenderSourcesPath, 'utf8')) as { sources?: TenderSource[] } | TenderSource[];
  return Array.isArray(parsed) ? parsed : parsed.sources ?? [];
}

async function fetchSourceText(source: TenderSource) {
  const url = safeUrl(source.url);
  if (!url) return { text: '', warning: 'Invalid URL. Only http/https sources are supported.' };
  const response = await fetch(url, {
    headers: {
      'user-agent': 'EPC Tender Screening MCP Showcase/0.1',
      accept: 'text/html,application/xhtml+xml,application/xml,text/plain,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) return { text: '', warning: `HTTP ${response.status} ${response.statusText}` };
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/pdf') || source.type === 'pdf') {
    return { text: '', warning: 'PDF source found. Upload or connect extracted tender text before screening.' };
  }
  const raw = await response.text();
  return { text: contentType.includes('html') || raw.includes('<html') ? stripHtml(raw) : raw };
}

function searchNeedles(query: string, location?: string, sector?: string, kbliCodes?: string[]) {
  return [...query.split(/\s+/), ...(location?.split(/\s+/) ?? []), ...(sector?.split(/\s+/) ?? []), ...(kbliCodes ?? [])]
    .map(normalize)
    .filter((item) => item.length >= 3);
}

function scoreText(text: string, needles: string[]): number {
  const normalized = normalize(text);
  return needles.reduce((score, needle) => score + (normalized.includes(needle) ? 1 : 0), 0);
}

function extractOpportunitySnippets(source: TenderSource, text: string, needles: string[], limit: number) {
  return splitLines(text)
    .map((line) => ({
      source_name: source.name,
      source_url: source.url,
      title: line.slice(0, 160),
      snippet: line.slice(0, 500),
      score: scoreText(line, needles),
      detected_kbli_codes: extractKbliCodes(line),
    }))
    .filter((item) => item.score > 0 || item.detected_kbli_codes.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function searchHistorical(query: string, limit: number) {
  const dataPath = configuredPath('MCP_HISTORICAL_PROPOSALS_PATH', sampleHistoricalPath);
  if (!(await fileExists(dataPath))) return [];
  const raw = JSON.parse(await readFile(dataPath, 'utf8')) as { items?: Array<Record<string, string>> };
  const needles = searchNeedles(query);
  return (raw.items ?? [])
    .map((item) => ({ ...item, score: scoreText(`${item.title ?? ''} ${item.content ?? ''}`, needles) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, limit);
}

export function createEpcTenderMcpServer() {
  const server = new McpServer({
    name: 'epc-tender-screening-mcp',
    version: '0.1.0',
  });

  server.registerTool(
    'connect_company_profile_text',
    {
      title: 'Connect Company Profile Text',
      description: 'Persist uploaded/extracted company profile text as the local company profile used by later screening calls.',
      inputSchema: {
        company_profile_text: z.string().min(50),
        source_name: z.string().optional(),
      },
    },
    async ({ company_profile_text, source_name }) => {
      const profile = {
        ...companyProfileFromText(company_profile_text),
        source_documents: source_name ? [source_name] : ['uploaded_company_profile_text'],
      };
      await writeFile(localProfilePath, JSON.stringify(profile, null, 2), 'utf8');
      return textResult({
        connected: true,
        company_profile_path: localProfilePath,
        company_name: profile.company_name,
        kbli_count: profile.kbli_registered?.length ?? 0,
        project_experience_count: profile.project_experience?.length ?? 0,
      });
    }
  );

  server.registerTool(
    'connect_current_tender_text',
    {
      title: 'Connect Current Tender Text',
      description: 'Persist uploaded/extracted tender text as the current local tender used by later screening calls.',
      inputSchema: {
        tender_text: z.string().min(50),
        source_name: z.string().optional(),
      },
    },
    async ({ tender_text, source_name }) => {
      const text = `# Current Tender - Uploaded Text\n\nSource: ${source_name ?? 'uploaded_tender_text'}\n\n${tender_text.trim()}\n`;
      await writeFile(localTenderPath, text, 'utf8');
      return textResult({
        connected: true,
        tender_path: localTenderPath,
        source_name: source_name ?? 'uploaded_tender_text',
        extracted_requirement_count: extractTenderRequirements(text).length,
      });
    }
  );

  server.registerTool(
    'connect_tender_source_urls',
    {
      title: 'Connect Tender Source URLs',
      description: 'Persist allowlisted public tender source URLs for later opportunity discovery.',
      inputSchema: {
        sources: z.array(z.object({ name: z.string().min(2), url: z.string().url(), type: z.enum(['html', 'text', 'rss', 'pdf', 'unknown']).optional() })).min(1).max(20),
        replace_existing: z.boolean().default(false),
      },
    },
    async ({ sources, replace_existing }) => {
      const existing = replace_existing ? [] : await readTenderSources();
      const validSources = sources.filter((source) => safeUrl(source.url));
      const unique = Array.from(new Map([...existing, ...validSources].map((source) => [source.url, source])).values());
      await writeFile(localTenderSourcesPath, JSON.stringify({ sources: unique }, null, 2), 'utf8');
      return textResult({ connected: true, tender_sources_path: localTenderSourcesPath, added: validSources.length, total_sources: unique.length });
    }
  );

  server.registerTool(
    'search_public_tenders',
    {
      title: 'Search Public Tender Sources',
      description: 'Search allowlisted public tender source pages or URLs supplied in the request. This does not crawl the whole internet.',
      inputSchema: {
        query: z.string().min(2),
        kbli_codes: z.array(z.string()).optional(),
        location: z.string().optional(),
        sector: z.string().optional(),
        source_urls: z.array(z.string().url()).optional(),
        limit: z.number().int().min(1).max(20).default(10),
      },
    },
    async ({ query, kbli_codes, location, sector, source_urls, limit }) => {
      const requestSources = (source_urls ?? []).map((url, index) => ({ name: `request_source_${index + 1}`, url, type: 'unknown' as const }));
      const sources = source_urls?.length ? requestSources : await readTenderSources();
      if (!sources.length) return textResult({ query, count: 0, results: [], note: 'No public tender sources are connected. Pass source_urls or call connect_tender_source_urls.' });
      const needles = searchNeedles(query, location, sector, kbli_codes);
      const warnings = [];
      const results = [];
      for (const source of sources.slice(0, 10)) {
        try {
          const fetched = await fetchSourceText(source);
          if (fetched.warning) warnings.push({ source: source.url, warning: fetched.warning });
          if (fetched.text) results.push(...extractOpportunitySnippets(source, fetched.text, needles, limit));
        } catch (error) {
          warnings.push({ source: source.url, warning: error instanceof Error ? error.message : String(error) });
        }
      }
      const ranked = results.sort((a, b) => b.score - a.score).slice(0, limit);
      return textResult({
        query,
        filters: { kbli_codes: kbli_codes ?? [], location: location ?? null, sector: sector ?? null },
        count: ranked.length,
        results: ranked,
        warnings,
        note: ranked.length ? 'Discovery leads only. Connect the actual tender document before screening.' : 'No matching snippets found.',
      });
    }
  );

  server.registerTool(
    'get_data_status',
    {
      title: 'Get Data Status',
      description: 'Show which real or example data sources the EPC Tender Screening MCP server is currently using.',
      inputSchema: {},
    },
    async () => {
      const configuredProfilePath = configuredPath('MCP_COMPANY_PROFILE_PATH', localProfilePath);
      const configuredTenderPath = configuredPath('MCP_TENDER_TEXT_PATH', localTenderPath);
      const tenderSources = await readTenderSources();
      return textResult({
        company_profile: {
          configured_path: configuredProfilePath,
          connected: await fileExists(configuredProfilePath),
          example_fallback_enabled: allowExampleFallback,
          fallback: allowExampleFallback ? sampleProfilePath : null,
        },
        current_tender: {
          configured_path: configuredTenderPath,
          connected: await fileExists(configuredTenderPath),
          example_fallback_enabled: allowExampleFallback,
          fallback: allowExampleFallback ? sampleTenderPath : null,
        },
        historical_proposals: {
          configured_path: configuredPath('MCP_HISTORICAL_PROPOSALS_PATH', sampleHistoricalPath),
          mode: 'local_json_demo',
        },
        public_tender_sources: {
          configured_path: localTenderSourcesPath,
          connected: tenderSources.length > 0,
          count: tenderSources.length,
          sources: tenderSources,
        },
      });
    }
  );

  server.registerTool(
    'extract_tender_requirements',
    {
      title: 'Extract Tender Requirements',
      description: 'Extract structured EPC tender requirements from tender text. Uses current local tender file if configured.',
      inputSchema: { tender_text: z.string().optional() },
    },
    async ({ tender_text }) => {
      const tender = await loadTender(tender_text);
      const requirements = extractTenderRequirements(tender.text);
      return textResult({ tender_source: tender.source, requirements, count: requirements.length, human_review_required: true });
    }
  );

  server.registerTool(
    'match_company_profile',
    {
      title: 'Match Company Profile',
      description: 'Match extracted tender requirements against company capabilities and documents.',
      inputSchema: {
        tender_text: z.string().optional(),
        company_profile_json: z.string().optional(),
        company_profile_text: z.string().optional(),
      },
    },
    async ({ tender_text, company_profile_json, company_profile_text }) => {
      const tender = await loadTender(tender_text);
      const { profile, source } = await loadCompanyProfile(company_profile_json, company_profile_text);
      const rows = extractTenderRequirements(tender.text).map((requirement) => evaluateRequirement(requirement, profile));
      return textResult({ company_name: profile.company_name ?? 'Unknown company', company_profile_source: source, tender_source: tender.source, summary: scoreCompliance(rows), matches: rows });
    }
  );

  server.registerTool(
    'generate_compliance_matrix',
    {
      title: 'Generate Compliance Matrix',
      description: 'Generate requirement-by-requirement compliance matrix with evidence, risk, and action.',
      inputSchema: {
        tender_text: z.string().optional(),
        company_profile_json: z.string().optional(),
        company_profile_text: z.string().optional(),
      },
    },
    async ({ tender_text, company_profile_json, company_profile_text }) => {
      const tender = await loadTender(tender_text);
      const { profile, source } = await loadCompanyProfile(company_profile_json, company_profile_text);
      const matrix = extractTenderRequirements(tender.text).map((requirement) => evaluateRequirement(requirement, profile));
      return textResult({ company_name: profile.company_name ?? 'Unknown company', company_profile_source: source, tender_source: tender.source, summary: scoreCompliance(matrix), compliance_matrix: matrix, human_review_required: true });
    }
  );

  server.registerTool(
    'generate_bid_no_bid_memo',
    {
      title: 'Generate Bid/No-Bid Memo',
      description: 'Generate advisory bid/no-bid memo from tender requirements and company profile.',
      inputSchema: {
        tender_text: z.string().optional(),
        company_profile_json: z.string().optional(),
        company_profile_text: z.string().optional(),
      },
    },
    async ({ tender_text, company_profile_json, company_profile_text }) => {
      const tender = await loadTender(tender_text);
      const { profile, source } = await loadCompanyProfile(company_profile_json, company_profile_text);
      const matrix = extractTenderRequirements(tender.text).map((requirement) => evaluateRequirement(requirement, profile));
      const summary = scoreCompliance(matrix);
      const missing = matrix.filter((row) => row.status === 'missing');
      const needsVerification = matrix.filter((row) => row.status === 'needs_verification');
      const highRisk = matrix.filter((row) => row.risk === 'high');
      return textResult({
        title: 'Bid/No-Bid Advisory Memo',
        company_name: profile.company_name ?? 'Unknown company',
        company_profile_source: source,
        tender_source: tender.source,
        recommendation: summary.recommendation,
        fit_score: summary.fit_score,
        risk_score: summary.risk_score,
        rationale: [
          `${summary.available} requirements are directly available in the company profile.`,
          `${summary.needs_verification} requirements need verification before submission.`,
          `${summary.missing} requirements appear missing or project-specific.`,
          `${summary.high_risk} high-risk items require management attention.`,
        ],
        red_flags: highRisk.map((row) => ({ requirement: row.requirement, action: row.action, evidence: row.evidence })),
        missing_documents: missing.map((row) => row.requirement),
        verification_items: needsVerification.map((row) => row.requirement),
        next_actions: [
          'Assign document owners for missing and verification items.',
          'Confirm legal, certification, KBLI, and financial evidence.',
          'Request vendor or asset support letters where required.',
          'Send memo for human tender, finance, legal, and management review.',
        ],
        policy: 'Advisory only. Human review is required before bid submission.',
      });
    }
  );

  server.registerTool(
    'search_historical_proposals',
    {
      title: 'Search Historical Proposals',
      description: 'Search local historical proposal examples. Replace the JSON source with your own indexed archive for production.',
      inputSchema: {
        query: z.string(),
        limit: z.number().int().min(1).max(10).default(5),
      },
    },
    async ({ query, limit }) => {
      const results = await searchHistorical(query, limit);
      return textResult({ query, count: results.length, results, note: 'Local JSON search for showcase. Production deployments should use a real document index.' });
    }
  );

  return server;
}

async function main() {
  const server = createEpcTenderMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('EPC Tender Screening MCP running on stdio');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error('MCP server error:', error);
    process.exit(1);
  });
}
