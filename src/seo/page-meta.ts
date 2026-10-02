/** Метаданные страницы для `<head>`: их принимают `SeoHead` и все layouts. */
export interface SeoProps {
  title: string;
  description?: string;
  canonical?: string;
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: "website" | "article";
  ogImage?: string;
  ogImageAlt?: string;
  twitterCard?: "summary" | "summary_large_image";
  viewport?: string;
  themeColor?: string | null;
  includeIcons?: boolean;
}
