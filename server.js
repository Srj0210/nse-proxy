import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

// ========== Helper ==========
async function fetchHTML(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/118 Safari/537.36",
    },
  });
  return res.text();
}

function extractCleanText(str) {
  return str.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

// ========== Upcoming IPOs ==========
app.get("/ipo/upcoming", async (req, res) => {
  try {
    const url = "https://www.screener.in/ipos/upcoming/";
    const html = await fetchHTML(url);

    const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
    const data = [];

    rows.forEach((r) => {
      const cols = [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) =>
        extractCleanText(c[1])
      );
      if (cols.length >= 5 && !cols[0].includes("Institutional")) {
        data.push({
          name: cols[0],
          open: cols[1],
          close: cols[2],
          priceBand: cols[3],
          mcap: cols[4],
        });
      }
    });

    res.json(data);
  } catch (err) {
    console.error("Upcoming IPO Error:", err);
    res.status(500).json({ error: "Failed to fetch upcoming IPOs" });
  }
});

// ========== Recent IPOs ==========
app.get("/ipo/recent", async (req, res) => {
  try {
    const url = "https://www.screener.in/ipos/recent/";
    const html = await fetchHTML(url);

    const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
    const data = [];

    rows.forEach((r) => {
      const cols = [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) =>
        extractCleanText(c[1])
      );
      if (cols.length >= 5 && !cols[0].includes("Institutional")) {
        data.push({
          name: cols[0],
          listingDate: cols[1],
          mcap: cols[2],
          price: cols[3],
          change: cols[4],
        });
      }
    });

    res.json(data);
  } catch (err) {
    console.error("Recent IPO Error:", err);
    res.status(500).json({ error: "Failed to fetch recent IPOs" });
  }
});

// ========== Root ==========
app.get("/", (req, res) => {
  res.send("✅ NSE Proxy API Running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
