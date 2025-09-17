import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// NSE base API endpoints
const NSE_BASE = "https://www.nseindia.com/api";

// ✅ Common fetch with headers
async function fetchWithUA(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115.0 Safari/537.36",
      Accept: "application/json",
    },
  });
  return response;
}

// ---------- ROUTES ----------

// Health check
app.get("/", (req, res) => {
  res.json({ status: "NSE Proxy Running ✅" });
});

// IPOs
app.get("/ipos", async (req, res) => {
  try {
    const response = await fetchWithUA(`${NSE_BASE}/ipo-current-issues`);
    const text = await response.text();

    try {
      // Try to parse JSON
      const json = JSON.parse(text);
      res.json(json);
    } catch (err) {
      // If parsing fails, send trimmed HTML (so it doesn’t break)
      res.json({
        error: "IPO endpoint did not return JSON",
        preview: text.slice(0, 500),
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gainers
app.get("/gainers", async (req, res) => {
  try {
    const response = await fetchWithUA(
      `${NSE_BASE}/live-analysis-variations?index=gainers`
    );
    const json = await response.json();
    res.json(json);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Losers
app.get("/losers", async (req, res) => {
  try {
    const response = await fetchWithUA(
      `${NSE_BASE}/live-analysis-variations?index=loosers`
    );
    const json = await response.json();
    res.json(json);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- START (local only, Vercel auto handles prod) ----------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
