import type { ArchiveItem } from '../types.js';
import { normalizeUrl } from '../utils/url.js';
import { parseISO } from '../utils/date.js';

function eventTime(record: ArchiveItem): Date | null {
  if (record.site_id === 'opmlrss') {
    return parseISO(record.published_at);
  }
  return parseISO(record.published_at) || parseISO(record.first_seen_at);
}

function normalizeTitleForDedupe(title: string): string {
  return (title || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\u3002\uff01\uff1f\uff0c\uff1a\uff1b.!?,:;]+$/g, '')
    .trim();
}

function compareItemsByRecency(a: ArchiveItem, b: ArchiveItem): number {
  const timeA = eventTime(a)?.getTime() ?? 0;
  const timeB = eventTime(b)?.getTime() ?? 0;
  if (timeA !== timeB) return timeB - timeA;
  return (b.id || '').localeCompare(a.id || '');
}

function pickBestItem(values: ArchiveItem[]): ArchiveItem {
  return values.reduce((best, current) => {
    return compareItemsByRecency(current, best) < 0 ? current : best;
  });
}

export function dedupeItemsByTitleUrl(
  items: ArchiveItem[]
): ArchiveItem[] {
  const groups = new Map<string, ArchiveItem[]>();

  for (const item of items) {
    const siteId = (item.site_id || '').toLowerCase();
    const title = normalizeTitleForDedupe(item.title_original || item.title || '');
    const url = normalizeUrl(item.url || '');

    const key = siteId === 'aihubtoday' ? `url::${url}` : `${title}||${url}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }

  const result: ArchiveItem[] = [];

  for (const values of groups.values()) {
    if (values.length === 0) continue;
    result.push(pickBestItem(values));
  }

  result.sort(compareItemsByRecency);

  return result;
}

function isHubtodayPlaceholderTitle(title: string): boolean {
  const t = (title || '').trim();
  if (!t) return true;
  if (t.includes('详情见官方介绍')) return true;
  return ['原文链接', '查看详情', '点击查看', '详情'].includes(t);
}

function isHubtodayGenericAnchorTitle(title: string): boolean {
  const t = (title || '').trim();
  if (!t) return true;
  if (isHubtodayPlaceholderTitle(t)) return true;
  return /\(AI资讯\)\s*$/.test(t);
}

export function normalizeAihubTodayRecords(items: ArchiveItem[]): ArchiveItem[] {
  const byUrl = new Map<string, ArchiveItem[]>();
  const keep: ArchiveItem[] = [];

  for (const item of items) {
    if (item.site_id !== 'aihubtoday') {
      keep.push(item);
      continue;
    }
    const url = normalizeUrl(item.url || '');
    if (!url) continue;
    if (!byUrl.has(url)) {
      byUrl.set(url, []);
    }
    byUrl.get(url)!.push(item);
  }

  for (const group of byUrl.values()) {
    if (group.length === 0) continue;

    const preferred = group.filter((g) => !isHubtodayGenericAnchorTitle(g.title || ''));
    const source = preferred.length > 0 ? preferred : group;

    const best = source.reduce((best, current) => {
      const bestTime = eventTime(best);
      const currentTime = eventTime(current);
      if (!bestTime && !currentTime) {
        return (best.id || '') > (current.id || '') ? best : current;
      }
      if (!bestTime) return current;
      if (!currentTime) return best;
      if (currentTime > bestTime) return current;
      if (currentTime < bestTime) return best;
      return (best.id || '') > (current.id || '') ? best : current;
    });

    keep.push(best);
  }

  keep.sort((a, b) => {
    const timeA = eventTime(a)?.getTime() ?? 0;
    const timeB = eventTime(b)?.getTime() ?? 0;
    return timeB - timeA;
  });

  return keep;
}
