import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import xml2js from "xml2js";

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

// Helper with User-Agent
async function fetchWithUA(url) {
  return fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Accept": "application/json, text/html, */*"
    }
  });
}

// ---------- NEWS ----------
app.get("/news", async (req, res) => {
  try {
    const rssUrl = "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms";
    const response = await fetchWithUA(rssUrl);
    const xml = await response.text();

    xml2js.parseString(xml, (err, result) => {
      if (err) return res.status(500).json({ error: "RSS parse failed" });

      const items = result.rss.channel[0].item.slice(0, 10).map(item => ({
        date: item.pubDate[0],
        headline: item.title[0],
        link: item.link[0]
      }));

      res.json(items);
    });
  } catch (err) {
    res.status(500).json({ error: "News fetch failed: " + err.message });
  }
});

// ---------- IPOs ----------
app.get("/ipos", async (req, res) => {
  try {
    // Try Moneycontrol first
    const mcRes = await fetchWithUA("https://priceapi.moneycontrol.com/mcapi/v1/ipo/calendar");
    const mcData = await mcRes.json();

    if (mcData && mcData.upcomingIpoList && mcData.upcomingIpoList.length > 0) {
      const ipos = mcData.upcomingIpoList.map(item => ({
        name: item.companyName || "",
        open: item.openDate || "",
        close: item.closeDate || "",
        price: item.priceBand || ""
      }));
      return res.json(ipos);
    }

    // Fallback: NSE IPO scrape
    const nseRes = await fetchWithUA("https://www.nseindia.com/ipo");
    const html = await nseRes.text();

    const matches = [...html.matchAll(/<td.*?>(.*?)<\/td>/g)].map(m => m[1]);

    let ipos = [];
    for (let i = 0; i < matches.length; i += 4) {
      ipos.push({
        name: matches[i] || "",
        open: matches[i + 1] || "",
        close: matches[i + 2] || "",
        price: matches[i + 3] || ""
      });
    }

    res.json(ipos);
  } catch (err) {
    res.status(500).json({ error: "IPO fetch failed: " + err.message });
  }
});

// ---------- Gainers ----------
app.get("/gainers", async (req, res) => {
  try {
    const url = "https://www.nseindia.com/api/live-analysis-variations?index=gainers";
    const response = await fetchWithUA(url);
    const data = await response.json();

    const top = data.NIFTY.data.slice(0, 10).map(s => ({
      stock: s.symbol,
      change: s.perChange
    }));

    res.json(top);
  } catch (err) {
    res.status(500).json({ error: "Gainers fetch failed: " + err.message });
  }
});

// ---------- Losers ----------
app.get("/losers", async (req, res) => {
  try {
    const url = "https://www.nseindia.com/api/live-analysis-variations?index=loosers";
    const response = await fetchWithUA(url);
    const data = await response.json();

    const top = data.NIFTY.data.slice(0, 10).map(s => ({
      stock: s.symbol,
      change: s.perChange
    }));

    res.json(top);
  } catch (err) {
    res.status(500).json({ error: "Losers fetch failed: " + err.message });
  }
});

// ---------- Picks ----------
app.get("/picks", async (req, res) => {
  try {
    const gainerRes = await fetchWithUA("https://www.nseindia.com/api/live-analysis-variations?index=gainers");
    const loserRes = await fetchWithUA("https://www.nseindia.com/api/live-analysis-variations?index=loosers");

    const gainerData = await gainerRes.json();
    const loserData = await loserRes.json();

    const topGainer = gainerData.NIFTY.data[0];
    const topLoser = loserData.NIFTY.data[0];

    const picks = [
      { type: "Long", stock: topGainer.symbol, reason: "Top Gainer " + topGainer.perChange + "%" },
      { type: "Short", stock: topLoser.symbol, reason: "Top Loser " + topLoser.perChange + "%" }
    ];

    res.json(picks);
  } catch (err) {
    res.status(500).json({ error: "Picks fetch failed: " + err.message });
  }
});

// ---------- Root ----------
app.get("/", (req, res) => {
  res.json({ status: "NSE Proxy Running ✅" });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
