import { describe, expect, it } from "vitest";
import { classify, newsForPlan, parseRss, selectNews, toPlainText } from "./news-core";

const xml = `<?xml version="1.0"?><rss><channel>
<item>
  <title><![CDATA[El riesgo país vuelve a subir y los bonos caen]]></title>
  <link>https://www.infobae.com/economia/2026/11/04/riesgo-pais/</link>
  <description><![CDATA[Los Globales retroceden &amp; el Merval acompaña. <iframe><script>alert(1)</script></iframe>]]></description>
  <pubDate>Wed, 04 Nov 2026 13:00:00 GMT</pubDate>
</item>
<item>
  <title>Bitcoin supera los USD 80.000</title>
  <link>https://www.ambito.com/finanzas/bitcoin-n1</link>
  <description>El precio de la cripto sube 5%.</description>
  <pubDate>Wed, 04 Nov 2026 12:00:00 GMT</pubDate>
</item>
<item>
  <title>Receta de empanadas para el finde</title>
  <link>https://www.ambito.com/otros/empanadas</link>
  <pubDate>Wed, 04 Nov 2026 11:00:00 GMT</pubDate>
</item>
<item>
  <title>Bitcoin supera los USD 80.000!</title>
  <link>https://www.cronista.com/otra-url</link>
  <pubDate>Wed, 04 Nov 2026 10:00:00 GMT</pubDate>
</item>
<item>
  <title>Licitación del Tesoro: cómo quedaron las tasas de las LECAP</title>
  <link>https://www.cronista.com/lecap</link>
  <pubDate>Fri, 30 Oct 2026 10:00:00 GMT</pubDate>
</item>
</channel></rss>`;

const now = new Date("2026-11-04T15:00:00Z");

describe("RSS", () => {
  it("parsea, limpia HTML/scripts y decodifica entidades", () => {
    const items = parseRss(xml, "Test");
    expect(items).toHaveLength(5);
    expect(items[0].title).toBe("El riesgo país vuelve a subir y los bonos caen");
    expect(items[0].summary).toBe("Los Globales retroceden & el Merval acompaña.");
    expect(items[0].publishedAt).toBe("2026-11-04T13:00:00.000Z");
  });

  it("clasifica por tema", () => {
    expect(toPlainText("<b>Dólar MEP</b> hoy")).toBe("Dólar MEP hoy");
    const [bonos, btc] = parseRss(xml, "Test");
    expect(classify(bonos)).toEqual(expect.arrayContaining(["bonos", "acciones"]));
    expect(classify(btc)).toEqual(["cripto"]);
  });

  it("descarta irrelevantes, duplicadas y viejas", () => {
    const news = selectNews(parseRss(xml, "Test"), now);
    expect(news.map((n) => n.title)).toEqual(["El riesgo país vuelve a subir y los bonos caen", "Bitcoin supera los USD 80.000"]);
  });

  it("filtra notas de rutina y licitaciones que no son de deuda", () => {
    const extra = parseRss(
      `<rss><item><title>Dólar hoy: a cuánto cotiza este miércoles</title><link>https://x.com/a</link><pubDate>Wed, 04 Nov 2026 14:00:00 GMT</pubDate></item>
       <item><title>El Gobierno postergó la licitación del tren</title><link>https://x.com/b</link><pubDate>Wed, 04 Nov 2026 14:00:00 GMT</pubDate></item>
       <item><title>Licitación del Tesoro: rollover del 110%</title><link>https://x.com/c</link><pubDate>Wed, 04 Nov 2026 14:00:00 GMT</pubDate></item></rss>`,
      "Test",
    );
    expect(selectNews(extra, now).map((n) => n.link)).toEqual(["https://x.com/c"]);
  });

  it("elige las noticias según la cartera", () => {
    const news = selectNews(parseRss(xml, "Test"), now);
    expect(newsForPlan(news, ["cripto"]).map((n) => n.topics)).toEqual([["cripto"]]);
    expect(newsForPlan(news, ["liquidez"])).toHaveLength(0);
  });
});
