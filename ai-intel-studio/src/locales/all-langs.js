// core (MUI)
import {
  jaJP as jaJPCore,
  zhCN as zhCNCore,
} from '@mui/material/locale';
// date pickers (MUI)
import {
  enUS as enUSDate,
  jaJP as jaJPDate,
  zhCN as zhCNDate,
} from '@mui/x-date-pickers/locales';
// data grid (MUI)
import {
  enUS as enUSDataGrid,
  jaJP as jaJPDataGrid,
  zhCN as zhCNDataGrid,
} from '@mui/x-data-grid/locales';

// ----------------------------------------------------------------------

export const allLangs = [
  {
    value: 'en',
    label: 'English',
    countryCode: 'GB',
    adapterLocale: 'en',
    numberFormat: { code: 'en-US', currency: 'USD' },
    systemValue: {
      components: { ...enUSDate.components, ...enUSDataGrid.components },
    },
  },
  {
    value: 'cn',
    label: '中文',
    countryCode: 'CN',
    adapterLocale: 'zh-cn',
    numberFormat: { code: 'zh-CN', currency: 'CNY' },
    systemValue: {
      components: { ...zhCNCore.components, ...zhCNDate.components, ...zhCNDataGrid.components },
    },
  },
  {
    value: 'ja',
    label: '日本語',
    countryCode: 'JP',
    adapterLocale: 'ja',
    numberFormat: { code: 'ja-JP', currency: 'JPY' },
    systemValue: {
      components: { ...jaJPCore.components, ...jaJPDate.components, ...jaJPDataGrid.components },
    },
  },
];

/**
 * Country code:
 * https://flagcdn.com/en/codes.json
 *
 * Number format code:
 * https://gist.github.com/raushankrjha/d1c7e35cf87e69aa8b4208a8171a8416
 */
