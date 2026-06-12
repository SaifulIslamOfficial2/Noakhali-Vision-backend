export async function summarize(req, res) {
  const { content, title, lang = "bn" } = req.body;

  if (!content || !title)
    return res.status(400).json({ message: "content and title are required" });

  const apiKey = (process.env.GEMINI_API_KEY || "").trim();

  if (!apiKey || apiKey === "your-gemini-api-key-here")
    return res.status(503).json({ message: "GEMINI_API_KEY not configured in Railway variables" });

  const prompt = lang === "bn"
    ? `তুমি একজন দক্ষ বাংলা সংবাদ সম্পাদক। নিচের সংবাদটি পড়ে একটি সংক্ষিপ্ত ও ঝরঝরে সারসংক্ষেপ লেখো।

উদাহরণ স্টাইল:
"নোয়াখালীতে কিশোর গ্যাংয়ের দৌরাত্ম্য নিয়ে উদ্বেগ বাড়ছে। বিশেষ করে বেগমগঞ্জ উপজেলায় একের পর এক সহিংস ঘটনা, হামলা ও হত্যাকাণ্ডের অভিযোগে আইনশৃঙ্খলা পরিস্থিতি নিয়ে শঙ্কা প্রকাশ করেছেন স্থানীয়রা। পরিস্থিতি নিয়ন্ত্রণে দ্রুত ও কার্যকর পদক্ষেপের দাবি জানিয়েছেন সচেতন মহল।"

নিয়ম:
- ঠিক ৩-৪টি বাক্য, এর বেশি নয়
- প্রতিটি বাক্য ছোট ও তথ্যপূর্ণ
- সংবাদের মূল ঘটনা, কারণ ও দাবি/প্রতিক্রিয়া তুলে ধরবে
- সাবলীল ও সরল বাংলায় লিখবে
- কোনো ভূমিকা বা অতিরিক্ত কিছু লিখবে না

শিরোনাম: ${title}

সংবাদ: ${content.slice(0, 2000)}`
    : `You are a skilled news editor. Read the following news article and write a short, crisp summary.

Style example:
"Concerns are growing over teenage gang violence in Noakhali. Multiple incidents of attacks and alleged killings in Begumganj upazila have alarmed locals about law and order. Conscious citizens are demanding swift and effective action."

Rules:
- Exactly 3-4 sentences, no more
- Each sentence short and informative
- Cover the main event, cause, and reaction/demand
- Simple and clear language
- No introduction or extra content

Title: ${title}

Content: ${content.slice(0, 2000)}`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 400, temperature: 0.2 },
  });

  /* ── নতুন AQ. format এর জন্য X-goog-api-key header ── */
  const headers = {
    "Content-Type": "application/json",
    "x-goog-api-key": apiKey,
  };

  /* model name — নতুন format এ gemini-2.0-flash কাজ করে */
  const MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-flash-latest",
  ];

  let lastError = null;

  for (const model of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const response = await fetch(url, { method: "POST", headers, body });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.warn(`[summarize] ${model} failed ${response.status}:`, errData?.error?.message);
        lastError = errData?.error?.message || `HTTP ${response.status}`;
        continue; // পরের model চেষ্টা করো
      }

      const data    = await response.json();
      const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

      if (!summary) {
        lastError = "empty response";
        continue;
      }

      console.log(`[summarize] success with model: ${model}`);
      return res.json({ summary });

    } catch (err) {
      console.error(`[summarize] ${model} network error:`, err.message);
      lastError = err.message;
    }
  }

  return res.status(502).json({ message: "All Gemini models failed", detail: lastError });
}

/* ── Debug: Railway তে key আছে কিনা check ── */
export async function summarizeStatus(req, res) {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  const configured = key.length > 10 && key !== "your-gemini-api-key-here";
  return res.json({
    configured,
    keyFormat: configured ? (key.startsWith("AIza") ? "AIza (old)" : key.startsWith("AQ.") ? "AQ. (new)" : "unknown") : "not set",
    keyPrefix: configured ? key.slice(0, 10) + "..." : "(not set)",
  });
}

/* ── AI Title Generator ── */
export async function generateTitle(req, res) {
  const { content } = req.body;
  if (!content) return res.status(400).json({ message: "content is required" });

  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey || apiKey === "your-gemini-api-key-here")
    return res.status(503).json({ message: "GEMINI_API_KEY not configured" });

  const prompt = `তুমি একজন দক্ষ বাংলা সংবাদ সম্পাদক। নিচের সংবাদটি পড়ে একটি আকর্ষণীয় ও তথ্যসমৃদ্ধ বাংলা শিরোনাম লেখো।

নিয়ম:
- শিরোনামটি ১টিই লিখবে
- সর্বোচ্চ ১২-১৫ শব্দ
- সংবাদের মূল বিষয়টি স্পষ্টভাবে তুলে ধরবে
- আকর্ষণীয় ও পাঠকের মনোযোগ আকর্ষণকারী হবে
- কোনো উদ্ধৃতি চিহ্ন, নম্বর বা অতিরিক্ত কিছু লিখবে না
- শুধু শিরোনামটাই লিখবে

সংবাদ: ${content.slice(0, 2000)}`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 100, temperature: 0.4 },
  });

  const headers = {
    "Content-Type": "application/json",
    "x-goog-api-key": apiKey,
  };

  const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-flash-latest"];
  let lastError = null;

  for (const model of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const response = await fetch(url, { method: "POST", headers, body });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        lastError = errData?.error?.message || `HTTP ${response.status}`;
        continue;
      }

      const data = await response.json();
      const title = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

      if (!title) { lastError = "empty response"; continue; }

      return res.json({ title });
    } catch (err) {
      lastError = err.message;
    }
  }

  return res.status(502).json({ message: "AI title generation failed", detail: lastError });
}
