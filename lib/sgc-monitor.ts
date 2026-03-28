import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const SGC_LIST_URL = "https://sgc.oil.gov.iq/?tender";
const SGC_DETAIL_BASE_URL = "https://sgc.oil.gov.iq/";
const DEFAULT_STATE_PATH = ".data/sgc-tenders-state.json";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export type SnapshotBackend = "github" | "local" | "memory";

export interface SgcTender {
  pageId: number;
  url: string;
  title: string;
  tenderNumber: string | null;
  publishedDate: string | null;
  publishedTime: string | null;
  summary: string;
  contentText: string;
  fingerprint: string;
}

export interface SgcSnapshot {
  fetchedAt: string;
  tenders: SgcTender[];
}

export interface SgcTenderChangeSet {
  newTenders: SgcTender[];
  removedTenders: SgcTender[];
  updatedTenders: Array<{
    before: SgcTender;
    after: SgcTender;
  }>;
}

export interface SgcMonitorReport {
  source: string;
  fetchedAt: string;
  backend: SnapshotBackend;
  persisted: boolean;
  emailed: boolean;
  emailSkippedReason: string | null;
  previousSnapshotFound: boolean;
  totalCurrent: number;
  changes: SgcTenderChangeSet;
  current: SgcTender[];
}

interface GitHubFileState {
  sha: string | null;
  snapshot: SgcSnapshot | null;
}

function getJsonHeaders() {
  return {
    "content-type": "application/json",
    "user-agent": USER_AGENT,
    "accept-language": "en-US,en;q=0.9",
  };
}

