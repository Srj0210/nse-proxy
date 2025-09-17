import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

let NSE_COOKIE = ""; // store NSE cookie

// Step 1: Cookie fetcher
async function refreshCookie() {
  try {
    const res = await fetch("https://www.nseindia.com", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      NSE_COOKIE = setCookie.split(";")[0];
      console.log("✅ NSE Cookie refreshed:", NSE_COOKIE);
    } else {
      console.error("❌ Cookie not found");
    }
  } catch (err) {
    console.error("Cookie fetch failed:", err.message);
  }
}

// Step 2: NSE fetch function
async function fetchNSE(url) {
  try {
    if (!NSE_COOKIE) await refreshCookie(); // first time
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "application/json",
        Referer: "https://www.nseindia.com/",
        Cookie: NSE_COOKIE,
      },
      timeout: 10000,
    });

    if (res.status === 401 || res.status === 403) {
      console.log("⚠️ Cookie expired, refreshing...");
      await refreshCookie();
      return fetchNSE(url); // retry
    }

    if (!res.ok) throw new Error(`Bad response ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("NSE fetch failed:", err.message);
    return { error: "❌ Live NSE fetch failed", url };
  }
}

// Routes
app.get("/", (req, res) => {
  res.json({ status: "✅ NSE Proxy Live (Auto-cookie + 15min cron)" });
});

app.get("/gainers", async (req, res) => {
  const data = await fetchNSE(
    "https://www.nseindia.com/api/live-analysis-variations?index=gainers"
  );
  res.json(data);
});

app.get("/losers", async (req, res) => {
  const data = await fetchNSE(
    "https://www.nseindia.com/api/live-analysis-variations?index=losers"
  );
  res.json(data);
});

app.get("/ipos", async (req, res) => {
  const data = await fetchNSE("https://www.nseindia.com/api/ipo-current-issues");
  res.json(data);
});

// Economic Times news
app.get("/news", async (req, res) => {
  try {
    const data = await fetch(
      "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms"
    );
    const text = await data.text();
    res.type("xml").send(text);
  } catch (e) {
    res.type("xml").send("<rss>Error loading news</rss>");
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  refreshCookie(); // first fetch
  setInterval(refreshCookie, 15 * 60 * 1000); // 🔄 refresh every 15 min
});
