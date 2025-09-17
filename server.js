import express from "express";
import fetch from "node-fetch";

const app = express();

// 🔹 Safe fetch with fallback
async function fetchJSON(url, fallback) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error("Bad response " + res.status);
    return await res.json();
  } catch (err) {
    console.error("Error fetching:", url, err.message);
    return fallback;
  }
}

// Root health check
app.get("/", (req, res) => {
  res.json({ status: "NSE Proxy Running ✅" });
});

// IPOs (StockBhoomi fallback only here)
app.get("/ipos", async (req, res) => {
  const data = await fetchJSON(
    "https://api.stockbhoomi.com/ipos", 
    [{ name: "Sample IPO", open: "2025-09-20", close: "2025-09-25", price: "₹100-₹120" }]
  );
  res.json(data);
});

// Gainers (from NSE)
app.get("/gainers", async (req, res) => {
  const data = await fetchJSON(
    "https://www.nseindia.com/api/live-analysis-variations?index=gainers",
    [{ stock: "Fallback Gainer", change: "+1.0%" }]
  );
  res.json(data);
});

// Losers (from NSE)
app.get("/losers", async (req, res) => {
  const data = await fetchJSON(
    "https://www.nseindia.com/api/live-analysis-variations?index=loosers",
    [{ stock: "Fallback Loser", change: "-1.0%" }]
  );
  res.json(data);
});

// Picks (manual)
app.get("/picks", (req, res) => {
  res.json([
    { type: "Long", stock: "TCS", reason: "Strong IT growth" },
    { type: "Short", stock: "Adani", reason: "Overbought, profit booking" }
  ]);
});

export default app;
