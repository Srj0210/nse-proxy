import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import cors from "cors";

const app = express();
app.use(cors());

// Helper: trim aur line-break clean
function cleanText(txt) {
  return txt.replace(/\s+/g, " ").trim();
}

// 🔹 Upcoming IPOs
app.get("/ipo/upcoming", async (req, res) => {
  try {
    const response = await fetch("https://www.screener.in/ipo/");
    const body = await response.text();
    const $ = cheerio.load(body);

    let data = [];
    $("table tbody tr").each((i, el) => {
      let tds = $(el).find("td");
      if (tds.length >= 4) {
        data.push({
          name: cleanText($(tds[0]).text()),
          subscriptionPeriod: cleanText($(tds[1]).text()),
          listingDate: cleanText($(tds[2]).text()),
          mcap: cleanText($(tds[3]).text())
        });
      }
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch upcoming IPOs" });
  }
});

// 🔹 Recent IPOs
app.get("/ipo/recent", async (req, res) => {
  try {
    const response = await fetch("https://www.screener.in/ipo/recent/");
    const body = await response.text();
    const $ = cheerio.load(body);

    let data = [];
    $("table tbody tr").each((i, el) => {
      let tds = $(el).find("td");
      if (tds.length >= 5) {
        data.push({
          name: cleanText($(tds[0]).text()),
          date: cleanText($(tds[1]).text()),
          mcap: cleanText($(tds[2]).text()),
          ipoPrice: cleanText($(tds[3]).text()),
          currentPrice: cleanText($(tds[4]).text())
        });
      }
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch recent IPOs" });
  }
});

// 🔹 Root test
app.get("/", (req, res) => {
  res.json({ message: "🚀 NSE Proxy Server is running!" });
});

// 🔹 PORT setup for Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});