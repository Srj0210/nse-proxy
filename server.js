// server.js (ESM)
import express from "express";
import cors from "cors";
import fetchPkg from "node-fetch";
const fetch = global.fetch || fetchPkg;

const app = express();
app.use(cors());
app.disable("x-powered-by");

const PORT = process.env.PORT || 3000;

// ---- Simple in-memory cache ----
const cache = {};
function setCache(key, value, ttlSec = 30) {
  cache[key] = { ts: Date.now(), ttl: ttlSec * 1000, data: value };
}
function getCache(key) {
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > entry.ttl) { delete cache[key]; return null; }
  return entry.data;
}

// ---- Helper: fetch with UA and timeout ----
async function fetchText(url, timeoutMs = 7000) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NSE-Proxy/1.0)",
        "Accept": "*/*",
        "Accept-Language": "en-US"
      },
      redirect: "follow",
      signal: controller.signal
    });
    clearTimeout(id);
    const txt = await res.text();
    return { ok: res.ok, status: res.status, text: txt };
  } catch (e) {
    return { ok: false, status: 0, text: null, error: e.message };
  }
}

function looksLikeJSON(text) {
  if (!text) return false;
  const t = text.trim();
  return t.startsWith("{") || t.startsWith("[");
}

// ---- RSS simple parser (no dependency) ----
function parseRssToJson(xmlText, maxItems = 20) {
  if (!xmlText) return [];
  const items = [];
  const re = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xmlText)) && items.length < maxItems) {
    const block = m[1];
    const getTag = (tag) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
      const mm = r.exec(block);
      return mm ? mm[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
    };
    items.push({
      title: getTag("title"),
      link: getTag("link"),
      pubDate: getTag("pubDate")
    });
  }
  return items;
}

// ---- Generic safe JSON fetch with parse & fallback detection ----
async function safeGetJson(url) {
  const c = getCache(url);
  if (c) return c;

  const r = await fetchText(url, 9000);
  if (!r.ok || !r.text) {
    setCache(url, null, 10);
    return null;
  }

  const txt = r.text.trim();
  // If it's HTML or not JSON, return null
  if (!looksLikeJSON(txt)) {
    setCache(url, null, 10);
    return null;
  }
  try {
    const json = JSON.parse(txt);
    setCache(url, json, 20); // short cache
    return json;
  } catch (e) {
    setCache(url, null, 10);
    return null;
  }
}

// ---- ENDPOINTS ----

// Root / status
app.get("/", (req, res) => {
  res.json({ status: "NSE Proxy Running ✅", time: new Date().toISOString() });
});

// News (RSS) — basic parser, cached 3 minutes
app.get("/news", async (req, res) => {
  const cacheKey = "news_rss";
  const c = getCache(cacheKey);
  if (c) return res.json(c);

  const rssUrl = "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms";
  const r = await fetchText(rssUrl, 8000);
  let items = [];
  if (r.ok && r.text) {
    items = parseRssToJson(r.text, 25);
  }
  if (!items.length) {
    items = [{ title: "No live news", link: "", pubDate: new Date().toISOString() }];
  }
  setCache(cacheKey, items, 180);
  res.json(items);
});

// IPOs — tries multiple sources with fallbacks, cached 5 minutes
app.get("/ipos", async (req, res) => {
  const cacheKey = "ipos";
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  // try 1: NSE API
  const nseUrl = "https://www.nseindia.com/api/ipo-current-issues";
  let out = [];

  let j = await safeGetJson(nseUrl);
  if (j && Array.isArray(j)) { // sometimes NSE returns array directly
    out = j.map(i => ({
      name: i.companyName || i.name || i.symbol || "NSE IPO",
      open: i.openDate || i.startDate || i.open || "",
      close: i.closeDate || i.endDate || i.close || "",
      price: i.priceBand || i.price || i.priceBandString || ""
    }));
  } else if (j && j.data && Array.isArray(j.data)) {
    out = j.data.map(i => ({
      name: i.companyName || i.name || i.company || "",
      open: i.openDate || i.startDate || "",
      close: i.closeDate || i.endDate || "",
      price: i.priceBand || i.price || ""
    }));
  }

  // try 2: StockBhoomi
  if (!out.length) {
    const sbUrl = "https://api.stockbhoomi.com/api/v1/ipo";
    const sb = await safeGetJson(sbUrl);
    if (sb && (sb.data || sb)) {
      const arr = sb.data || sb;
      if (Array.isArray(arr)) {
        out = arr.map(i => ({
          name: i.name || i.title || "IPO",
          open: i.open || i.openDate || "",
          close: i.close || i.closeDate || "",
          price: i.price || ""
        }));
      }
    }
  }

  // fallback 3: static sample
  if (!out.length) {
    out = [{ name: "Fallback IPO", open: "2025-09-20", close: "2025-09-25", price: "₹100-₹120" }];
  }

  setCache(cacheKey, out, 300);
  res.json(out);
});

