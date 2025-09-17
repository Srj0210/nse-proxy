import express from "express";
import fetch from "node-fetch";

const app = express();

async function fetchJSON(url, fallback) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error("Bad response " + res.status);
    return await res.json();
  } catch {
    return fallback;
  }
}

app.get("/", (req, res) => {
  res.json({ status: "✅ NSE Proxy Running with Fallbacks" });
});

app.get("/ipos", async (req, res) => {
  const data = await fetchJSON(
    "https://api.stockbhoomi.com/ipos",
    [{ name: "Fallback IPO", open: "2025-09-20", close: "2025-09-25", price: "₹100-₹120" }]
  );
  res.json(data);
});

app.get("/gainers", async (req, res) => {
  const data = await fetchJSON(
    "https://api.stockbhoomi.com/gainers",
    [{ symbol: "Fallback Gainer", change: "+1.0%" }]
  );
  res.json(data);
});

app.get("/losers", async (req, res) => {
  const data = await fetchJSON(
    "https://api.stockbhoomi.com/losers",
    [{ symbol: "Fallback Loser", change: "-1.0%" }]
  );
  res.json(data);
});

app.get("/picks", async (req, res) => {
  const data = [
    { type: "Long", stock: "Fallback Gainer", reason: "Top gainer stock" },
    { type: "Short", stock: "Fallback Loser", reason: "Top loser stock" }
  ];
  res.json(data);
});

export default app;
