import { CONFIG } from 'src/global-config';

import { CollectorSummaryView } from 'src/sections/collector-summary/view';

const metadata = { title: `Collector Summary | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>
      <CollectorSummaryView />
    </>
  );
}

