import useSWR from 'swr';
import { useMemo } from 'react';

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'to',
  'of',
  'for',
  'in',
  'on',
  'with',
  'and',
  'or',
  'is',
  'are',
  'by',
  'from',
  'at',
  'as',
  'ai',
  'new',
  'how',
  'what',
  'why',
  'will',
  'about',
  'after',
  'over',
  'into',
  'your',
  'you',
  'that',
  'this',
  'its',
  'their',
]);

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function summarizeKeywords(titles, topN = 24) {
  const freq = new Map();
  for (const title of titles) {
    const tokens = String(title || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
    for (const token of tokens) {
      freq.set(token, (freq.get(token) || 0) + 1);
    }
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }));
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function fetchSummary() {
  const basePath = import.meta.env.BASE_URL || '/';
  const [latest24, latest7d, sourceStatus, analysisInput] = await Promise.all([
    fetchJson(`${basePath}data/collected/latest-24h.json`),
    fetchJson(`${basePath}data/collected/latest-7d.json`),
    fetchJson(`${basePath}data/collected/source-status.json`),
    fetchJson(`${basePath}data/ai-input/analysis-input-24h.json`),
  ]);

  if (!latest24 || !latest7d) {
    throw new Error('missing latest-24h.json or latest-7d.json');
  }

  const total24 = toNumber(latest24.total_items);
  const raw24 = toNumber(latest24.total_items_raw);
  const total7d = toNumber(latest7d.total_items);
  const raw7d = toNumber(latest7d.total_items_raw);
  const aiRaw24 = toNumber(latest24.total_items_ai_raw);
  const dedupRate24 = raw24 > 0 ? (raw24 - total24) / raw24 : 0;
  const dedupRate7d = raw7d > 0 ? (raw7d - total7d) / raw7d : 0;
  const aiFocusedRate24 = raw24 > 0 ? aiRaw24 / raw24 : 0;

  const siteStats24 = Array.isArray(latest24.site_stats) ? latest24.site_stats : [];
  const siteStats7d = Array.isArray(latest7d.site_stats) ? latest7d.site_stats : [];
  const topSites24 = [...siteStats24].sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 10);
  const topSites7d = [...siteStats7d].sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 10);

  const statusSites = Array.isArray(sourceStatus?.sites) ? sourceStatus.sites : [];
  const successCount = statusSites.filter((s) => s.ok).length;
  const failCount = statusSites.length - successCount;
  const successRate = statusSites.length ? successCount / statusSites.length : 0;
  const slowestSources = [...statusSites]
    .sort((a, b) => (b.duration_ms || 0) - (a.duration_ms || 0))
    .slice(0, 10);

  const latestItems = Array.isArray(latest24.items) ? latest24.items : [];
  const titlePool = latestItems
    .map((item) => item?.title || '')
    .filter(Boolean)
    .slice(0, 800);
  const topKeywords = summarizeKeywords(titlePool, 24);

  const timeline = [
    {
      date: latest24.generated_at_local || latest24.generated_at || '',
      label: 'Today',
      total_items: total24,
      total_items_raw: raw24,
    },
  ];

  const topEvents = Array.isArray(analysisInput?.top_events)
    ? analysisInput.top_events.slice(0, 12).map((e) => ({
        event_id: e.event_id || '',
        title: e.title || '',
        title_zh: e.title_zh || '',
        site_name: e.site_name || '',
        source: e.source || '',
        published_at: e.published_at || '',
        related_count: toNumber(e.related_count),
        url: e.url || '',
      }))
    : [];

  return {
    generated_at: latest24.generated_at || '',
    generated_at_local: latest24.generated_at_local || '',
    metrics: {
      total_24h: total24,
      total_7d: total7d,
      raw_24h: raw24,
      raw_7d: raw7d,
      dedup_rate_24h: dedupRate24,
      dedup_rate_7d: dedupRate7d,
      ai_focused_rate_24h: aiFocusedRate24,
      success_sources: successCount,
      failed_sources: failCount,
      source_success_rate: successRate,
      source_count_24h: toNumber(latest24.site_count),
      source_count_status: statusSites.length,
    },
    charts: {
      top_sites_24h: topSites24,
      top_sites_7d: topSites7d,
      source_health: [
        { label: 'OK', value: successCount },
        { label: 'Failed', value: failCount },
      ],
      timeline_24h_total: timeline,
      top_keywords: topKeywords,
    },
    source_status: {
      generated_at: sourceStatus?.generated_at || '',
      sites: statusSites,
      slowest_sources: slowestSources,
    },
    top_events: topEvents,
  };
}

export function useNewsSummary() {
  const { data, isLoading, error, isValidating, mutate } = useSWR(
    'static-news-summary',
    fetchSummary,
    swrOptions
  );

  return useMemo(
    () => ({
      summary: data || null,
      summaryLoading: isLoading,
      summaryError: error,
      summaryValidating: isValidating,
      refreshSummary: mutate,
    }),
    [data, error, isLoading, isValidating, mutate]
  );
}
