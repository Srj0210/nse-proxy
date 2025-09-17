import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// Helper: fetch safely with fallback
async function safeFetch(url, fallback) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    if (!res.ok) throw new Error("Bad status " + res.status);

    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return fallback; // JSON parse fail → fallback
    }
  } catch (e) {
    console.error("Fetch error:", e.message);
    return fallback;
  }
}

/* -------------------------
   ENDPOINTS
   ------------------------- */

// ✅ News (RSS JSON from ET)
app.get("/news", async (req, res) => {
  res.json({ error: "Use Apps Script RSS direct" });
});

// ✅ IPOs (3-level fallback)
app.get("/ipos", async (req, res) => {
  let data = [];

  // 1. NSE API
  const nseData = await safeFetch("https://www.nseindia.com/api/ipo-current-issues", null);
  if (nseData && nseData.length) {
    data = nseData.map(i => ({
      name: i.symbol || i.name || "NSE IPO",
      open: i.openDate || i.open || "",
      close: i.closeDate || i.close || "",
      price: i.priceBand || i.price || ""
    }));
  }

  // 2. StockBhoomi API fallback
  if (!data.length) {
    const sb = await safeFetch("https://api.stockbhoomi.com/api/v1/ipo", null);
    if (sb && sb.data) {
      data = sb.data.map(i => ({
        name: i.name,
        open: i.open,
        close: i.close,
        price: i.price
      }));
    }
  }

  // 3. Static fallback
  if (!data.length) {
    data = [
      { name: "Fallback IPO", open: "2025-09-20", close: "2025-09-25", price: "₹100-₹120" }
    ];
  }

  res.json(data);
});

// ✅ Gainers
app.get("/gainers", async (req, res) => {
  let data = await safeFetch("https://www.nseindia.com/api/live-analysis-equity-gainers", []);
  if (!data.length) {
    const sb = await safeFetch("https://api.stockbhoomi.com/api/v1/gainers", []);
    data = sb.data || [];
  }
  if (!data.length) {
    data = [{ symbol: "Fallback Gainer", change: "+1.0%" }];
  }
  res.json(data);
});

// ✅ Losers
app.get("/losers", async (req, res) => {
  let data = await safeFetch("https://www.nseindia.com/api/live-analysis-equity-losers", []);
  if (!data.length) {
    const sb = await safeFetch("https://api.stockbhoomi.com/api/v1/losers", []);
    data = sb.data || [];
  }
  if (!data.length) {
    data = [{ symbol: "Fallback Loser", change: "-1.0%" }];
  }
  res.json(data);
});

// ✅ Picks (auto from gainers/losers)
app.get("/picks", async (req, res) => {
  let g = await safeFetch("https://nse-proxy-ten.vercel.app/gainers", []);
  let l = await safeFetch("https://nse-proxy-ten.vercel.app/losers", []);

  const picks = [];
  if (g.length) picks.push({ type: "Long", stock: g[0].symbol || "Gainer", reason: "Top gainer stock" });
  if (l.length) picks.push({ type: "Short", stock: l[0].symbol || "Loser", reason: "Top loser stock" });

  if (!picks.length) {
    picks.push({ type: "Long", stock: "Fallback Pick", reason: "No live data" });
  }

  res.json(picks);
});

// ✅ Root
app.get("/", (req, res) => {
  res.json({ status: "✅ NSE Proxy Running with Fallbacks" });
});

app.listen(PORT, () => console.log("Server running on port " + PORT));

export default app;
