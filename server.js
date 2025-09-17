import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Helper: fetch JSON safely
async function safeFetch(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const txt = await res.text();
    return JSON.parse(txt);
  } catch (err) {
    console.error("safeFetch error:", err.message);
    return null;
  }
}

// ✅ IPOs API with multi-source fallback
app.get("/ipos", async (req, res) => {
  let data = null;

  // 1. Try NSE API
  data = await safeFetch("https://www.nseindia.com/api/ipo-current-issues");

  // 2. If fail, try StockBhoomi
  if (!data) {
    data = await safeFetch("https://api.stockbhoomi.com/ipos");
  }

  // 3. Final fallback
  if (!data) {
    data = [
      { name: "Fallback IPO", open: "2025-09-20", close: "2025-09-25", price: "₹100-₹120" }
    ];
  }

  res.json(data);
});

// ✅ Gainers
app.get("/gainers", async (req, res) => {
  let data = await safeFetch("https://www.nseindia.com/api/live-analysis-variations?index=gainers");
  if (!data) data = await safeFetch("https://api.stockbhoomi.com/gainers");
  if (!data) data = [{ stock: "Fallback Gainer", change: "+1.0%" }];
  res.json(data);
});

// ✅ Losers
app.get("/losers", async (req, res) => {
  let data = await safeFetch("https://www.nseindia.com/api/live-analysis-variations?index=losers");
  if (!data) data = await safeFetch("https://api.stockbhoomi.com/losers");
  if (!data) data = [{ stock: "Fallback Loser", change: "-1.0%" }];
  res.json(data);
});

// ✅ Picks (auto from Gainers/Losers)
app.get("/picks", async (req, res) => {
  let gainers = await safeFetch("https://www.nseindia.com/api/live-analysis-variations?index=gainers");
  let losers = await safeFetch("https://www.nseindia.com/api/live-analysis-variations?index=losers");

  if (!gainers) gainers = await safeFetch("https://api.stockbhoomi.com/gainers");
  if (!losers) losers = await safeFetch("https://api.stockbhoomi.com/losers");

  if (!gainers || !losers) {
    return res.json([
      { type: "Long", stock: "Fallback Long", reason: "Default reason" },
      { type: "Short", stock: "Fallback Short", reason: "Default reason" }
    ]);
  }

  const picks = [];
  if (gainers.length > 0) picks.push({ type: "Long", stock: gainers[0].symbol || gainers[0].stock, reason: "Top gainer stock" });
  if (losers.length > 0) picks.push({ type: "Short", stock: losers[0].symbol || losers[0].stock, reason: "Top loser stock" });

  res.json(picks);
});

app.get("/", (req, res) => res.json({ status: "NSE Proxy Running ✅" }));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
