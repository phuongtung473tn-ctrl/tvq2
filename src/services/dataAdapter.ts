/**
 * HYBRID STORAGE ADAPTER
 * ----------------------
 * - LOCAL MODE: đọc/ghi cấu hình qua localStorage, chỉ dành cho phát triển.
 * - DATABASE MODE: dữ liệu nghiệp vụ và cấu hình chỉ nằm trên Supabase.
 *
 * Toàn bộ hệ thống chỉ gọi qua adapter này nên có thể đổi backend mà không sửa UI.
 */
import {
  DEFAULT_CONFIG,
  type SiteConfig,
  type StorageMode,
} from "@/config/site-config";
import type { VisitorBehaviorPayload } from "@/types/visitor-tracking";
import { relayWebhook } from "@/services/webhook.functions";
import { getSupabaseAccessToken } from "@/lib/supabase-auth";
import { saveConfigWithSupabaseAuth } from "@/services/config.functions";

const CONFIG_KEY = "funnel_site_config_v1";
const LEADS_KEY = "funnel_leads_v1";
const ANALYTICS_KEY = "funnel_analytics_v1";
const BACKUP_KEY = "funnel_backup_snapshots_v1";
export const LEAD_CREATED_EVENT = "funnel:lead-created";
export const ANALYTICS_UPDATED_EVENT = "funnel:analytics-updated";
const CLOUD_CONFIG_TABLE = "funnel_configs";
const CLOUD_ANALYTICS_TABLE = "funnel_analytics";
const LOCAL_MIGRATION_KEY = "funnel_supabase_migrated_leads_v1";
const REMOTE_LEAD_TIMEOUT_MS = 3_000;
const REMOTE_DUPLICATE_TIMEOUT_MS = 1_500;

function bearer(key: string): string {
  return getSupabaseAccessToken() || key;
}

const browserDataKeys = [
  CONFIG_KEY,
  LEADS_KEY,
  ANALYTICS_KEY,
  BACKUP_KEY,
  LOCAL_MIGRATION_KEY,
] as const;
const browserCacheKeys = [
  ...browserDataKeys,
  "lp_visitor_id_v2",
  "lp_utm_first_v4",
  "lp_utm_last_v4",
  "lp_utm_first_v3",
  "lp_utm_v2",
  "lp_visit_counters_v2",
  "lp_submission_counters_v2",
  "lp_rate",
  "funnel_ab_variant_v2_A",
  "funnel_ab_variant_v2_B",
] as const;

function configuredSupabase(): { url: string; key: string } {
  const env = import.meta.env as Record<string, string | undefined>;
  return {
    url: env["VITE_SUPABASE_URL"]?.trim().replace(/\/$/, "") || "",
    key: env["VITE_SUPABASE_ANON_KEY"]?.trim() || "",
  };
}

function clearBrowserData(): void {
  if (!isBrowser()) return;
  for (const key of browserDataKeys) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* storage may be blocked */
    }
  }
}

