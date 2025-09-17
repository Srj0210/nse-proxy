import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

// Helper to fetch NSE API
async function fetchNSE(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115.0 Safari/537.36",
        Accept: "application/json",
      },
    });
    return await res.json();
  } catch (err) {
    return { error: err.message };
  }
}

// Routes
app.get("/", (req, res) => {
  res.json({ status: "NSE Proxy Running ✅" });
});

app.get("/ipos", async (req, res) => {
  const data = await fetchNSE("https://www.nseindia.com/api/ipo-current-issues");
  res.json(data);
});

app.get("/gainers", async (req, res) => {
  const data = await fetchNSE(
    "https://www.nseindia.com/api/live-analysis-variations?index=gainers"
  );
  res.json(data);
});

app.get("/losers", async (req, res) => {
  const data = await fetchNSE(
    "https://www.nseindia.com/api/live-analysis-variations?index=loosers"
  );
  res.json(data);
});

// Port (for local testing)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
