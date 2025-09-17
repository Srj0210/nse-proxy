import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Fallback data ----
const FALLBACK_IPO = [
  { name: "Sample IPO", open: "2025-09-20", close: "2025-09-25", price: "₹100-₹120" }
];
const FALLBACK_GAINERS = [
  { stock: "Fallback Gainer", change: "+1.0%" }
];
const FALLBACK_LOSERS = [
  { stock: "Fallback Loser", change: "-1.0%" }
];
const FALLBACK_PICKS = [
  { type: "Long", stock: "TCS", reason: "Strong IT growth" },
  { type: "Short", stock: "Adani", reason: "Overbought, profit booking" }
];

// ---- Helper to fetch with retry ----
async function fetchWithRetry(url, retries = 2) {
  try {
    let res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (retries > 0) return fetchWithRetry(url, retries - 1);
    throw err;
  }
}

// ---- Routes ----
app.get("/", (req, res) => {
  res.json({ status: "✅ NSE Proxy Running" });
});

// IPOs (StockBhoomi API)
app.get("/ipos", async (req, res) => {
  try {
    const url = "https://api.stockbhoomi.com/api/latest-ipos"; // ✅ reliable IPO API
    const data = await fetchWithRetry(url);
    res.json(data?.ipos || FALLBACK_IPO);
  } catch (err) {
    res.json(FALLBACK_IPO);
  }
});

// Gainers
app.get("/gainers", async (req, res) => {
  try {
    const url = "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050";
    const data = await fetchWithRetry(url);
    const top = data.data?.slice(0, 5).map(s => ({
      stock: s.symbol,
      change: s.perChange + "%"
    }));
    res.json(top || FALLBACK_GAINERS);
  } catch (err) {
    res.json(FALLBACK_GAINERS);
  }
});

// Losers
app.get("/losers", async (req, res) => {
  try {
    const url = "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050";
    const data = await fetchWithRetry(url);
    const bottom = data.data?.slice(-5).map(s => ({
      stock: s.symbol,
      change: s.perChange + "%"
    }));
    res.json(bottom || FALLBACK_LOSERS);
  } catch (err) {
    res.json(FALLBACK_LOSERS);
  }
});

// Picks (always return static curated)
app.get("/picks", (req, res) => {
  res.json(FALLBACK_PICKS);
});

// ---- Start ----
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
