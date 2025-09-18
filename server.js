import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Scraper for Upcoming IPOs =====
async function getUpcomingIPOs() {
  try {
    const url = "https://www.screener.in/ipo/";
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    const ipos = [];
    $("table tbody tr").each((i, el) => {
      const name = $(el).find("td:nth-child(1)").text().trim();
      const subscription = $(el).find("td:nth-child(2)").text().trim();
      const listingDate = $(el).find("td:nth-child(3)").text().trim();
      const mcap = $(el).find("td:nth-child(4)").text().trim();
      const subData = $(el).find("td:nth-child(5)").text().trim();
      const pe = $(el).find("td:nth-child(6)").text().trim();
      const roce = $(el).find("td:nth-child(7)").text().trim();

      if (name) {
        ipos.push({ name, subscription, listingDate, mcap, subData, pe, roce });
      }
    });

    return ipos;
  } catch (e) {
    return [{ error: "Failed to fetch Upcoming IPOs", message: e.message }];
  }
}

// ===== Scraper for Recent IPOs =====
async function getRecentIPOs() {
  try {
    const url = "https://www.screener.in/ipo/recent/";
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    const ipos = [];
    $("table tbody tr").each((i, el) => {
      const name = $(el).find("td:nth-child(1)").text().trim();
      const listingDate = $(el).find("td:nth-child(2)").text().trim();
      const mcap = $(el).find("td:nth-child(3)").text().trim();
      const ipoPrice = $(el).find("td:nth-child(4)").text().trim();
      const currentPrice = $(el).find("td:nth-child(5)").text().trim();
      const change = $(el).find("td:nth-child(6)").text().trim();

      if (name) {
        ipos.push({ name, listingDate, mcap, ipoPrice, currentPrice, change });
      }
    });

    return ipos;
  } catch (e) {
    return [{ error: "Failed to fetch Recent IPOs", message: e.message }];
  }
}

// ===== Routes =====
app.get("/", (req, res) => {
  res.send("IPO Scraper API is running 🚀");
});

app.get("/ipo/upcoming", async (req, res) => {
  res.json(await getUpcomingIPOs());
});

app.get("/ipo/recent", async (req, res) => {
  res.json(await getRecentIPOs());
});

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
