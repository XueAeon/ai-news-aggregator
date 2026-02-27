import type { RawItem } from '../types.js';
import { BaseFetcher } from './base.js';
import { parseDate } from '../utils/date.js';
import { joinUrl } from '../utils/url.js';

export class AiBaseDailyFetcher extends BaseFetcher {
  siteId = 'aibasedaily';
  siteName = 'AIbase Daily';

  async fetch(now: Date): Promise<RawItem[]> {
    const $ = await this.fetchHtml('https://news.aibase.com/zh/daily');
    const items: RawItem[] = [];
    const seen = new Set<string>();

    $("a[href^='/zh/daily/']").each((_, a) => {
      const $a = $(a);
      const href = ($a.attr('href') || '').trim();
      if (!href) return;

      const url = joinUrl('https://news.aibase.com', href);
      if (seen.has(url)) return;
      seen.add(url);

      const title = $a.find('.font600').first().text().replace(/\s+/g, ' ').trim();
      if (!title) return;

      const timeText = $a.find('.icon-rili').parent().text().replace(/\s+/g, ' ').trim();
      const publishedAt = parseDate(timeText, now) || now;

      items.push(
        this.createItem({
          source: 'AI日报',
          title,
          url,
          publishedAt,
          meta: { time_hint: timeText },
        })
      );
    });

    return items;
  }
}
