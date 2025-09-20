import express from "express";
import fetch from "node-fetch";
import cheerio from "cheerio";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// 🟢 Helper function to fetch page with headers
async function fetchPage(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      "Accept": "text/html"
    }
  });
  return await response.text();
}

// 🟢 Upcoming IPO route
app.get("/ipo/upcoming", async (req, res) => {
  try {
    const html = await fetchPage("https://www.screener.in/ipo/");
    const $ = cheerio.load(html);

    let data = [];

    $("table.data-table tbody tr").each((i, el) => {
      const name = $(el).find("td:nth-child(1)").text().trim();
      const subscription = $(el).find("td:nth-child(2)").text().trim();
      const listingDate = $(el).find("td:nth-child(3)").text().trim();
      const mcap = $(el).find("td:nth-child(4)").text().trim();
      const subscriptionRate = $(el).find("td:nth-child(5)").text().trim();
      const pe = $(el).find("td:nth-child(6)").text().trim();
      const roce = $(el).find("td:nth-child(7)").text().trim();

      if (name) {
        data.push({
          name,
          subscription,
          listingDate,
          mcap,
          subscriptionRate,
          pe,
          roce
        });
      }
    });

    res.json(data);
  } catch (err) {
    console.error("❌ Error in /ipo/upcoming:", err.message);
    res.status(500).json({ error: "Scraping failed" });
  }
});

// 🟢 Recent IPO route
app.get("/ipo/recent", async (req, res) => {
  try {
    const html = await fetchPage("https://www.screener.in/ipo/recent/");
    const $ = cheerio.load(html);

    let data = [];

    $("table.data-table tbody tr").each((i, el) => {
      const name = $(el).find("td:nth-child(1)").text().trim();
      const listingDate = $(el).find("td:nth-child(2)").text().trim();
      const ipoMcap = $(el).find("td:nth-child(3)").text().trim();
      const ipoPrice = $(el).find("td:nth-child(4)").text().trim();
      const currentPrice = $(el).find("td:nth-child(5)").text().trim();
      const change = $(el).find("td:nth-child(6)").text().trim();

      if (name) {
        data.push({
          name,
          listingDate,
          ipoMcap,
          ipoPrice,
          currentPrice,
          change
        });
      }
    });

    res.json(data);
  } catch (err) {
    console.error("❌ Error in /ipo/recent:", err.message);
    res.status(500).json({ error: "Scraping failed" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});