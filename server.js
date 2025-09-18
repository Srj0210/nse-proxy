import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 3000;

// 📰 Economic Times RSS (news ke liye)
const NEWS_URL = "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms";

// 📈 Yahoo Finance for movers
const YAHOO_GAINERS = "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=day_gainers_in";
const YAHOO_LOSERS = "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=day_losers_in";

// 📅 Chittorgarh IPO Calendar
const CHITTORGARH_IPO_URL = "https://www.chittorgarh.com/report/ipo-calendar/84/";

async function fetchHTML(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
    return await res.text();
  } catch (err) {
    return null;
  }
}

async function fetchJSON(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
    });
    if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
    return await res.json();
  } catch (err) {
    return null;
  }
}

// 📅 Scrape IPOs from Chittorgarh
async function getIPOs() {
  const html = await fetchHTML(CHITTORGARH_IPO_URL);
  if (!html) return [{ name: "No IPO data" }];

  const $ = cheerio.load(html);
  let ipos = [];

  $("table.table tbody tr").each((i, el) => {
    const tds = $(el).find("td");
    if (tds.length >= 5) {
      ipos.push({
        name: $(tds[0]).text().trim(),
        open: $(tds[1]).text().trim(),
        close: $(tds[2]).text().trim(),
        price: $(tds[3]).text().trim(),
        lot: $(tds[4]).text().trim()
      });
    }
  });

  return ipos.length ? ipos : [{ name: "No IPO found" }];
}

// 📰 News (RSS → JSON)
import Parser from "rss-parser";
const parser = new Parser();

async function getNews() {
  try {
    const feed = await parser.parseURL(NEWS_URL);
    return feed.items.map(item => ({
      date: item.pubDate,
      headline: item.title,
      link: item.link
    }));
  } catch (err) {
    return [{ headline: "Error fetching news" }];
  }
}

// 📈 Gainers / Losers (Yahoo Finance)
async function getMovers(url) {
  const data = await fetchJSON(url);
  if (!data || !data.finance || !data.finance.result) return [];
  return data.finance.result[0].quotes.map(q => ({
    symbol: q.symbol,
    change: q.regularMarketChangePercent
  }));
}

// ================== ROUTES ==================
app.get("/", (req, res) => res.json({ status: "✅ Proxy Live, No fallback" }));

app.get("/news", async (req, res) => res.json(await getNews()));
app.get("/ipos", async (req, res) => res.json(await getIPOs()));
app.get("/gainers", async (req, res) => res.json(await getMovers(YAHOO_GAINERS)));
app.get("/losers", async (req, res) => res.json(await getMovers(YAHOO_LOSERS)));

// ============================================
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
