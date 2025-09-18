import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// IPO endpoint (Chittorgarh API)
app.get("/ipos", async (req, res) => {
  try {
    const url = "https://www.chittorgarh.com/api/ipo/ipo_dashboard";
    const response = await fetch(url, {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    if (!response.ok) throw new Error("Failed to fetch IPOs");

    const data = await response.json();

    const ipos = data.map(item => ({
      name: item.IPOName,
      open: item.OpenDate,
      close: item.CloseDate,
      price: item.PriceBand,
      lotSize: item.MarketLot,
      status: item.Status
    }));

    res.json(ipos);
  } catch (err) {
    res.json([{ name: "Error fetching IPO", error: err.message }]);
  }
});

// Health check
app.get("/", (req, res) => {
  res.json({ status: "✅ IPO Proxy Live" });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
