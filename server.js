import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio"; // for scraping backup sites

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Helper fetch ----
async function fetchJSON(url, headers = {}) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json",
      ...headers
    }
  });
  if (!res.ok) throw new Error("Failed: " + url);
  return res.json();
}

async function fetchHTML(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  if (!res.ok) throw new Error("Failed HTML: " + url);
  return res.text();
}

// ---- Routes ----

// ✅ IPOs
app.get("/ipos", async (req, res) => {
  try {
    // NSE IPO endpoint
    const url = "https://www.nseindia.com/api/ipo-current-issues";
    const data = await fetchJSON(url);
    return res.json(data);
  } catch (err) {
    console.log("NSE IPO failed, trying ET Markets...");
    // Backup: Economic Times IPO scrape
    const html = await fetchHTML("https://economictimes.indiatimes.com/markets/ipos");
    const $ = cheerio.load(html);
    const ipos = [];
    $(".eachStory").slice(0, 5).each((i, el) => {
      const name = $(el).find("h3 a").text().trim();
      const link = $(el).find("h3 a").attr("href");
      ipos.push({ name, link });
    });
    return res.json(ipos);
  }
});

// ✅ Gainers
app.get("/gainers", async (req, res) => {
  try {
    const url = "https://www.nseindia.com/api/live-analysis-equity-gainers";
    const data = await fetchJSON(url);
    return res.json(data);
  } catch (err) {
    console.log("NSE Gainers failed, switching to Yahoo Finance...");
    const url = "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?screenerId=day_gainers";
    const json = await fetchJSON(url);
    const items = json.quotes.slice(0, 10).map(q => ({
      symbol: q.symbol,
      change: q.regularMarketChangePercent + "%"
    }));
    return res.json(items);
  }
});

// ✅ Losers
app.get("/losers", async (req, res) => {
  try {
    const url = "https://www.nseindia.com/api/live-analysis-equity-losers";
    const data = await fetchJSON(url);
    return res.json(data);
  } catch (err) {
    console.log("NSE Losers failed, switching to Yahoo Finance...");
    const url = "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?screenerId=day_losers";
    const json = await fetchJSON(url);
    const items = json.quotes.slice(0, 10).map(q => ({
      symbol: q.symbol,
      change: q.regularMarketChangePercent + "%"
    }));
    return res.json(items);
  }
});

// ✅ Picks
app.get("/picks", async (req, res) => {
  try {
    const gainers = await fetchJSON("https://www.nseindia.com/api/live-analysis-equity-gainers");
    const losers = await fetchJSON("https://www.nseindia.com/api/live-analysis-equity-losers");

    const picks = [];
    if (gainers.length > 0) picks.push({ type: "Long", stock: gainers[0].symbol, reason: "Top gainer" });
    if (losers.length > 0) picks.push({ type: "Short", stock: losers[0].symbol, reason: "Top loser" });

    return res.json(picks);
  } catch (err) {
    console.log("NSE Picks failed, building from Yahoo Finance...");
    const gainers = await fetchJSON("https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?screenerId=day_gainers");
    const losers = await fetchJSON("https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?screenerId=day_losers");

    return res.json([
      { type: "Long", stock: gainers.quotes[0].symbol, reason: "Top gainer" },
      { type: "Short", stock: losers.quotes[0].symbol, reason: "Top loser" }
    ]);
  }
});

// ✅ Status
app.get("/", (req, res) => {
  res.json({ status: "🚀 NSE Proxy Running (No fallback, always alternate sources)" });
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
