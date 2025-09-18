import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ IPO scraping function
async function fetchIPOs() {
  try {
    const url = "https://www.screener.in/ipo/recent/";
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(data);
    const ipos = [];

    $("table tbody tr").each((_, el) => {
      const name = $(el).find("td:nth-child(1)").text().trim();
      const listingDate = $(el).find("td:nth-child(2)").text().trim();
      const mcap = $(el).find("td:nth-child(3)").text().trim();
      const ipoPrice = $(el).find("td:nth-child(4)").text().trim();
      const currentPrice = $(el).find("td:nth-child(5)").text().trim();
      const change = $(el).find("td:nth-child(6)").text().trim();

      if (name) {
        ipos.push({
          name,
          listingDate,
          mcap,
          ipoPrice,
          currentPrice,
          change,
        });
      }
    });

    return ipos.length > 0 ? ipos : [{ error: "No IPO data found" }];
  } catch (err) {
    return [{ error: "Failed to fetch IPOs", details: err.message }];
  }
}

// ✅ API endpoint
app.get("/ipo", async (req, res) => {
  const data = await fetchIPOs();
  res.json(data);
});

// Root
app.get("/", (req, res) => {
  res.send("✅ IPO Scraper API running. Use /ipo endpoint.");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
