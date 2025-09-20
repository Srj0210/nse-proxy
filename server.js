import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
app.use(cors());

// Upcoming IPOs
app.get("/ipo/upcoming", async (req, res) => {
  try {
    const response = await fetch("https://www.screener.in/ipo/");
    const body = await response.text();
    const $ = cheerio.load(body);

    const data = [];
    $("table tbody tr").each((i, el) => {
      const name = $(el).find("td").eq(0).text().trim();
      const subscription = $(el).find("td").eq(1).text().trim();
      const listingDate = $(el).find("td").eq(2).text().trim();
      const mcap = $(el).find("td").eq(3).text().trim();
      const pe = $(el).find("td").eq(4).text().trim();
      const roce = $(el).find("td").eq(5).text().trim();

      if (name) {
        data.push({ name, subscription, listingDate, mcap, pe, roce });
      }
    });

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch upcoming IPOs" });
  }
});

// Recent IPOs
app.get("/ipo/recent