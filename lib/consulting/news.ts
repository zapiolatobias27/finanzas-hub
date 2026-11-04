import "server-only";
import { parseRss, selectNews, type ClassifiedNews } from "./news-core";

// Feeds RSS públicos y gratuitos de medios financieros. Se cachean 30 minutos en el server.
export const NEWS_FEEDS = [
  { source: "Ámbito", url: "https://www.ambito.com/rss/pages/finanzas.xml" },
  { source: "Ámbito", url: "https://www.ambito.com/rss/pages/economia.xml" },
  { source: "El Cronista", url: "https://www.cronista.com/files/rss/economia-politica.xml" },
  { source: "Infobae", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/economia/" },
  { source: "La Nación", url: "https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/economia/?outputType=xml" },
  { source: "iProfesional", url: "https://www.iprofesional.com/rss/finanzas" },
];

const TTL_SECONDS = 30 * 60;

export async function getMarketNews(): Promise<ClassifiedNews[]> {
  const results = await Promise.all(
    NEWS_FEEDS.map(async (f) => {
      try {
        const res = await fetch(f.url, {
          headers: { "user-agent": "FinanzasHub/0.1 (+lector RSS)" },
          next: { revalidate: TTL_SECONDS },
        });
        if (!res.ok) return [];
        return parseRss(await res.text(), f.source);
      } catch (e) {
        console.error("[news]", f.source, e);
        return [];
      }
    }),
  );
  return selectNews(results.flat(), new Date());
}
