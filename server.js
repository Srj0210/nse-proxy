import express from "express";
import fetch from "node-fetch";
import cron from "node-cron";

const app = express();
const PORT = process.env.PORT || 3000;

let NSE_COOKIES = "";

// 🟢 Function to refresh NSE cookies
async function refreshCookies() {
  try {
    const res = await fetch("https://www.nseindia.com", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36",
      },
    });

    const setCookie = res.headers.raw()["set-cookie"];
    if (setCookie) {
      NSE_COOKIES = setCookie.map((c) => c.split(";")[0]).join("; ");
      console.log("✅ NSE cookies refreshed:", NSE_COOKIES);
    }
  } catch (err) {
    console.error("❌ Cookie refresh failed:", err.message);
  }
}

// 🟢 Fetch with cookies + block detection
async function fetchWithCookies(url) {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36",
        "Accept": "application/json,text/plain,*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.nseindia.com/",
        "X-Requested-With": "XMLHttpRequest",
        Cookie: NSE_COOKIES,
      },
      redirect: "follow",
    });

    const text = await res.text();

    // Agar HTML page mila toh block
    if (text.startsWith("<!DOCTYPE html")) {
      throw new Error("🚫 Blocked by NSE (Captcha/HTML received)");
    }

    return JSON.parse(text);
  } catch (err) {
    console.error("❌ fetchWithCookies error:", err.message);
    return { error: err.message, url };
  }
}

// 🟢 API routes
app.get("/", (req, res) => {
  res.json({ status: "✅ NSE Proxy Live, No fallback" });
});

app.get("/ipos", async (req, res) => {
  const data = await fetchWithCookies(
    "https://www.nseindia.com/api/ipo-current-issues"
  );
  res.json(data);
});

app.get("/gainers", async (req, res) => {
  const data = await fetchWithCookies(
    "https://www.nseindia.com/api/live-analysis-variations?index=gainers"
  );
  res.json(data);
});

app.get("/losers", async (req, res) => {
  const data = await fetchWithCookies(
    "https://www.nseindia.com/api/live-analysis-variations?index=losers"
  );
  res.json(data);
});

app.get("/picks", async (req, res) => {
  const g = await fetchWithCookies(
    "https://www.nseindia.com/api/live-analysis-variations?index=gainers"
  );
  const l = await fetchWithCookies(
    "https://www.nseindia.com/api/live-analysis-variations?index=losers"
  );

  res.json({
    picks: [
      { type: "Long", stock: g?.data?.[0]?.symbol || "No data" },
      { type: "Short", stock: l?.data?.[0]?.symbol || "No data" },
    ],
  });
});

// 🟢 Refresh cookies every 15 min
cron.schedule("*/15 * * * *", refreshCookies);

// 🟢 Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await refreshCookies();
});
