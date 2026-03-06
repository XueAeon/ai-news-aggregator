import { CONFIG } from 'src/global-config';

import { CollectorSummaryView } from 'src/sections/collector-summary/view';

// ----------------------------------------------------------------------

const metadata = { title: `Home | Dashboard - ${CONFIG.appName}` };

export default function DashboardHomePage() {
  return (
    <>
      <title>{metadata.title}</title>
      <CollectorSummaryView />
    </>
  );
}
