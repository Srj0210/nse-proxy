import express from "express";
import fetch from "node-fetch";
import cron from "node-cron";

const app = express();
const PORT = process.env.PORT || 3000;

// ================== CONFIG ==================
let nseCookies = null;
let nseHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  Connection: "keep-alive",
};

// NSE URLs
const NSE_URLS = {
  ipo: "https://www.nseindia.com/api/ipo-current-issues",
  gainers: "https://www.nseindia.com/api/live-analysis-variations?index=gainers",
  losers: "https://www.nseindia.com/api/live-analysis-variations?index=losers",
  picks: "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050",
};

// ================== COOKIE REFRESH ==================
async function refreshCookies() {
  try {
    console.log("🔄 Refreshing NSE cookies...");
    const res = await fetch("https://www.nseindia.com", { headers: nseHeaders });
    if (res.ok) {
      const setCookies = res.headers.raw()["set-cookie"];
      if (setCookies) {
        nseCookies = setCookies.map((c) => c.split(";")[0]).join("; ");
        console.log("✅ NSE cookies updated");
      }
    }
  } catch (err) {
    console.error("❌ Cookie refresh failed:", err.message);
  }
}

// Run immediately on start
await refreshCookies();

// Run every 15 minutes
cron.schedule("*/15 * * * *", refreshCookies);

// ================== FETCH FUNCTION ==================
async function fetchFromNSE(url) {
  try {
    const res = await fetch(url, {
      headers: { ...nseHeaders, Cookie: nseCookies },
    });

    if (!res.ok) throw new Error("NSE fetch failed " + res.status);
    return await res.json();
  } catch (err) {
    console.error("❌ Fetch error:", err.message);
    throw err;
  }
}

// ================== ROUTES ==================
app.get("/", (req, res) => {
  res.json({ status: "✅ NSE Proxy Live", fallback: false });
});

app.get("/ipos", async (req, res) => {
  try {
    const data = await fetchFromNSE(NSE_URLS.ipo);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "NSE IPO fetch failed" });
  }
});

app.get("/gainers", async (req, res) => {
  try {
    const data = await fetchFromNSE(NSE_URLS.gainers);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "NSE Gainers fetch failed" });
  }
});

app.get("/losers", async (req, res) => {
  try {
    const data = await fetchFromNSE(NSE_URLS.losers);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "NSE Losers fetch failed" });
  }
});

app.get("/picks", async (req, res) => {
  try {
    const data = await fetchFromNSE(NSE_URLS.picks);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "NSE Picks fetch failed" });
  }
});

// ================== START ==================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
