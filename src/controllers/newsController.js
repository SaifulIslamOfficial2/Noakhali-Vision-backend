import fs from "fs";
import News from "../models/News.js";
import { sendPushToAll } from "./pushController.js";

// ─── Slug helper (Bengali + English safe) ────────────────────────────────────
const bn2en = {
  'অ':'a','আ':'a','ই':'i','ঈ':'i','উ':'u','ঊ':'u','এ':'e','ঐ':'oi','ও':'o','ঔ':'ou',
  'ক':'k','খ':'kh','গ':'g','ঘ':'gh','ঙ':'ng',
  'চ':'ch','ছ':'chh','জ':'j','ঝ':'jh','ঞ':'n',
  'ট':'t','ঠ':'th','ড':'d','ঢ':'dh','ণ':'n',
  'ত':'t','থ':'th','দ':'d','ধ':'dh','ন':'n',
  'প':'p','ফ':'ph','ব':'b','ভ':'bh','ম':'m',
  'য':'j','র':'r','ল':'l','শ':'sh','ষ':'sh','স':'s','হ':'h',
  'ড়':'r','ঢ়':'rh','য়':'y','ৎ':'t','ং':'ng','ঃ':'h','ঁ':'n',
  'া':'a','ি':'i','ী':'i','ু':'u','ূ':'u','ে':'e','ৈ':'oi','ো':'o','ৌ':'ou',
  '০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9',
};

function makeSlug(text) {
  let result = '';
  for (const ch of text) result += bn2en[ch] ?? ch;
  const base = result.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base || `news-${Date.now()}`;
}

/** Ensure slug is unique — appends -2, -3 … if needed */
async function uniqueSlug(raw, excludeId = null) {
  let slug = raw;
  let i = 1;
  while (true) {
    const q = { slug };
    if (excludeId) q._id = { $ne: excludeId };
    const exists = await News.exists(q);
    if (!exists) return slug;
    i++;
    slug = `${raw}-${i}`;
  }
}

// ─── Query builder ────────────────────────────────────────────────────────────
const buildQuery = (req) => {
  const x = {};
  if (!req.user || !req.query.includeDrafts) x.status = "published";
  if (req.user && req.query.status) x.status = req.query.status;
  if (req.query.location) x.location = req.query.location;
  if (req.query.category) x.category = req.query.category;
  if (req.query.search) x.title = { $regex: req.query.search, $options: "i" };
  return x;
};

// ─── Controllers ──────────────────────────────────────────────────────────────
export const getNews = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 12);
    const skip  = (page - 1) * limit;
    const query = buildQuery(req);
    const [news, total] = await Promise.all([
      News.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("author","name"),
      News.countDocuments(query),
    ]);
    res.json({ news, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const getNewsBySlug = async (req, res) => {
  try {
    const news = await News.findOne({ slug: req.params.slug, status: "published" }).populate("author","name");
    if (!news) return res.status(404).json({ message: "News not found" });
    res.json({ news });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const getRelatedNews = async (req, res) => {
  try {
    const news = await News.findOne({ slug: req.params.slug, status: "published" });
    if (!news) return res.json({ related: [] });
    const related = await News.find({
      status: "published",
      _id: { $ne: news._id },
      $or: [{ category: news.category }, { location: news.location }],
    }).sort({ createdAt: -1 }).limit(4);
    res.json({ related });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const getNewsById = async (req, res) => {
  try {
    res.json({ news: await News.findById(req.params.id) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const galleryPaths = (req) =>
  (req.files?.gallery || []).map(f => `/uploads/${f.filename}`);

export const createNews = async (req, res) => {
  try {
    const gallery = galleryPaths(req);

    // Fix slug: if empty or invalid, generate from title
    const rawSlug = req.body.slug?.trim() || makeSlug(req.body.title || "");
    const slug = await uniqueSlug(makeSlug(rawSlug) || makeSlug(req.body.title || `news-${Date.now()}`));

    const news = await News.create({
      ...req.body,
      slug,
      image: req.files?.image?.[0] ? `/uploads/${req.files.image[0].filename}` : (req.file ? `/uploads/${req.file.filename}` : ""),
      gallery,
      author: req.user._id,
    });

    if (news.status === "published") {
      const siteUrl = process.env.CLIENT_URL?.split(",")[0] || "";
      sendPushToAll({
        title: "Noakhali Vision – নতুন সংবাদ",
        body: news.title.slice(0, 120),
        url: `${siteUrl}/news/${news.slug}`,
        tag: `news-${news._id}`,
      }).catch(console.error);
    }

    res.status(201).json({ news });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const updateNews = async (req, res) => {
  try {
    const old = await News.findById(req.params.id);
    const u = { ...req.body };

    // Fix slug on update too
    if (u.slug) {
      const rawSlug = u.slug.trim();
      u.slug = await uniqueSlug(makeSlug(rawSlug) || makeSlug(u.title || old.title), req.params.id);
    }

    const mainFile = req.files?.image?.[0] || req.file;
    if (mainFile) {
      if (old?.image?.startsWith("/uploads/"))
        fs.rmSync(old.image.replace("/uploads/", "uploads/"), { force: true });
      u.image = `/uploads/${mainFile.filename}`;
    }

    const newGallery = galleryPaths(req);
    if (newGallery.length) {
      u.gallery = [...(old?.gallery || []), ...newGallery];
    }

    const news = await News.findByIdAndUpdate(req.params.id, u, { new: true, runValidators: true });

    if (u.status === "published" && old?.status !== "published") {
      const siteUrl = process.env.CLIENT_URL?.split(",")[0] || "";
      sendPushToAll({
        title: "Noakhali Vision – নতুন সংবাদ",
        body: news.title.slice(0, 120),
        url: `${siteUrl}/news/${news.slug}`,
        tag: `news-${news._id}`,
      }).catch(console.error);
    }

    res.json({ news });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteNews = async (req, res) => {
  try {
    await News.findByIdAndDelete(req.params.id);
    res.json({ message: "News deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
