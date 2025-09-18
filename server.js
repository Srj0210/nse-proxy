import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 3000;

// Base URLs
const UPCOMING_URL = "https://www.screener.in/ipo/";
const RECENT_URL = "https://www.screener.in/ipo/recent/";

// =================== Helper Functions ===================

// Parse Upcoming IPOs
async function getUpcomingIPOs() {
  try {
    const res = await fetch(UPCOMING_URL);
    const html = await res.text();
    const $ = cheerio.load(html);

    const ipos = [];

    $("table tbody tr").each((_, el) => {
      const tds = $(el).find("td");

      ipos.push({
        name: $(tds[0]).text().trim(),
        subscriptionPeriod: $(tds[1]).text().trim(),
        listingDate: $(tds[2]).text().trim(),
        mcap: $(tds[3]).text().trim(),
        subscription: $(tds[4]).text().trim(),
        pe: $(tds[5]).text().trim(),
        roce: $(tds[6]).text().trim(),
      });
    });

    return ipos;
  } catch (e) {
    return [{ error: "Failed to fetch Upcoming IPOs", message: e.message }];
  }
}

// Parse Recent IPOs
async function getRecentIPOs() {
  try {
    const res = await fetch(RECENT_URL);
    const html = await res.text();
    const $ = cheerio.load(html);

    const ipos = [];

    $("table tbody tr").each((_, el) => {
      const tds = $(el).find("td");

      ipos.push({
        name: $(tds[0]).text().trim(),
        listingDate: $(tds[1]).text().trim(),
        mcap: $(tds[2]).text().trim(),
        ipoPrice: $(tds[3]).text().trim(),
        currentPrice: $(tds[4]).text().trim(),
        change: $(tds[5]).text().trim(),
      });
    });

    return ipos;
  } catch (e) {
    return [{ error: "Failed to fetch Recent IPOs", message: e.message }];
  }
}

// =================== API Endpoint ===================
app.get("/ipo", async (req, res) => {
  try {
    const [upcoming, recent] = await Promise.all([
      getUpcomingIPOs(),
      getRecentIPOs(),
    ]);

    res.json({
      upcoming,
      recent,
    });
  } catch (e) {
    res.json({ error: "Something went wrong", message: e.message });
  }
});

// =================== Server Start ===================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
