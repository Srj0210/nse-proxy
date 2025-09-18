import express from "express";
import fetch from "node-fetch";
import cron from "node-cron";

const app = express();
const PORT = process.env.PORT || 3000;

// NSE headers (to avoid 403)
const NSE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115.0 Safari/537.36",
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
};

// In-memory cache
let cache = {
  ipos: [],
  gainers: [],
  losers: [],
  lastUpdated: null,
};

// --------- Helper: fetch NSE data with headers ---------
async function fetchNSE(url) {
  try {
    const res = await fetch(url, { headers: NSE_HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Fetch error:", err.message);
    return null;
  }
}

// --------- Endpoints ---------

// IPOs
app.get("/ipos", async (req, res) => {
  let data = await fetchNSE("https://www.nseindia.com/api/ipo-current-issues");
  if (!data || !data.data) return res.json(cache.ipos); // return cache if fail

  const ipos = data.data.map((i) => ({
    name: i.companyName || i.name,
    open: i.openDate,
    close: i.closeDate,
    price: i.priceBand,
  }));
  cache.ipos = ipos;
  cache.lastUpdated = new Date();
  res.json(ipos);
});

// Gainers
app.get("/gainers", async (req, res) => {
  let data = await fetchNSE(
    "https://www.nseindia.com/api/live-analysis-variations?index=gainers"
  );
  if (!data || !data.data) return res.json(cache.gainers);

  const gainers = data.data.map((g) => ({
    symbol: g.symbol,
    change: g.netPrice,
  }));
  cache.gainers = gainers;
  cache.lastUpdated = new Date();
  res.json(gainers);
});

// Losers
app.get("/losers", async (req, res) => {
  let data = await fetchNSE(
    "https://www.nseindia.com/api/live-analysis-variations?index=loosers"
  );
  if (!data || !data.data) return res.json(cache.losers);

  const losers = data.data.map((l) => ({
    symbol: l.symbol,
    change: l.netPrice,
  }));
  cache.losers = losers;
  cache.lastUpdated = new Date();
  res.json(losers);
});

// Picks (auto from top gainer/loser)
app.get("/picks", (req, res) => {
  const picks = [];
  if (cache.gainers.length > 0) {
    picks.push({
      type: "Long",
      stock: cache.gainers[0].symbol,
      reason: "Top gainer stock",
    });
  }
  if (cache.losers.length > 0) {
    picks.push({
      type: "Short",
      stock: cache.losers[0].symbol,
      reason: "Top loser stock",
    });
  }
  res.json(picks);
});

// Health check
app.get("/", (req, res) => {
  res.send("✅ NSE Proxy is running");
});

// --------- Cron: refresh cache every 15 min ---------
cron.schedule("*/15 * * * *", async () => {
  console.log("⏳ Refreshing NSE cache...");
  await fetch("http://localhost:" + PORT + "/ipos");
  await fetch("http://localhost:" + PORT + "/gainers");
  await fetch("http://localhost:" + PORT + "/losers");
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