export function clearClientCache(): void {
  if (!isBrowser()) return;
  for (const key of browserCacheKeys) {
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch {
      /* storage may be blocked */
    }
  }
  if ("caches" in window) {
    void window.caches
      .keys()
      .then((keys) =>
        Promise.all(keys.map((key) => window.caches.delete(key))),
      );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

/** Deep-merge dữ liệu đã lưu lên mặc định để config luôn đủ trường khi nâng cấp. */
function mergeConfig(
  base: SiteConfig,
  override: Partial<SiteConfig> | null,
): SiteConfig {
  if (!override) return structuredClone(base);
  const compatibleOverride = structuredClone(
    override,
  ) as Partial<SiteConfig> & {
    landing?: Partial<SiteConfig["landing"]> & {
      sections?: SiteConfig["landing"]["sectionsArray"];
    };
  };
  if (
    compatibleOverride.landing?.sections &&
    !compatibleOverride.landing.sectionsArray
  ) {
    compatibleOverride.landing.sectionsArray =
      compatibleOverride.landing.sections.map((section, order) => ({
        ...section,
        type: section.type || section.id,
        order,
      }));
    delete compatibleOverride.landing.sections;
  }
  const merge = (baseValue: unknown, overrideValue: unknown): unknown => {
    if (
      overrideValue &&
      typeof overrideValue === "object" &&
      !Array.isArray(overrideValue) &&
      baseValue &&
      typeof baseValue === "object" &&
      !Array.isArray(baseValue)
    ) {
      const result: Record<string, unknown> = {
        ...(baseValue as Record<string, unknown>),
      };
      for (const [key, value] of Object.entries(
        overrideValue as Record<string, unknown>,
      )) {
        result[key] = merge(result[key], value);
      }
      return result;
    }
    return overrideValue === undefined ? baseValue : overrideValue;
  };
  return merge(structuredClone(base), compatibleOverride) as SiteConfig;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function preserveLocalSecrets(
  merged: SiteConfig,
  local: SiteConfig,
): SiteConfig {
  const env = configuredSupabase();
  merged.admin.supabaseUrl = env.url || local.admin.supabaseUrl;
  merged.admin.supabaseAnonKey = env.key || local.admin.supabaseAnonKey;
  merged.admin.supabaseAdminEmail =
    merged.admin.supabaseAdminEmail || local.admin.supabaseAdminEmail;
  merged.admin.password = "";
  merged.admin.storageMode = "database";
  merged.admin.backupCronToken = local.admin.backupCronToken;
  merged.emailAutomation.resendApiKey = local.emailAutomation.resendApiKey;
  merged.emailAutomation.gmailClientId = local.emailAutomation.gmailClientId;
  merged.emailAutomation.gmailClientSecret =
    local.emailAutomation.gmailClientSecret;
  merged.emailAutomation.gmailRefreshToken =
    local.emailAutomation.gmailRefreshToken;
  merged.tracking.tiktokAccessToken = local.tracking.tiktokAccessToken;
  return merged;
}

export function loadConfig(): SiteConfig {
  if (!isBrowser()) return structuredClone(DEFAULT_CONFIG);
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    const config = mergeConfig(
      DEFAULT_CONFIG,
      isRecord(parsed) ? (parsed as Partial<SiteConfig>) : null,
    );
    const env = configuredSupabase();
    if (env.url && env.key) {
      config.admin.storageMode = "database";
      config.admin.supabaseUrl = env.url;
      config.admin.supabaseAnonKey = env.key;
    }
    return config;
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

/** Nạp cấu hình landing từ Supabase khi Database Mode được bật. */
export async function loadCloudConfig(
  config: SiteConfig,
): Promise<SiteConfig | null> {
  if (
    !isBrowser() ||
    config.admin.storageMode !== "database" ||
    !config.admin.supabaseUrl ||
    !config.admin.supabaseAnonKey
  ) {
    return null;
  }
  try {
    const response = await fetch(
      `${config.admin.supabaseUrl.replace(/\/$/, "")}/rest/v1/${CLOUD_CONFIG_TABLE}?id=eq.1&select=data`,
      {
        headers: {
          apikey: config.admin.supabaseAnonKey,
          Authorization: `Bearer ${bearer(config.admin.supabaseAnonKey)}`,
        },
      },
    );
    if (!response.ok) return null;
    const rows = (await response.json()) as unknown;
    if (!Array.isArray(rows) || !isRecord(rows[0])) return null;
    const data = rows[0]["data"];
    if (!isRecord(data)) return null;
    // Credential không được lưu cloud, nên luôn giữ bản local khi hydrate.
    const hydrated = preserveLocalSecrets(
      mergeConfig(config, data as Partial<SiteConfig>),
      config,
    );
    return hydrated;
  } catch {
    return null;
  }
}

export async function saveConfig(config: SiteConfig): Promise<boolean> {
  if (!isBrowser()) return false;
  if (config.admin.storageMode !== "database") {
    clearClientCache();
    console.error("Local storage mode is disabled; configure Supabase first.");
    return false;
  }
  if (config.admin.storageMode === "database") {
    clearClientCache();
    if (config.admin.supabaseUrl && config.admin.supabaseAnonKey) {
      return await syncConfigToSupabase(config);
    } else {
      console.error(
        "Database mode requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
      );
    }
    return false;
  }
  return false;
}

export async function saveConfigWithCredentials(
  config: SiteConfig,
  password: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (
    !isBrowser() ||
    !config.admin.supabaseUrl ||
    !config.admin.supabaseAnonKey
  ) {
    return { ok: false, reason: "missing_config" };
  }
  try {
    const result = await saveConfigWithSupabaseAuth({
      data: {
        url: config.admin.supabaseUrl,
        anonKey: config.admin.supabaseAnonKey,
        email: config.admin.supabaseAdminEmail,
        password,
        config: config as unknown as Record<string, unknown>,
      },
    });
    if (result.ok) {
      try {
        window.sessionStorage.setItem(
          "funnel_supabase_access_token_v1",
          result.accessToken,
        );
      } catch {
        /* session storage may be blocked */
      }
    }
    return result;
  } catch {
    return { ok: false, reason: "server_unavailable" };
  }
}

export function resetConfig(): SiteConfig {
  clearClientCache();
  return structuredClone(DEFAULT_CONFIG);
}

export function exportConfigFile(config: SiteConfig): void {
  if (!isBrowser()) return;
  const exportConfig = structuredClone(config);
  exportConfig.admin.supabaseAnonKey = "";
  exportConfig.admin.password = "";
  exportConfig.admin.backupCronToken = "";
  exportConfig.emailAutomation.resendApiKey = "";
  exportConfig.emailAutomation.gmailClientId = "";
  exportConfig.emailAutomation.gmailClientSecret = "";
  exportConfig.emailAutomation.gmailRefreshToken = "";
  exportConfig.tracking.tiktokAccessToken = "";
  const content = `// AUTO-GENERATED — dán đè vào src/config/site-config.ts (phần DEFAULT_CONFIG)\nexport const DEFAULT_CONFIG = ${JSON.stringify(
    exportConfig,
    null,
    2,
  )};\n`;
  const blob = new Blob([content], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "site-config.export.js";
  a.click();
  URL.revokeObjectURL(url);
}

function sqlJson(value: unknown): string {
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}

export function exportSupabaseSql(config: SiteConfig): void {
  if (!isBrowser()) return;
  const cloudConfig = structuredClone(config);
  cloudConfig.admin.supabaseAnonKey = "";
  cloudConfig.admin.password = "";
  cloudConfig.admin.backupCronToken = "";
  cloudConfig.emailAutomation.resendApiKey = "";
  cloudConfig.emailAutomation.gmailClientId = "";
  cloudConfig.emailAutomation.gmailClientSecret = "";
  cloudConfig.emailAutomation.gmailRefreshToken = "";
  cloudConfig.tracking.tiktokAccessToken = "";
  const analytics = loadAnalytics();
  const sql = `-- Generated by Funnel Builder. Secrets are intentionally omitted.
create extension if not exists pgcrypto;

create table if not exists public.funnel_configs (id bigint primary key, data jsonb not null, updated_at timestamptz not null default now());
alter table public.funnel_configs enable row level security;
drop policy if exists "funnel configs can be read" on public.funnel_configs;
create policy "funnel configs can be read" on public.funnel_configs for select using (true);
drop policy if exists "funnel configs can be written" on public.funnel_configs;
create policy "funnel configs can be written" on public.funnel_configs for insert to authenticated with check (id = 1);
drop policy if exists "funnel configs can be updated" on public.funnel_configs;
create policy "funnel configs can be updated" on public.funnel_configs for update to authenticated using (id = 1) with check (id = 1);

create table if not exists public.funnel_analytics (id bigint primary key, data jsonb not null, updated_at timestamptz not null default now());
alter table public.funnel_analytics enable row level security;
drop policy if exists "funnel analytics can be read" on public.funnel_analytics;
create policy "funnel analytics can be read" on public.funnel_analytics for select to authenticated;
drop policy if exists "funnel analytics can be written" on public.funnel_analytics;
create policy "funnel analytics can be written" on public.funnel_analytics for insert to authenticated with check (id = 1);
drop policy if exists "funnel analytics can be updated" on public.funnel_analytics;
create policy "funnel analytics can be updated" on public.funnel_analytics for update to authenticated using (id = 1) with check (id = 1);

create table if not exists public.leads (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), name text, phone text, email text, city text, major text, ai_score int, ai_rank text, risk_level text, risk_reasons text[], recommended_action text, behavior_summary text, sale_advice text, device_tech_info text, traffic_ads_source text, network_provider text, network_label text, current_session int, visits_today int, visits_month int, utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text, fbclid text, ttclid text, gclid text, raw_query text, referrer text, attribution_model text, attribution_detected_by text, utm_params jsonb, variant text, landing_url text, device_manufacturer text, device_family text, device_model text, operating_system text, browser text, visitor_behavior_payload jsonb);
alter table public.leads enable row level security;
drop policy if exists "leads can be created by public form" on public.leads;
create policy "leads can be created by public form" on public.leads for insert with check (true);

create table if not exists public.visitor_sessions (id text primary key, visitor_id text not null, visited_day date not null, visited_month text not null, source text, medium text, campaign text, content text, device_model text, device_kind text, os text, browser text, created_at timestamptz not null default now());
alter table public.visitor_sessions enable row level security;
drop policy if exists "visitor sessions can be created by public form" on public.visitor_sessions;
create policy "visitor sessions can be created by public form" on public.visitor_sessions for insert with check (true);
drop policy if exists "visitor sessions can be counted by public form" on public.visitor_sessions;
create policy "visitor sessions can be counted by public form" on public.visitor_sessions for select to authenticated;

insert into public.funnel_configs (id, data, updated_at) values (1, ${sqlJson(cloudConfig)}, now()) on conflict (id) do update set data = excluded.data, updated_at = excluded.updated_at;
insert into public.funnel_analytics (id, data, updated_at) values (1, ${sqlJson(analytics)}, now()) on conflict (id) do update set data = excluded.data, updated_at = excluded.updated_at;
`;
  const blob = new Blob([sql], { type: "application/sql;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `supabase-funnel-${new Date().toISOString().slice(0, 10)}.sql`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Kiểm tra & chuẩn hoá cấu hình tải lên (JSON thuần hoặc file .js đã export).
 * Trả về null nếu nội dung không phải một SiteConfig hợp lệ.
 */
export function parseImportedConfig(raw: string): SiteConfig | null {
  const jsonText = raw.trim().startsWith("{")
    ? raw
    : (raw.match(/\{[\s\S]*\}/)?.[0] ?? "");
  if (!jsonText) return null;
  try {
    const parsed = JSON.parse(jsonText) as unknown;
    if (
      !isRecord(parsed) ||
      !isRecord(parsed["admin"]) ||
      !isRecord(parsed["landing"]) ||
      !isRecord(parsed["tracking"]) ||
      !isRecord(parsed["seo"])
    ) {
      return null;
    }
    return mergeConfig(DEFAULT_CONFIG, parsed as Partial<SiteConfig>);
  } catch {
    return null;
  }
}

/* ----------------------------- LEADS (Mini-CRM) ---------------------------- */

export interface LeadRecord {
  id: string;
  at: string;
  name: string;
  phone: string;
  email?: string | undefined;
  city?: string | undefined;
  major?: string | undefined;
  aiScore?: number | undefined;
  aiRank?: string | undefined;
  riskLevel?: "low" | "review" | "high" | "unrated" | undefined;
  riskReasons?: string[] | undefined;
  recommendedAction?: string | undefined;
  behaviorSummary?: string | undefined;
  saleAdvice?: string | undefined;
  deviceTechInfo?: string | undefined;
  trafficAdsSource?: string | undefined;
  networkProvider?: string | undefined;
  networkLabel?: string | undefined;
  currentSession?: number | undefined;
  visitsToday?: number | undefined;
  visitsMonth?: number | undefined;
  visitorBehaviorPayload?: VisitorBehaviorPayload | undefined;
  utmMedium?: string | undefined;
  utmCampaign?: string | undefined;
  utmContent?: string | undefined;
  utmTerm?: string | undefined;
  fbclid?: string | undefined;
  ttclid?: string | undefined;
  gclid?: string | undefined;
  rawQuery?: string | undefined;
  referrer?: string | undefined;
  attributionModel?: string | undefined;
  attributionDetectedBy?: string | undefined;
  utmParams?: Record<string, string> | undefined;
  utmSource?: string | undefined;
  variant?: string | undefined;
  landing_url?: string | undefined;
  deviceManufacturer?: string | undefined;
  deviceFamily?: string | undefined;
  deviceModel?: string | undefined;
  operatingSystem?: string | undefined;
  browser?: string | undefined;
  /** Nơi bản ghi được lưu: máy khách hay đám mây. */
  storage?: StorageMode | undefined;
}

export function loadLeads(): LeadRecord[] {
  if (!isBrowser()) return [];
  if (loadConfig().admin.storageMode === "database") return [];
  try {
    return JSON.parse(
      window.localStorage.getItem(LEADS_KEY) || "[]",
    ) as LeadRecord[];
  } catch {
    return [];
  }
}

export async function loadCloudLeads(
  config: SiteConfig,
): Promise<LeadRecord[]> {
  if (
    !isBrowser() ||
    config.admin.storageMode !== "database" ||
    !config.admin.supabaseUrl ||
    !config.admin.supabaseAnonKey
  ) {
    return [];
  }
  try {
    const response = await fetch(
      `${config.admin.supabaseUrl.replace(/\/$/, "")}/rest/v1/leads?select=*&order=created_at.desc&limit=500`,
      {
        headers: {
          apikey: config.admin.supabaseAnonKey,
          Authorization: `Bearer ${bearer(config.admin.supabaseAnonKey)}`,
        },
      },
    );
    if (!response.ok) return [];
    const rows = (await response.json()) as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: String(row["id"] || ""),
      at: String(row["created_at"] || ""),
      name: String(row["name"] || ""),
      phone: String(row["phone"] || ""),
      email: String(row["email"] || ""),
      city: String(row["city"] || ""),
      major: String(row["major"] || ""),
      aiScore:
        typeof row["ai_score"] === "number" ? row["ai_score"] : undefined,
      aiRank: String(row["ai_rank"] || ""),
      riskLevel: row["risk_level"] as LeadRecord["riskLevel"],
      riskReasons: row["risk_reasons"] as string[] | undefined,
      recommendedAction: String(row["recommended_action"] || ""),
      behaviorSummary: String(row["behavior_summary"] || ""),
      saleAdvice: String(row["sale_advice"] || ""),
      currentSession: Number(row["current_session"] || 0),
      visitsToday: Number(row["visits_today"] || 0),
      visitsMonth: Number(row["visits_month"] || 0),
      utmSource: String(row["utm_source"] || ""),
      utmMedium: String(row["utm_medium"] || ""),
      variant: String(row["variant"] || ""),
      deviceModel: String(row["device_model"] || ""),
      operatingSystem: String(row["operating_system"] || ""),
      browser: String(row["browser"] || ""),
      storage: "database",
    }));
  } catch {
    return [];
  }
}

function cacheLeadLocally(record: LeadRecord): void {
  if (!isBrowser()) return;
  try {
    const leads = loadLeads();
    leads.unshift(record);
    window.localStorage.setItem(LEADS_KEY, JSON.stringify(leads.slice(0, 500)));
    window.dispatchEvent(
      new CustomEvent<LeadRecord>(LEAD_CREATED_EVENT, { detail: record }),
    );
  } catch {
    // Private/in-app browsers may block storage; remote delivery must continue.
  }
}

/** Trùng lặp: cùng số điện thoại đã gửi trong 24 giờ gần nhất. */
export function isDuplicateLead(phone: string): boolean {
  if (loadConfig().admin.storageMode === "database") return false;
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return loadLeads().some(
    (l) => l.phone === phone && new Date(l.at).getTime() > cutoff,
  );
}

/** Trùng lặp từ xa: kiểm tra Supabase trong Database Mode. */
export async function isDuplicateLeadRemote(
  phone: string,
  config?: SiteConfig,
): Promise<boolean> {
  if (
    !isBrowser() ||
    config?.admin.storageMode !== "database" ||
    !config.admin.supabaseUrl ||
    !config.admin.supabaseAnonKey
  ) {
    return false;
  }
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => controller.abort(),
      REMOTE_DUPLICATE_TIMEOUT_MS,
    );
    const url =
      `${config.admin.supabaseUrl.replace(/\/$/, "")}/rest/v1/leads` +
      `?phone=eq.${encodeURIComponent(phone)}&created_at=gte.${cutoff}&select=id`;
    try {
      const res = await fetch(url, {
        headers: {
          apikey: config.admin.supabaseAnonKey,
          Authorization: `Bearer ${bearer(config.admin.supabaseAnonKey)}`,
        },
        signal: controller.signal,
      });
      if (!res.ok) {
        console.warn(`isDuplicateLeadRemote: Supabase returned ${res.status}`);
        return false;
      }
      const rows = (await res.json()) as unknown[];
      return Array.isArray(rows) && rows.length > 0;
    } finally {
      window.clearTimeout(timer);
    }
  } catch (err) {
    console.warn(
      "isDuplicateLeadRemote: network error, allowing submit",
      (err as Error).message,
    );
    return false;
  }
}

export async function clearLeads(config?: SiteConfig): Promise<boolean> {
  if (!isBrowser()) return false;
  if (config?.admin.storageMode === "database") {
    try {
      const response = await fetch(
        `${config.admin.supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/clear_funnel_leads`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: config.admin.supabaseAnonKey,
            Authorization: `Bearer ${bearer(config.admin.supabaseAnonKey)}`,
          },
          body: "{}",
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }
  window.localStorage.removeItem(LEADS_KEY);
  return true;
}

/**
 * Lưu lead vào kho đang hoạt động. Luôn ghi bản sao ở máy để Mini-CRM hiển thị
 * ngay; ở Database Mode sẽ đẩy thêm lên bảng `leads` của Supabase.
 */
export async function saveLead(
  lead: LeadRecord,
  config?: SiteConfig,
): Promise<LeadRecord> {
  const mode: StorageMode =
    config?.admin.storageMode === "database" ? "database" : "local";
  const record: LeadRecord = { ...lead, storage: mode };
  if (mode === "local") cacheLeadLocally(record);
  if (mode === "database" && config) {
    const ok = await pushLeadToSupabase(
      record,
      config.admin.supabaseUrl,
      config.admin.supabaseAnonKey,
    );
    if (!ok) {
      record.storage = "local";
      cacheLeadLocally(record);
    }
  }
  return record;
}

async function pushLeadToSupabase(
  lead: LeadRecord,
  url: string,
  key: string,
): Promise<boolean> {
  const controller = new AbortController();
  const timer = window.setTimeout(
    () => controller.abort(),
    REMOTE_LEAD_TIMEOUT_MS,
  );
  try {
    const endpoint = `${url.replace(/\/$/, "")}/rest/v1/leads`;
    const headers = {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${bearer(key)}`,
      Prefer: "return=minimal",
    };
    const row = {
      name: lead.name,
      phone: lead.phone,
      email: lead.email ?? null,
      city: lead.city ?? null,
      major: lead.major ?? null,
      ai_score: lead.aiScore ?? null,
      ai_rank: lead.aiRank ?? null,
      risk_level: lead.riskLevel ?? null,
      risk_reasons: lead.riskReasons ?? null,
      recommended_action: lead.recommendedAction ?? null,
      behavior_summary: lead.behaviorSummary ?? null,
      sale_advice: lead.saleAdvice ?? null,
      device_tech_info: lead.deviceTechInfo ?? null,
      traffic_ads_source: lead.trafficAdsSource ?? null,
      network_provider: lead.networkProvider ?? null,
      network_label: lead.networkLabel ?? null,
      current_session: lead.currentSession ?? null,
      visits_today: lead.visitsToday ?? null,
      visits_month: lead.visitsMonth ?? null,
      utm_source: lead.utmSource ?? null,
      utm_medium: lead.utmMedium ?? null,
      utm_campaign: lead.utmCampaign ?? null,
      utm_content: lead.utmContent ?? null,
      utm_term: lead.utmTerm ?? null,
      fbclid: lead.fbclid ?? null,
      ttclid: lead.ttclid ?? null,
      gclid: lead.gclid ?? null,
      raw_query: lead.rawQuery ?? null,
      referrer: lead.referrer ?? null,
      attribution_model: lead.attributionModel ?? null,
      attribution_detected_by: lead.attributionDetectedBy ?? null,
      utm_params: lead.utmParams ?? null,
      variant: lead.variant ?? null,
      landing_url: lead.landing_url ?? null,
      device_manufacturer: lead.deviceManufacturer ?? null,
      device_family: lead.deviceFamily ?? null,
      device_model: lead.deviceModel ?? null,
      operating_system: lead.operatingSystem ?? null,
      browser: lead.browser ?? null,
      visitor_behavior_payload: lead.visitorBehaviorPayload ?? null,
      created_at: lead.at,
    };
    const relay = await relayWebhook({
      data: { endpoint, body: [row], headers },
    });
    if (relay.ok) return true;

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      keepalive: true,
      signal: controller.signal,
      body: JSON.stringify([row]),
    });
    if (!res.ok && res.status >= 400 && res.status < 500) {
      const legacy = { ...row } as Record<string, unknown>;
      delete legacy["utm_term"];
      delete legacy["fbclid"];
      delete legacy["gclid"];
      delete legacy["raw_query"];
      delete legacy["referrer"];
      delete legacy["attribution_model"];
      delete legacy["attribution_detected_by"];
      delete legacy["utm_params"];
      const fallback = await fetch(endpoint, {
        method: "POST",
        headers,
        keepalive: true,
        signal: controller.signal,
        body: JSON.stringify([legacy]),
      });
      return fallback.ok;
    }
    return res.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

export function exportLeadsCsv(leads: LeadRecord[]): void {
  if (!isBrowser()) return;
  const headers = [
    "at",
    "name",
    "phone",
    "email",
    "city",
    "major",
    "aiScore",
    "aiRank",
    "riskLevel",
    "riskReasons",
    "recommendedAction",
    "behaviorSummary",
    "saleAdvice",
    "deviceTechInfo",
    "trafficAdsSource",
    "networkProvider",
    "networkLabel",
    "currentSession",
    "visitsToday",
    "visitsMonth",
    "utmSource",
    "utmMedium",
    "utmCampaign",
    "utmContent",
    "ttclid",
    "variant",
    "landing_url",
    "deviceManufacturer",
    "deviceFamily",
    "deviceModel",
    "operatingSystem",
    "browser",
  ];
  const rows = leads.map((l) =>
    headers
      .map(
        (h) =>
          `"${String((l as unknown as Record<string, unknown>)[h] ?? "").replace(/"/g, '""')}"`,
      )
      .join(","),
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------- ANALYTICS -------------------------------- */

export interface AnalyticsState {
  visits: number;
  leads: number;
  bySource: Record<string, number>;
  bySourceStats: Record<string, { visits: number; leads: number }>;
  byVariant: Record<string, { visits: number; leads: number }>;
}

let cloudAnalyticsState: AnalyticsState | null = null;

function emptyAnalytics(): AnalyticsState {
  return {
    visits: 0,
    leads: 0,
    bySource: {},
    bySourceStats: {},
    byVariant: {},
  };
}

function cleanSource(source: string): string {
  const value = source.trim().slice(0, 100);
  return value || "direct";
}

function normalizeAnalytics(
  value: Partial<AnalyticsState> | null,
): AnalyticsState {
  const result = emptyAnalytics();
  result.visits = Number.isFinite(value?.visits)
    ? Math.max(0, Number(value?.visits))
    : 0;
  result.leads = Number.isFinite(value?.leads)
    ? Math.max(0, Number(value?.leads))
    : 0;
  for (const [source, count] of Object.entries(value?.bySource || {})) {
    if (Number.isFinite(count))
      result.bySource[cleanSource(source)] = Math.max(0, Number(count));
  }
  for (const [source, stats] of Object.entries(value?.bySourceStats || {})) {
    if (!stats) continue;
    result.bySourceStats[cleanSource(source)] = {
      visits: Number.isFinite(stats.visits)
        ? Math.max(0, Number(stats.visits))
        : 0,
      leads: Number.isFinite(stats.leads)
        ? Math.max(0, Number(stats.leads))
        : 0,
    };
  }
  for (const [source, visits] of Object.entries(result.bySource)) {
    result.bySourceStats[source] = result.bySourceStats[source] || {
      visits,
      leads: 0,
    };
  }
  for (const [variant, stats] of Object.entries(value?.byVariant || {})) {
    if (!stats) continue;
    result.byVariant[variant] = {
      visits: Number.isFinite(stats.visits)
        ? Math.max(0, Number(stats.visits))
        : 0,
      leads: Number.isFinite(stats.leads)
        ? Math.max(0, Number(stats.leads))
        : 0,
    };
  }
  return result;
}

export function loadAnalytics(): AnalyticsState {
  if (!isBrowser()) return emptyAnalytics();
  if (loadConfig().admin.storageMode === "database") {
    return cloudAnalyticsState
      ? structuredClone(cloudAnalyticsState)
      : emptyAnalytics();
  }
  try {
    return normalizeAnalytics(
      JSON.parse(
        window.localStorage.getItem(ANALYTICS_KEY) || "{}",
      ) as Partial<AnalyticsState>,
    );
  } catch {
    return emptyAnalytics();
  }
}

function saveAnalytics(state: AnalyticsState): void {
  if (!isBrowser()) return;
  const config = loadConfig();
  if (config.admin.storageMode === "database") {
    window.dispatchEvent(
      new CustomEvent<AnalyticsState>(ANALYTICS_UPDATED_EVENT, {
        detail: state,
      }),
    );
    void syncAnalyticsToSupabase(state, config);
    return;
  }
  window.localStorage.setItem(ANALYTICS_KEY, JSON.stringify(state));
  window.dispatchEvent(
    new CustomEvent<AnalyticsState>(ANALYTICS_UPDATED_EVENT, { detail: state }),
  );
}

async function syncAnalyticsToSupabase(
  state: AnalyticsState,
  config: SiteConfig,
): Promise<boolean> {
  try {
    const response = await fetch(
      `${config.admin.supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/upsert_funnel_analytics`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: config.admin.supabaseAnonKey,
          Authorization: `Bearer ${bearer(config.admin.supabaseAnonKey)}`,
        },
        body: JSON.stringify({ p_data: state }),
      },
    );
    return response.ok;
  } catch {
    return false;
  }
}

export async function loadCloudAnalytics(
  config: SiteConfig,
): Promise<AnalyticsState | null> {
  if (
    !isBrowser() ||
    config.admin.storageMode !== "database" ||
    !config.admin.supabaseUrl ||
    !config.admin.supabaseAnonKey
  ) {
    return null;
  }
  try {
    const response = await fetch(
      `${config.admin.supabaseUrl.replace(/\/$/, "")}/rest/v1/${CLOUD_ANALYTICS_TABLE}?id=eq.1&select=data`,
      {
        headers: {
          apikey: config.admin.supabaseAnonKey,
          Authorization: `Bearer ${bearer(config.admin.supabaseAnonKey)}`,
        },
      },
    );
    if (!response.ok) return null;
    const rows = (await response.json()) as unknown;
    if (!Array.isArray(rows) || !isRecord(rows[0])) return null;
    cloudAnalyticsState = normalizeAnalytics(
      rows[0]["data"] as Partial<AnalyticsState>,
    );
    return structuredClone(cloudAnalyticsState);
  } catch {
    return null;
  }
}

export function trackVisit(source: string, variant?: string): void {
  const a = loadAnalytics();
  a.visits += 1;
  const normalizedSource = cleanSource(source);
  a.bySource[normalizedSource] = (a.bySource[normalizedSource] || 0) + 1;
  a.bySourceStats[normalizedSource] = a.bySourceStats[normalizedSource] || {
    visits: 0,
    leads: 0,
  };
  a.bySourceStats[normalizedSource].visits += 1;
  if (variant) {
    a.byVariant[variant] = a.byVariant[variant] || { visits: 0, leads: 0 };
    a.byVariant[variant].visits += 1;
  }
  saveAnalytics(a);
}

export function trackConversion(source: string, variant?: string): void {
  const a = loadAnalytics();
  a.leads += 1;
  const normalizedSource = cleanSource(source);
  a.bySource[normalizedSource] = a.bySource[normalizedSource] || 0;
  a.bySourceStats[normalizedSource] = a.bySourceStats[normalizedSource] || {
    visits: 0,
    leads: 0,
  };
  a.bySourceStats[normalizedSource].leads += 1;
  if (variant) {
    a.byVariant[variant] = a.byVariant[variant] || { visits: 0, leads: 0 };
    a.byVariant[variant].leads += 1;
  }
  saveAnalytics(a);
}

export async function clearAnalytics(config?: SiteConfig): Promise<boolean> {
  if (!isBrowser()) return false;
  if (config?.admin.storageMode === "database") {
    try {
      const response = await fetch(
        `${config.admin.supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/reset_funnel_analytics`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: config.admin.supabaseAnonKey,
            Authorization: `Bearer ${bearer(config.admin.supabaseAnonKey)}`,
          },
          body: "{}",
        },
      );
      if (!response.ok) return false;
      cloudAnalyticsState = emptyAnalytics();
      window.dispatchEvent(
        new CustomEvent<AnalyticsState>(ANALYTICS_UPDATED_EVENT, {
          detail: emptyAnalytics(),
        }),
      );
      return true;
    } catch {
      return false;
    }
  }
  window.localStorage.removeItem(ANALYTICS_KEY);
  window.dispatchEvent(
    new CustomEvent<AnalyticsState>(ANALYTICS_UPDATED_EVENT, {
      detail: emptyAnalytics(),
    }),
  );
  return true;
}

