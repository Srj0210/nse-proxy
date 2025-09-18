import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;

// IPOAlerts API (free endpoint, open IPOs)
const IPOALERTS_URL = 'https://api.ipoalerts.in/ipos?status=open';

app.get('/ipo', async (req, res) => {
  try {
    const resp = await fetch(IPOALERTS_URL);
    if (!resp.ok) {
      throw new Error('IPOAlerts API error: ' + resp.status);
    }
    const data = await resp.json();

    // API ka structure check
    const ipos = Array.isArray(data.ipos) ? data.ipos.map(item => ({
      name: item.name,
      open: item.openDate,
      close: item.closeDate,
      price: item.issuePrice || item.priceBand,
      lotSize: item.lotSize || item.marketLot,
      status: item.status
    })) : [];

    if (ipos.length === 0) {
      return res.json([{ error: "No IPOs available right now" }]);
    }

    res.json(ipos);
  } catch (err) {
    res.status(500).json([{ name: 'Error fetching IPOs', error: err.message }]);
  }
});

// Health check
app.get('/', (req, res) => res.json({ status: '✅ IPO proxy via IPOAlerts working' }));

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
