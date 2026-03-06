// ----------------------------------------------------------------------

export const fallbackLng = 'en';
export const languages = ['en', 'cn', 'ja'];
export const defaultNS = 'common';

// ----------------------------------------------------------------------

export function i18nOptions(lng = fallbackLng, ns = defaultNS) {
  return {
    // debug: true,
    lng,
    fallbackLng,
    ns,
    defaultNS,
    fallbackNS: defaultNS,
    supportedLngs: languages,
  };
}

// ----------------------------------------------------------------------

export const changeLangMessages = {
  en: {
    success: 'Language has been changed!',
    error: 'Error changing language!',
    loading: 'Loading...',
  },
  cn: {
    success: '语言已更改！',
    error: '更改语言时出错！',
    loading: '加载中...',
  },
  ja: {
    success: '言語が変更されました！',
    error: '言語変更中にエラーが発生しました！',
    loading: '読み込み中...',
  },
};
