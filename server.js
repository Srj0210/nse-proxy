import express from "express";
import fetch from "node-fetch";
import cron from "node-cron";

const app = express();
const PORT = process.env.PORT || 3000;

let NSE_COOKIES = "";

// Helper: fetch with cookies
async function fetchWithCookies(url) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36",
      "Accept": "application/json,text/html,*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://www.nseindia.com/",
      Cookie: NSE_COOKIES,
    },
  });

  // agar response me naye cookies mile to update kar do
  const setCookie = res.headers.raw()["set-cookie"];
  if (setCookie) {
    NSE_COOKIES = setCookie.map((c) => c.split(";")[0]).join("; ");
    console.log("🔄 Updated NSE cookies:", NSE_COOKIES);
  }

  return res;
}

// Step 1: NSE homepage visit to get cookies
async function refreshCookies() {
  try {
    console.log("🔄 Refreshing NSE cookies...");
    const res = await fetch("https://www.nseindia.com", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36",
      },
    });
    const setCookie = res.headers.raw()["set-cookie"];
    if (setCookie) {
      NSE_COOKIES = setCookie.map((c) => c.split(";")[0]).join("; ");
      console.log("✅ NSE cookies refreshed.");
    }
  } catch (err) {
    console.error("❌ Cookie refresh error:", err.message);
  }
}

// Run cookie refresh every 15 minutes
cron.schedule("*/15 * * * *", refreshCookies);

// Refresh cookies at startup
await refreshCookies();

// ========== Routes ==========

// Root check
app.get("/", (req, res) => {
  res.send("✅ NSE Proxy is running with auto-cookie refresh");
});

// IPOs
app.get("/ipos", async (req, res) => {
  try {
    const apiUrl = "https://www.nseindia.com/api/ipo-current-issues";
    const resp = await fetchWithCookies(apiUrl);
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gainers
app.get("/gainers", async (req, res) => {
  try {
    const apiUrl =
      "https://www.nseindia.com/api/live-analysis-variations?index=gainers";
    const resp = await fetchWithCookies(apiUrl);
    const data = await resp.json();
    res.json(data.data || data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Losers
app.get("/losers", async (req, res) => {
  try {
    const apiUrl =
      "https://www.nseindia.com/api/live-analysis-variations?index=loosers";
    const resp = await fetchWithCookies(apiUrl);
    const data = await resp.json();
    res.json(data.data || data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Picks (simple logic: top gainer = Long, top loser = Short)
app.get("/picks", async (req, res) => {
  try {
    const gResp = await fetchWithCookies(
      "https://www.nseindia.com/api/live-analysis-variations?index=gainers"
    );
    const lResp = await fetchWithCookies(
      "https://www.nseindia.com/api/live-analysis-variations?index=loosers"
    );
    const gData = await gResp.json();
    const lData = await lResp.json();

    const picks = [];
    if (gData?.data?.[0]) {
      picks.push({
        type: "Long",
        stock: gData.data[0].symbol,
        reason: "Top gainer",
      });
    }
    if (lData?.data?.[0]) {
      picks.push({
        type: "Short",
        stock: lData.data[0].symbol,
        reason: "Top loser",
      });
    }

    res.json(picks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
