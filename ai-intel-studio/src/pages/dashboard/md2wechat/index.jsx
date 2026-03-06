import { CONFIG } from 'src/global-config';

import { Md2WechatView } from 'src/sections/md2wechat/view';

const metadata = { title: `MD2WeChat | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>
      <Md2WechatView />
    </>
  );
}
