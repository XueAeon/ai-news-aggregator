import pLimit from 'p-limit';

import type { RawItem } from '../types.js';
import { parseUnixTimestamp, parseDate } from '../utils/date.js';
import { BaseFetcher } from './base.js';

interface HnHit {
  objectID?: string;
  title?: string;
  url?: string;
  story_url?: string;
  created_at?: string;
  created_at_i?: number;
  author?: string;
  points?: number;
  num_comments?: number;
}

interface HnSearchResponse {
  hits?: HnHit[];
}

const HN_AI_QUERIES = [
  'ai',
  'llm',
  'openai',
  'anthropic',
  'deepseek',
  'gemini',
  'qwen',
  'llama',
  'mistral',
  'agent',
  'robotics',
];

export class HackerNewsFetcher extends BaseFetcher {
  siteId = 'hackernews';
  siteName = 'Hacker News';

  async fetch(now: Date): Promise<RawItem[]> {
    const items: RawItem[] = [];
    const seen = new Set<string>();
    const since = Math.floor((now.getTime() - 7 * 24 * 60 * 60 * 1000) / 1000);
    const limit = pLimit(3);

    const tasks = HN_AI_QUERIES.map((query) =>
      limit(async () => {
        const params = new URLSearchParams({
          query,
          tags: 'story',
          hitsPerPage: '40',
          numericFilters: `created_at_i>${since}`,
        });
        const api = `https://hn.algolia.com/api/v1/search_by_date?${params.toString()}`;
        const data = await this.fetchJsonData<HnSearchResponse>(api);

        for (const hit of data.hits || []) {
          const title = (hit.title || '').trim();
          const objectId = (hit.objectID || '').trim();
          const url = (hit.url || hit.story_url || '').trim();
          if (!title) continue;

          const finalUrl = url || (objectId ? `https://news.ycombinator.com/item?id=${objectId}` : '');
          if (!finalUrl) continue;

          const key = `${title.toLowerCase()}||${finalUrl.toLowerCase()}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const publishedAt =
            parseUnixTimestamp(hit.created_at_i) || parseDate(hit.created_at || '', now) || now;

          items.push(
            this.createItem({
              source: 'Hacker News',
              title,
              url: finalUrl,
              publishedAt,
              meta: {
                hn_id: objectId || null,
                author: hit.author || null,
                points: typeof hit.points === 'number' ? hit.points : null,
                comments: typeof hit.num_comments === 'number' ? hit.num_comments : null,
                query,
              },
            })
          );
        }
      })
    );

    await Promise.all(tasks);

    items.sort((a, b) => (b.publishedAt?.getTime() || 0) - (a.publishedAt?.getTime() || 0));
    return items.slice(0, 180);
  }
}
