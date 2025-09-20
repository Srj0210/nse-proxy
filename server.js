import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
app.use(cors());

// Root endpoint test
app.get("/", (req, res) => {
  res.json({ message: "✅ Server is running fine 🚀" });
});

// Example route (Recent IPOs)
app.get("/ipo/recent", async (req, res) => {
  try {
    const response = await fetch("https://www.screener.in/ipo/recent/");
    const html = await response.text();
    const $ = cheerio.load(html);

    const data = [];
    $("table tbody tr").each((i, el) => {
      const name = $(el).find("td:nth-child(1)").text().trim();
      const date = $(el).find("td:nth-child(2)").text().trim();
      const mcap = $(el).find("td:nth-child(3)").text().trim();
      const price = $(el).find("td:nth-child(4)").text().trim();
      const change = $(el).find("td:nth-child(6)").text().trim();
      if (name) {
        data.push({ name, date, mcap, price, change });
      }
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch recent IPOs" });
  }
});

// Example route (Upcoming IPOs)
app.get("/ipo/upcoming", async (req, res) => {
  try {
    const response = await fetch("https://www.screener.in/ipo/");
    const html = await response.text();
    const $ = cheerio.load(html);

    const data = [];
    $("table tbody tr").each((i, el) => {
      const name = $(el).find("td:nth-child(1)").text().trim();
      const subscription = $(el).find("td:nth-child(2)").text().trim();
      const listingDate = $(el).find("td:nth-child(3)").text().trim();
      const mcap = $(el).find("td:nth-child(4)").text().trim();
      const pe = $(el).find("td:nth-child(6)").text().trim();
      const roce = $(el).find("td:nth-child(7)").text().trim();
      if (name) {
        data.push({ name, subscription, listingDate, mcap, pe, roce });
      }
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch upcoming IPOs" });
  }
});

// Server listen
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});