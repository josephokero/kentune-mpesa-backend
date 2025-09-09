require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

const PORT = process.env.PORT || 5001;

// Health check
app.get('/', (req, res) => {
  res.send('MPesa backend is running');
});

// Step 2: MPesa STK Push endpoint
app.post('/api/mpesa/stk-push', async (req, res) => {
  const { phone_number, amount, narrative } = req.body;
  console.log('--- MPESA STK PUSH INITIATED ---');
  console.log('Received:', { phone_number, amount, narrative });
  if (!phone_number || !amount) {
    console.error('Missing phone number or amount');
    return res.status(400).json({ error: 'Phone number and amount are required.' });
  }

  // Step 1: Get access token
  try {
    const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
    console.log('Auth header:', auth);
    const tokenRes = await axios.get('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: {
        Authorization: `Basic ${auth}`
      }
    });
    console.log('Access token response:', tokenRes.data);
    const access_token = tokenRes.data.access_token;

    // Step 2: Prepare STK Push payload
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(
      process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp
    ).toString('base64');

    const payload = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
  // Automatically set correct transaction type for Till
  TransactionType: 'CustomerBuyGoodsOnline',
      Amount: amount,
      PartyA: phone_number,
  PartyB: process.env.MPESA_TILL_NUMBER,
      PhoneNumber: phone_number,
      CallBackURL: 'https://yourdomain.com/api/mpesa/callback', // Change to your actual callback URL
      AccountReference: narrative || 'Kentunez Payment',
      TransactionDesc: narrative || 'Kentunez Payment'
    };
    console.log('STK Push Payload:', payload);

    // Step 3: Send STK Push request
    try {
      const stkRes = await axios.post('https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest', payload, {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('STK Push Response:', stkRes.data);
      res.json({ success: true, data: stkRes.data });
    } catch (stkErr) {
      console.error('STK Push Error:', stkErr.response?.data || stkErr.message);
      res.status(500).json({ error: stkErr.response?.data || stkErr.message });
    }
  } catch (err) {
    console.error('MPESA API Error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

app.listen(PORT, () => {
  console.log(`MPesa backend running on port ${PORT}`);
});