/* ------------------------------- SUPABASE --------------------------------- */

/** Ghi config vào bảng `site_config` (id=1) qua Supabase REST. Best-effort. */
async function syncConfigToSupabase(config: SiteConfig): Promise<boolean> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 5_000);
  try {
    const { supabaseUrl, supabaseAnonKey } = config.admin;
    const cloudConfig = structuredClone(config);
    cloudConfig.admin.supabaseAnonKey = "";
    cloudConfig.admin.backupCronToken = "";
    cloudConfig.emailAutomation.resendApiKey = "";
    cloudConfig.emailAutomation.gmailClientId = "";
    cloudConfig.emailAutomation.gmailClientSecret = "";
    cloudConfig.emailAutomation.gmailRefreshToken = "";
    cloudConfig.tracking.tiktokAccessToken = "";
    const response = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/rest/v1/${CLOUD_CONFIG_TABLE}?on_conflict=id`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${bearer(supabaseAnonKey)}`,
        },
        body: JSON.stringify([
          { id: 1, data: cloudConfig, updated_at: new Date().toISOString() },
        ]),
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      console.warn(`Supabase config sync failed [${response.status}]`);
    }
    return response.ok;
  } catch (err) {
    console.warn("Supabase config sync failed:", (err as Error).message);
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

export interface LocalMigrationResult {
  configSynced: boolean;
  analyticsSynced: boolean;
  leadsFound: number;
  leadsUploaded: number;
  leadsSkipped: number;
  leadsFailed: number;
}

/** Đẩy config và các lead LocalStorage lên Supabase, không xóa dữ liệu local. */
export async function migrateLocalDataToSupabase(
  config: SiteConfig,
): Promise<LocalMigrationResult> {
  const result: LocalMigrationResult = {
    configSynced: false,
    analyticsSynced: false,
    leadsFound: 0,
    leadsUploaded: 0,
    leadsSkipped: 0,
    leadsFailed: 0,
  };
  if (
    !isBrowser() ||
    config.admin.storageMode !== "database" ||
    !config.admin.supabaseUrl ||
    !config.admin.supabaseAnonKey
  ) {
    return result;
  }

  const configResponse = await fetch(
    `${config.admin.supabaseUrl.replace(/\/$/, "")}/rest/v1/${CLOUD_CONFIG_TABLE}?on_conflict=id`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
        apikey: config.admin.supabaseAnonKey,
        Authorization: `Bearer ${bearer(config.admin.supabaseAnonKey)}`,
      },
      body: JSON.stringify([
        {
          id: 1,
          data: (() => {
            const cloudConfig = structuredClone(config);
            cloudConfig.admin.supabaseAnonKey = "";
            cloudConfig.admin.backupCronToken = "";
            cloudConfig.emailAutomation.resendApiKey = "";
            cloudConfig.emailAutomation.gmailClientId = "";
            cloudConfig.emailAutomation.gmailClientSecret = "";
            cloudConfig.emailAutomation.gmailRefreshToken = "";
            cloudConfig.tracking.tiktokAccessToken = "";
            return cloudConfig;
          })(),
          updated_at: new Date().toISOString(),
        },
      ]),
    },
  );
  result.configSynced = configResponse.ok;
  result.analyticsSynced = await syncAnalyticsToSupabase(
    loadAnalytics(),
    config,
  );

  const migrated = new Set<string>();
  try {
    const raw = window.localStorage.getItem(LOCAL_MIGRATION_KEY);
    for (const id of raw ? (JSON.parse(raw) as unknown[]) : []) {
      if (typeof id === "string") migrated.add(id);
    }
  } catch {
    /* ignore malformed migration marker */
  }

  const leads = loadLeads();
  result.leadsFound = leads.length;
  for (const lead of leads) {
    if (migrated.has(lead.id)) {
      result.leadsSkipped += 1;
      continue;
    }
    const ok = await pushLeadToSupabase(
      lead,
      config.admin.supabaseUrl,
      config.admin.supabaseAnonKey,
    );
    if (ok) {
      migrated.add(lead.id);
      result.leadsUploaded += 1;
    } else {
      result.leadsFailed += 1;
    }
  }
  try {
    window.localStorage.setItem(
      LOCAL_MIGRATION_KEY,
      JSON.stringify([...migrated].slice(-1000)),
    );
  } catch {
    /* ignore storage quota */
  }
  return result;
}

