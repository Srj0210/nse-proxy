import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Helper function to fetch NSE HTML/JSON safely
async function tryFetchJSON(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
      },
    });
    if (!res.ok) throw new Error("Bad response");
    return await res.json();
  } catch (err) {
    console.error("Fetch error:", err.message);
    return [];
  }
}

// ✅ NSE URLs
const NSE_GAINERS =
  "https://www.nseindia.com/api/live-analysis-variations?index=gainers";
const NSE_LOSERS =
  "https://www.nseindia.com/api/live-analysis-variations?index=losers";
const NSE_IPO =
  "https://www.nseindia.com/api/ipo-current-issues";
const NSE_NEWS =
  "https://www.nseindia.com/api/marketNews"; // Optional news

// ✅ Routes
app.get("/", (req, res) => {
  res.json({ status: "✅ NSE Proxy Live, No fallback" });
});

app.get("/gainers", async (req, res) => {
  const data = await tryFetchJSON(NSE_GAINERS);
  res.json(data || [{ symbol: "Error", change: "0%" }]);
});

app.get("/losers", async (req, res) => {
  const data = await tryFetchJSON(NSE_LOSERS);
  res.json(data || [{ symbol: "Error", change: "0%" }]);
});

app.get("/ipos", async (req, res) => {
  const data = await tryFetchJSON(NSE_IPO);
  res.json(data || [{ name: "No IPO found" }]);
});

app.get("/news", async (req, res) => {
  const data = await tryFetchJSON(NSE_NEWS);
  res.json(data || [{ headline: "No news" }]);
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