function decodeHtml(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#160;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripTags(input: string): string {
  return decodeHtml(input)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactText(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function sha1(input: string): string {
  return crypto.createHash("sha1").update(input).digest("hex");
}

function summarize(text: string, maxLength = 220): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function extractFirstMatch(input: string, pattern: RegExp): string | null {
  const match = input.match(pattern);
  return match?.[1] ? compactText(stripTags(match[1])) : null;
}

function extractTenderNumber(title: string): string | null {
  const fromParentheses = title.match(/رقم\s*\(([^)]+)\)/u);
  if (fromParentheses?.[1]) {
    return compactText(fromParentheses[1]);
  }

  const generic = title.match(/(\d{1,4}\/\d{4}|\d{4}\/\d{1,4}|مناقصة\d+\/\d{4})/u);
  return generic?.[1] ? compactText(generic[1]) : null;
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      "accept-language": "en-US,en;q=0.9",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

function parseListingPage(html: string): Array<{ pageId: number; url: string; title: string }> {
  const matches = [...html.matchAll(/<li><a href="\?page=(\d+)">([\s\S]*?)<\/a><\/li>/gi)];
  const seen = new Set<number>();
  const tenders: Array<{ pageId: number; url: string; title: string }> = [];

  for (const match of matches) {
    const pageId = Number(match[1]);
    const title = compactText(stripTags(match[2]));

    if (!Number.isFinite(pageId) || seen.has(pageId)) {
      continue;
    }

    if (!/[مم]ناقصة|إعلان/u.test(title)) {
      continue;
    }

    seen.add(pageId);
    tenders.push({
      pageId,
      url: `${SGC_DETAIL_BASE_URL}?page=${pageId}`,
      title,
    });
  }

  return tenders.sort((left, right) => right.pageId - left.pageId);
}

async function fetchTenderDetail(entry: {
  pageId: number;
  url: string;
  title: string;
}): Promise<SgcTender> {
  const html = await fetchHtml(entry.url);
  const title =
    extractFirstMatch(html, /<meta\s+property="og:title"\s+content=['"]([\s\S]*?)['"]/i) ??
    extractFirstMatch(html, /<div class="title">([\s\S]*?)<\/div>/i) ??
    entry.title;

  const contentHtml =
    html.match(/<div class="content">([\s\S]*?)<\/div><div style="clear:both;"><\/div><div class="properties">/i)?.[1] ??
    "";
  const contentText = compactText(stripTags(contentHtml));
  const publishedDate = extractFirstMatch(
    html,
    /<div class="properties">[\s\S]*?(\d{4}-\d{2}-\d{2})[\s\S]*?<\/div>/i,
  );
  const publishedTime = extractFirstMatch(
    html,
    /<div class="properties">[\s\S]*?<span dir="ltr">([\s\S]*?)<\/span>/i,
  );
  const tenderNumber = extractTenderNumber(title);
  const summary = summarize(contentText);
  const fingerprint = sha1(
    JSON.stringify({
      pageId: entry.pageId,
      title,
      publishedDate,
      publishedTime,
      contentText,
    }),
  );

  return {
    pageId: entry.pageId,
    url: entry.url,
    title,
    tenderNumber,
    publishedDate,
    publishedTime,
    summary,
    contentText,
    fingerprint,
  };
}

export async function fetchCurrentSgcTenders(): Promise<SgcTender[]> {
  const html = await fetchHtml(SGC_LIST_URL);
  const listing = parseListingPage(html);
  const details = await Promise.all(listing.map((entry) => fetchTenderDetail(entry)));

  return details.sort((left, right) => right.pageId - left.pageId);
}

function diffSnapshots(previous: SgcSnapshot | null, current: SgcSnapshot): SgcTenderChangeSet {
  if (!previous) {
    return {
      newTenders: current.tenders,
      removedTenders: [],
      updatedTenders: [],
    };
  }

  const previousMap = new Map(previous.tenders.map((tender) => [tender.pageId, tender]));
  const currentMap = new Map(current.tenders.map((tender) => [tender.pageId, tender]));

  const newTenders = current.tenders.filter((tender) => !previousMap.has(tender.pageId));
  const removedTenders = previous.tenders.filter((tender) => !currentMap.has(tender.pageId));
  const updatedTenders = current.tenders
    .map((tender) => {
      const previousTender = previousMap.get(tender.pageId);
      if (!previousTender || previousTender.fingerprint === tender.fingerprint) {
        return null;
      }

      return {
        before: previousTender,
        after: tender,
      };
    })
    .filter((value): value is { before: SgcTender; after: SgcTender } => value !== null);

  return {
    newTenders,
    removedTenders,
    updatedTenders,
  };
}

function getLocalStatePath(): string {
  return path.join(process.cwd(), DEFAULT_STATE_PATH);
}

async function loadLocalSnapshot(): Promise<SgcSnapshot | null> {
  try {
    const filePath = getLocalStatePath();
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as SgcSnapshot;
  } catch {
    return null;
  }
}

async function saveLocalSnapshot(snapshot: SgcSnapshot): Promise<void> {
  const filePath = getLocalStatePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf8");
}

function getGitHubConfig() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  const branch = process.env.GITHUB_REPO_BRANCH ?? "main";
  const statePath = process.env.GITHUB_STATE_PATH ?? "data/sgc-tenders-state.json";

  if (!token || !owner || !repo) {
    return null;
  }

  return { token, owner, repo, branch, statePath };
}

async function loadGitHubSnapshot(): Promise<GitHubFileState> {
  const config = getGitHubConfig();
  if (!config) {
    return {
      sha: null,
      snapshot: null,
    };
  }

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.statePath}?ref=${config.branch}`;
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${config.token}`,
      accept: "application/vnd.github+json",
      "user-agent": USER_AGENT,
    },
    cache: "no-store",
  });

  if (response.status === 404) {
    return {
      sha: null,
      snapshot: null,
    };
  }

  if (!response.ok) {
    throw new Error(`Failed to read GitHub state: ${response.status}`);
  }

  const payload = (await response.json()) as {
    content: string;
    sha: string;
  };
  const decoded = Buffer.from(payload.content, "base64").toString("utf8");

  return {
    sha: payload.sha,
    snapshot: JSON.parse(decoded) as SgcSnapshot,
  };
}

