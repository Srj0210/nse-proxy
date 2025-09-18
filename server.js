import express from "express";
import fetch from "node-fetch";
import cron from "node-cron";

const app = express();
const PORT = process.env.PORT || 3000;

let NSE_COOKIE = "";
let NSE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

// Function to refresh NSE cookies
async function refreshCookie() {
  try {
    const res = await fetch("https://www.nseindia.com", {
      headers: {
        "User-Agent": NSE_USER_AGENT,
        Accept: "text/html",
      },
    });

    const cookies = res.headers.get("set-cookie");
    if (cookies) {
      NSE_COOKIE = cookies;
      console.log("✅ NSE Cookie refreshed");
    } else {
      console.log("⚠️ Cookie not received, retry later");
    }
  } catch (err) {
    console.error("❌ Cookie refresh failed:", err.message);
  }
}

// Wrapper to call NSE APIs
async function fetchNSE(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": NSE_USER_AGENT,
        Accept: "application/json",
        Cookie: NSE_COOKIE,
        Referer: "https://www.nseindia.com/",
      },
    });

    const text = await res.text();

    // Agar HTML aya toh block hua
    if (text.startsWith("<")) {
      throw new Error("Blocked by NSE (Captcha/HTML received)");
    }

    return JSON.parse(text);
  } catch (err) {
    return { error: "❌ " + err.message, url };
  }
}

// API Routes
app.get("/", (req, res) => {
  res.json({ status: "✅ NSE Proxy Live, Cookie Handling Enabled" });
});

app.get("/ipos", async (req, res) => {
  const data = await fetchNSE(
    "https://www.nseindia.com/api/ipo-current-issues"
  );
  res.json(data);
});

app.get("/gainers", async (req, res) => {
  const data = await fetchNSE(
    "https://www.nseindia.com/api/live-analysis-equity-gainers"
  );
  res.json(data);
});

app.get("/losers", async (req, res) => {
  const data = await fetchNSE(
    "https://www.nseindia.com/api/live-analysis-equity-losers"
  );
  res.json(data);
});

app.get("/picks", async (req, res) => {
  const data = await fetchNSE(
    "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050"
  );
  res.json(data);
});

// Refresh cookie every 15 min
cron.schedule("*/15 * * * *", () => {
  console.log("🔄 Refreshing NSE cookie...");
  refreshCookie();
});

// Initial cookie fetch
refreshCookie();

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