export type SupabaseConnectionStatus =
  | { ok: true; schemaReady: true }
  | { ok: true; schemaReady: false; reason: "missing_schema" }
  | { ok: false; reason: "invalid_url" | "unauthorized" | "network" };

export async function testSupabaseConnection(
  url: string,
  key: string,
): Promise<SupabaseConnectionStatus> {
  const normalizedUrl = url.trim().replace(/\/$/, "");
  const normalizedKey = key.trim();
  if (!/^https:\/\/[^/]+\.supabase\.co$/i.test(normalizedUrl)) {
    return { ok: false, reason: "invalid_url" };
  }
  if (!normalizedKey) return { ok: false, reason: "unauthorized" };
  try {
    const res = await fetch(
      `${normalizedUrl}/rest/v1/${CLOUD_CONFIG_TABLE}?select=id&limit=1`,
      {
        headers: {
          apikey: normalizedKey,
          Authorization: `Bearer ${bearer(normalizedKey)}`,
        },
      },
    );
    if (res.ok) return { ok: true, schemaReady: true };
    if (res.status === 404) {
      const body = await res.text().catch(() => "");
      if (body.includes("PGRST205")) {
        return { ok: true, schemaReady: false, reason: "missing_schema" };
      }
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, reason: "unauthorized" };
    }
    return { ok: false, reason: "network" };
  } catch {
    return { ok: false, reason: "network" };
  }
}
