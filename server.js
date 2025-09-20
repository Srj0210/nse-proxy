import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 10000;

// Helper function
const cleanText = (txt) => txt.replace(/\s+/g, " ").trim();

// ✅ Scraper for Recent IPOs
async function scrapeRecentIPOs() {
  const url = "https://www.screener.in/ipo/recent/";
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  const data = [];
  $("table tbody tr").each((i, el) => {
    const tds = $(el).find("td");
    if (tds.length > 0) {
      data.push({
        name: cleanText($(tds[0]).text()),
        date: cleanText($(tds[1]).text()),
        mcap: cleanText($(tds[2]).text()),
        ipoPrice: cleanText($(tds[3]).text()),
        currentPrice: cleanText($(tds[4]).text()),
        change: cleanText($(tds[5]).text())
      });
    }
  });

  return data;
}

// ✅ Scraper for Upcoming IPOs
async function scrapeUpcomingIPOs() {
  const url = "https://www.screener.in/ipo/";
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  const data = [];
  $("table tbody tr").each((i, el) => {
    const tds = $(el).find("td");
    if (tds.length > 0) {
      data.push({
        name: cleanText($(tds[0]).text()),
        subscriptionPeriod: cleanText($(tds[1]).text()),
        listingDate: cleanText($(tds[2]).text()),
        mcap: cleanText($(tds[3]).text()),
        subsTimes: cleanText($(tds[4]).text()),
        pe: cleanText($(tds[5]).text()),
        roce: cleanText($(tds[6]).text())
      });
    }
  });

  return data;
}

// ✅ Routes
app.get("/ipo/recent", async (req, res) => {
  try {
    const data = await scrapeRecentIPOs();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/ipo/upcoming", async (req, res) => {
  try {
    const data = await scrapeUpcomingIPOs();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Root
app.get("/", (req, res) => {
  res.json({ message: "🚀 IPO Scraper API running successfully!" });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});