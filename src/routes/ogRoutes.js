import express from "express";
import News from "../models/News.js";

const router = express.Router();

// Social media bots detect করার জন্য
const BOT_AGENTS = /facebookexternalhit|Twitterbot|WhatsApp|LinkedInBot|TelegramBot|Slackbot|Discordbot|vkShare|W3C_Validator|Pinterest|Google|bingbot/i;

router.get("/news/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const news = await News.findOne({ slug, status: "published" }).lean();

    if (!news) {
      return res.redirect(302, `${process.env.CLIENT_URL}/news/${slug}`);
    }

    const siteUrl = process.env.CLIENT_URL || "https://noakhalivision.com";
    const backendUrl = process.env.BACKEND_URL || `https://${req.hostname}`;

    // Image URL ঠিক করা
    let imageUrl = news.image || "/og.svg";
    if (imageUrl && !imageUrl.startsWith("http")) {
      imageUrl = `${backendUrl}/${imageUrl.replace(/^\//, "")}`;
    }

    const title = news.title || "Noakhali Vision";
    const description = news.content
      ? news.content.replace(/<[^>]*>/g, "").substring(0, 200) + "..."
      : "নোয়াখালী জেলার সর্বশেষ সংবাদ";
    const pageUrl = `${siteUrl}/news/${slug}`;

    // Bot হলে OG HTML দাও, না হলে redirect করো
    const ua = req.headers["user-agent"] || "";
    const isBot = BOT_AGENTS.test(ua);

    if (!isBot) {
      return res.redirect(302, pageUrl);
    }

    // Bot এর জন্য OG meta tags সহ HTML
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Noakhali Vision | নোয়াখালী ভিশন" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="bn_BD" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${imageUrl}" />

  <!-- WhatsApp এর জন্য redirect -->
  <meta http-equiv="refresh" content="0; url=${pageUrl}" />
</head>
<body>
  <a href="${pageUrl}">Redirecting...</a>
</body>
</html>`);
  } catch (err) {
    console.error("OG route error:", err);
    res.redirect(302, `${process.env.CLIENT_URL}/news/${req.params.slug}`);
  }
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default router;
