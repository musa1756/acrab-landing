export const APP_STORE_URL = "https://apps.apple.com/ru/app/id6763663680";
export const RU_STORE_URL = "https://www.rustore.ru/catalog/app/com.acrab";

export function storeTarget(userAgent: string, maxTouchPoints: number): string | null {
  const isIOS = /iPad|iPhone|iPod/.test(userAgent)
    || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  const isAndroid = /Android/.test(userAgent);
  return isIOS ? APP_STORE_URL : isAndroid ? RU_STORE_URL : null;
}
