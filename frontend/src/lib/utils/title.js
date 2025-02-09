import { locale } from '$lib/i18n';
import { get } from 'svelte/store';

/**
 * 设置页面标题
 * @param {string} pageTitle - 页面特定的标题
 */
export function setPageTitle(pageTitle) {
  const currentLocale = get(locale);
  const siteName = currentLocale === 'zh' ? '绘札' : 'Drawix';
  document.title = pageTitle ? `${pageTitle} - ${siteName}` : siteName;
}

// 订阅语言变化
locale.subscribe(currentLocale => {
  const siteName = currentLocale === 'zh' ? '绘札' : 'Drawix';
  // 如果当前标题包含网站名称，则更新它
  const currentTitle = document.title;
  if (currentTitle.includes('Drawix') || currentTitle.includes('绘札')) {
    const pageTitle = currentTitle.split(' - ')[0];
    document.title = pageTitle ? `${pageTitle} - ${siteName}` : siteName;
  }
}); 