async function saveGitHubSnapshot(snapshot: SgcSnapshot, sha: string | null): Promise<void> {
  const config = getGitHubConfig();
  if (!config) {
    throw new Error("GitHub persistence is not configured");
  }

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.statePath}`;
  const body: Record<string, string> = {
    message: `chore: update SGC tender snapshot (${snapshot.fetchedAt})`,
    content: Buffer.from(JSON.stringify(snapshot, null, 2), "utf8").toString("base64"),
    branch: config.branch,
  };

  if (sha) {
    body.sha = sha;
  }

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${config.token}`,
      accept: "application/vnd.github+json",
      ...getJsonHeaders(),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to write GitHub state: ${response.status} ${text}`);
  }
}

async function loadSnapshot(): Promise<{
  backend: SnapshotBackend;
  snapshot: SgcSnapshot | null;
  stateSha: string | null;
}> {
  const githubConfig = getGitHubConfig();
  if (githubConfig) {
    const state = await loadGitHubSnapshot();
    return {
      backend: "github",
      snapshot: state.snapshot,
      stateSha: state.sha,
    };
  }

  const snapshot = await loadLocalSnapshot();
  return {
    backend: "local",
    snapshot,
    stateSha: null,
  };
}

async function persistSnapshot(
  backend: SnapshotBackend,
  snapshot: SgcSnapshot,
  stateSha: string | null,
): Promise<boolean> {
  if (backend === "github") {
    await saveGitHubSnapshot(snapshot, stateSha);
    return true;
  }

  if (backend === "local") {
    await saveLocalSnapshot(snapshot);
    return true;
  }

  return false;
}

function formatTenderLine(tender: SgcTender): string {
  const pieces = [
    tender.tenderNumber ?? `page-${tender.pageId}`,
    tender.title,
    tender.publishedDate ? `published ${tender.publishedDate}` : null,
    tender.url,
  ].filter(Boolean);

  return `- ${pieces.join(" | ")}`;
}

async function sendEmailReport(report: SgcMonitorReport): Promise<{
  sent: boolean;
  skippedReason: string | null;
}> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SGC_EMAIL_FROM;
  const to = process.env.SGC_EMAIL_TO;

  if (!apiKey || !from || !to) {
    return {
      sent: false,
      skippedReason: "Email env vars are missing",
    };
  }

  const recipients = to
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    return {
      sent: false,
      skippedReason: "No email recipients configured",
    };
  }

  const hasChanges =
    report.changes.newTenders.length > 0 ||
    report.changes.updatedTenders.length > 0 ||
    report.changes.removedTenders.length > 0;
  const subjectPrefix = hasChanges ? "SGC Weekly Update" : "SGC Weekly Check";
  const subject = `${subjectPrefix} - ${report.current.length} tenders on ${report.fetchedAt.slice(0, 10)}`;

  const lines = [
    `South Gas Company weekly tender check`,
    ``,
    `Fetched at: ${report.fetchedAt}`,
    `Source: ${report.source}`,
    `Snapshot backend: ${report.backend}`,
    `Current tender count: ${report.totalCurrent}`,
    `Previous snapshot found: ${report.previousSnapshotFound ? "yes" : "no"}`,
    ``,
    `New tenders: ${report.changes.newTenders.length}`,
    ...report.changes.newTenders.map(formatTenderLine),
    ``,
    `Updated tenders: ${report.changes.updatedTenders.length}`,
    ...report.changes.updatedTenders.map(({ after }) => formatTenderLine(after)),
    ``,
    `Removed tenders: ${report.changes.removedTenders.length}`,
    ...report.changes.removedTenders.map(formatTenderLine),
    ``,
    `Current tender list:`,
    ...report.current.map(formatTenderLine),
  ];

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      ...getJsonHeaders(),
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject,
      text: lines.join("\n"),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to send email: ${response.status} ${text}`);
  }

  return {
    sent: true,
    skippedReason: null,
  };
}

export async function runSgcMonitor(options?: {
  persist?: boolean;
  email?: boolean;
}): Promise<SgcMonitorReport> {
  const currentTenders = await fetchCurrentSgcTenders();
  const snapshot: SgcSnapshot = {
    fetchedAt: new Date().toISOString(),
    tenders: currentTenders,
  };
  const loaded = await loadSnapshot();
  const changes = diffSnapshots(loaded.snapshot, snapshot);
  const report: SgcMonitorReport = {
    source: SGC_LIST_URL,
    fetchedAt: snapshot.fetchedAt,
    backend: loaded.backend,
    persisted: false,
    emailed: false,
    emailSkippedReason: null,
    previousSnapshotFound: loaded.snapshot !== null,
    totalCurrent: currentTenders.length,
    changes,
    current: currentTenders,
  };

  if (options?.persist) {
    report.persisted = await persistSnapshot(loaded.backend, snapshot, loaded.stateSha);
  }

  if (options?.email) {
    const emailResult = await sendEmailReport(report);
    report.emailed = emailResult.sent;
    report.emailSkippedReason = emailResult.skippedReason;
  }

  return report;
}
