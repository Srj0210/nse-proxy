import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 3000;

async function tryFetchJSON(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
      timeout: 4000 // ⏳ max 4s
    });
    if (!res.ok) throw new Error("Bad response");
    return await res.json();
  } catch {
    return null;
  }
}

async function tryFetchHTML(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 4000 });
    if (!res.ok) throw new Error("Bad response");
    return await res.text();
  } catch {
    return null;
  }
}

// IPOs
app.get("/ipos", async (req, res) => {
  let data = await tryFetchJSON("https://www.nseindia.com/api/ipo-current-issues");
  if (data) return res.json(data);

  // fallback ET Markets
  const html = await tryFetchHTML("https://economictimes.indiatimes.com/markets/ipos");
  const ipos = [];
  if (html) {
    const $ = cheerio.load(html);
    $(".eachStory").slice(0, 5).each((i, el) => {
      ipos.push({
        name: $(el).find("h3 a").text().trim(),
        link: $(el).find("h3 a").attr("href")
      });
    });
  }
  res.json(ipos.length ? ipos : [{ name: "No IPO found" }]);
});

// Gainers
app.get("/gainers", async (req, res) => {
  let data = await tryFetchJSON("https://www.nseindia.com/api/live-analysis-equity-gainers");
  if (data) return res.json(data);

  const yahoo = await tryFetchJSON("https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?screenerId=day_gainers");
  if (yahoo && yahoo.quotes) {
    return res.json(yahoo.quotes.slice(0, 10).map(q => ({
      symbol: q.symbol,
      change: q.regularMarketChangePercent + "%"
    })));
  }
  res.json([{ symbol: "No data", change: "0%" }]);
});

// Losers
app.get("/losers", async (req, res) => {
  let data = await tryFetchJSON("https://www.nseindia.com/api/live-analysis-equity-losers");
  if (data) return res.json(data);

  const yahoo = await tryFetchJSON("https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?screenerId=day_losers");
  if (yahoo && yahoo.quotes) {
    return res.json(yahoo.quotes.slice(0, 10).map(q => ({
      symbol: q.symbol,
      change: q.regularMarketChangePercent + "%"
    })));
  }
  res.json([{ symbol: "No data", change: "0%" }]);
});

// Picks
app.get("/picks", async (req, res) => {
  let gainers = await tryFetchJSON("https://www.nseindia.com/api/live-analysis-equity-gainers");
  let losers = await tryFetchJSON("https://www.nseindia.com/api/live-analysis-equity-losers");

  if (gainers && losers) {
    return res.json([
      { type: "Long", stock: gainers[0].symbol, reason: "Top gainer" },
      { type: "Short", stock: losers[0].symbol, reason: "Top loser" }
    ]);
  }

  // fallback Yahoo
  const gYahoo = await tryFetchJSON("https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?screenerId=day_gainers");
  const lYahoo = await tryFetchJSON("https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?screenerId=day_losers");

  if (gYahoo && lYahoo) {
    return res.json([
      { type: "Long", stock: gYahoo.quotes[0].symbol, reason: "Top gainer" },
      { type: "Short", stock: lYahoo.quotes[0].symbol, reason: "Top loser" }
    ]);
  }

  res.json([{ type: "Info", stock: "No picks", reason: "No data" }]);
});

// Status
app.get("/", (req, res) => {
  res.json({ status: "✅ Proxy Running Fast", endpoints: ["/ipos", "/gainers", "/losers", "/picks"] });
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
