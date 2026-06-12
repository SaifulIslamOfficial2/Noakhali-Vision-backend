import News from "../models/News.js";

const esc = str =>
  String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// GET /api/rss  OR  /rss.xml
export async function rss(req, res) {
  try {
    const siteUrl   = (process.env.CLIENT_URL || "https://noakhalivision.com").split(",")[0].trim();
  const siteTitle = "Noakhali Vision | নোয়াখালী ভিশন";
  const siteDesc  = "নোয়াখালীর প্রথম AI-চালিত বাংলা ডিজিটাল সংবাদ মাধ্যম";

  const news = await News.find({ status: "published" })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const items = news.map(n => {
    const link   = `${siteUrl}/news/${n.slug}`;
    const pubDate = new Date(n.createdAt).toUTCString();
    const img    = n.image ? `${siteUrl}${n.image}` : "";
    const thumb  = img ? `<media:thumbnail url="${esc(img)}" />` : "";
    const encl   = img ? `<enclosure url="${esc(img)}" type="image/jpeg" length="0" />` : "";

    return `
    <item>
      <title>${esc(n.title)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="true">${esc(link)}</guid>
      <description>${esc(n.content.replace(/<[^>]+>/g, "").slice(0, 300))}...</description>
      <category>${esc(n.category)}</category>
      <pubDate>${pubDate}</pubDate>
      ${thumb}
      ${encl}
    </item>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${esc(siteTitle)}</title>
    <link>${esc(siteUrl)}</link>
    <description>${esc(siteDesc)}</description>
    <language>bn</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${esc(siteUrl)}/rss.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${esc(siteUrl)}/logo.svg</url>
      <title>${esc(siteTitle)}</title>
      <link>${esc(siteUrl)}</link>
    </image>
${items}
  </channel>
</rss>`;

  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.send(xml);
  } catch (err) { res.status(500).json({ message: err.message }); }
}
