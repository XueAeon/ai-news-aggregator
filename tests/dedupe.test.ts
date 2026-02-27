import { describe, it, expect } from 'vitest';
import { dedupeItemsByTitleUrl } from '../src/filters/dedupe.js';
import type { ArchiveItem } from '../src/types.js';

function makeItem(partial: Partial<ArchiveItem>): ArchiveItem {
  return {
    id: partial.id || 'id',
    site_id: partial.site_id || 'opmlrss',
    site_name: partial.site_name || 'OPML RSS',
    source: partial.source || 'src',
    title: partial.title || 'title',
    url: partial.url || 'https://example.com/post',
    published_at: partial.published_at ?? '2026-02-27T06:00:00Z',
    first_seen_at: partial.first_seen_at || '2026-02-27T06:00:00Z',
    last_seen_at: partial.last_seen_at || '2026-02-27T06:00:00Z',
    title_original: partial.title_original,
    title_en: partial.title_en,
    title_zh: partial.title_zh,
    title_bilingual: partial.title_bilingual,
  };
}

describe('dedupeItemsByTitleUrl', () => {
  it('keeps output deterministic for duplicate groups', () => {
    const items = [
      makeItem({
        id: 'a',
        title: 'Same title',
        url: 'https://example.com/post?utm_source=x',
        published_at: '2026-02-27T05:00:00Z',
      }),
      makeItem({
        id: 'b',
        title: 'Same title',
        url: 'https://example.com/post',
        published_at: '2026-02-27T06:00:00Z',
      }),
    ];

    const first = dedupeItemsByTitleUrl(items);
    const second = dedupeItemsByTitleUrl(items);

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(first[0].id).toBe('b');
    expect(second[0].id).toBe('b');
  });

  it('normalizes title whitespace and trailing punctuation', () => {
    const items = [
      makeItem({
        id: 'a',
        title_original: 'OpenAI 发布新模型!!!',
        url: 'https://example.com/x',
      }),
      makeItem({
        id: 'b',
        title_original: 'OpenAI   发布新模型',
        url: 'https://example.com/x',
        published_at: '2026-02-27T07:00:00Z',
      }),
    ];

    const deduped = dedupeItemsByTitleUrl(items);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].id).toBe('b');
  });

  it('dedupes aihubtoday items by url', () => {
    const items = [
      makeItem({
        id: 'a',
        site_id: 'aihubtoday',
        title: '详情',
        url: 'https://example.com/news/1',
      }),
      makeItem({
        id: 'b',
        site_id: 'aihubtoday',
        title: '真正标题',
        url: 'https://example.com/news/1',
        published_at: '2026-02-27T08:00:00Z',
      }),
    ];

    const deduped = dedupeItemsByTitleUrl(items);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].id).toBe('b');
  });
});
