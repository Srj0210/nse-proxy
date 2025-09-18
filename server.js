import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 3000;

// Root check
app.get("/", (req, res) => {
  res.send("IPO Proxy is running ✅. Use /ipo endpoint.");
});

// IPO Endpoint
app.get("/ipo", async (req, res) => {
  try {
    const url = "https://www.chittorgarh.com/report/latest-ipo-in-india-list-mainboard-sme/84/"; // IPO list page
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    if (!response.ok) {
      return res.status(500).json({ error: "Failed to fetch IPO page" });
    }

    const body = await response.text();
    const $ = cheerio.load(body);

    let ipos = [];

    // scrape IPO table rows
    $("table.table tbody tr").each((i, el) => {
      const tds = $(el).find("td");
      if (tds.length >= 5) {
        ipos.push({
          name: $(tds[0]).text().trim(),
          open: $(tds[1]).text().trim(),
          close: $(tds[2]).text().trim(),
          price: $(tds[3]).text().trim()
        });
      }
    });

    if (ipos.length === 0) {
      return res.json([{ error: "No IPO data found, site structure may have changed" }]);
    }

    res.json(ipos);
  } catch (err) {
    console.error("Error scraping IPO:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
