const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// NSE API endpoints
const endpoints = {
  ipos: "https://www.nseindia.com/api/ipo-current-issues",
  gainers: "https://www.nseindia.com/api/live-analysis-variations?index=gainers",
  losers: "https://www.nseindia.com/api/live-analysis-variations?index=loosers"
};

// Helper: fetch with NSE headers
async function fetchNSE(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115 Safari/537.36",
      "Accept": "application/json",
      "Referer": "https://www.nseindia.com/"
    }
  });
  return res.json();
}

// Routes
app.get("/", (req, res) => {
  res.json({ status: "NSE Proxy Running ✅" });
});

app.get("/ipos", async (req, res) => {
  try {
    const data = await fetchNSE(endpoints.ipos);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/gainers", async (req, res) => {
  try {
    const data = await fetchNSE(endpoints.gainers);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/losers", async (req, res) => {
  try {
    const data = await fetchNSE(endpoints.losers);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`);
});