// Gainers (NSE -> StockBhoomi -> fallback), cached 45s
app.get("/gainers", async (req, res) => {
  const cacheKey = "gainers";
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  const candidates = [
    "https://www.nseindia.com/api/live-analysis-variations?index=gainers",
    "https://www.nseindia.com/api/live-analysis-equity-gainers",
    "https://www.nseindia.com/api/live-analysis?type=gainers"
  ];

  let out = [];
  for (const u of candidates) {
    const j = await safeGetJson(u);
    if (j) {
      // try to extract array in common shapes
      if (Array.isArray(j)) out = j;
      else if (j.data && Array.isArray(j.data)) out = j.data;
      else if (j.all && Array.isArray(j.all)) out = j.all;
      if (out.length) break;
    }
  }

  if (!out.length) {
    const sb = await safeGetJson("https://api.stockbhoomi.com/api/v1/gainers");
    if (sb && (sb.data || Array.isArray(sb))) {
      out = sb.data || sb;
    }
  }

  if (!out.length) {
    out = [{ symbol: "Fallback Gainer", change: "+1.00%" }];
  }

  setCache(cacheKey, out, 45);
  res.json(out);
});

// Losers (NSE -> StockBhoomi -> fallback), cached 45s
app.get("/losers", async (req, res) => {
  const cacheKey = "losers";
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  const candidates = [
    "https://www.nseindia.com/api/live-analysis-variations?index=loosers",
    "https://www.nseindia.com/api/live-analysis-variations?index=losers",
    "https://www.nseindia.com/api/live-analysis-equity-losers"
  ];

  let out = [];
  for (const u of candidates) {
    const j = await safeGetJson(u);
    if (j) {
      if (Array.isArray(j)) out = j;
      else if (j.data && Array.isArray(j.data)) out = j.data;
      if (out.length) break;
    }
  }

  if (!out.length) {
    const sb = await safeGetJson("https://api.stockbhoomi.com/api/v1/losers");
    if (sb && (sb.data || Array.isArray(sb))) out = sb.data || sb;
  }

  if (!out.length) out = [{ symbol: "Fallback Loser", change: "-1.00%" }];

  setCache(cacheKey, out, 45);
  res.json(out);
});

// Picks: derive from current gainers/losers
app.get("/picks", async (req, res) => {
  const cacheKey = "picks";
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  const g = await safeGetJson(`${req.protocol}://${req.get("host")}/gainers`) || await safeGetJson("https://nse-proxy-ten.vercel.app/gainers") || [];
  const l = await safeGetJson(`${req.protocol}://${req.get("host")}/losers`) || await safeGetJson("https://nse-proxy-ten.vercel.app/losers") || [];

  const picks = [];
  if (Array.isArray(g) && g.length) {
    const top = g[0];
    const sym = top.symbol || top.metaSymbol || top.symbolName || top.name || "Gainer";
    picks.push({ type: "Long", stock: sym, reason: "Top gainer stock" });
  }
  if (Array.isArray(l) && l.length) {
    const top = l[0];
    const sym = top.symbol || top.metaSymbol || top.symbolName || top.name || "Loser";
    picks.push({ type: "Short", stock: sym, reason: "Top loser stock" });
  }
  if (!picks.length) picks.push({ type: "Long", stock: "Fallback Pick", reason: "No live data" });

  setCache(cacheKey, picks, 60);
  res.json(picks);
});

// ---- Error handler ----
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err && err.stack ? err.stack : err);
  res.status(500).json({ error: "Internal server error" });
});

// ---- Start ----
app.listen(PORT, () => {
  console.log(`NSE proxy listening on port ${PORT}`);
});
