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
  console.log('==============================');
  console.log('🚀 MPESA STK PUSH INITIATED 🚀');
  console.log('Received:', { phone_number, amount, narrative });
  console.log('==============================');
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
  CallBackURL: 'https://kentune-mpesa-backend.vercel.app/api/mpesa/callback', // Live Vercel callback URL
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
      res.json({
        success: true,
        message: stkRes.data.CustomerMessage || 'STK Push request sent. Check your phone to complete payment.',
        data: stkRes.data
      });
    } catch (stkErr) {
      console.error('❌ STK Push Error:', stkErr.response?.data || stkErr.message);
      res.status(500).json({
        success: false,
        error: stkErr.response?.data || stkErr.message,
        message: 'Failed to initiate MPesa payment. Please try again or contact support.'
      });
    }
  } catch (err) {
    console.error('❌ MPESA API Error:', err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: err.response?.data || err.message,
      message: 'MPesa API error. Please try again or contact support.'
    });
  }
});



// In-memory store for payment status (for demo; use DB in production)
const paymentStatusStore = {};

// MPesa payment callback endpoint
app.post('/api/mpesa/callback', (req, res) => {
  console.log('==============================');
  console.log('MPESA CALLBACK EVENT RECEIVED');
  console.log('Raw Body:', JSON.stringify(req.body, null, 2));
  const callback = req.body.Body?.stkCallback;
  let status = 'pending';
  let checkoutId = null;
  if (callback) {
    checkoutId = callback.CheckoutRequestID;
    console.log('Callback CheckoutRequestID:', checkoutId);
    console.log('Callback ResultCode:', callback.ResultCode);
    console.log('Callback ResultDesc:', callback.ResultDesc);
    if (callback.ResultCode === 0) {
      status = 'paid';
      console.log('PAYMENT SUCCESSFUL for CheckoutRequestID:', checkoutId);
    } else {
      status = 'failed';
      console.log('PAYMENT FAILED/DECLINED for CheckoutRequestID:', checkoutId);
    }
    // Store status by CheckoutRequestID
    if (checkoutId) {
      paymentStatusStore[checkoutId] = status;
      console.log('Updated paymentStatusStore:', paymentStatusStore);
    }
  } else {
    console.log('No valid callback found in body.');
  }
  res.json({ success: true, status, checkoutId, message: callback?.ResultDesc || 'Callback received.' });
});


// Endpoint to view all payment confirmations (for admin monitoring)
app.get('/api/mpesa/payment-confirmations', (req, res) => {
  res.json({ success: true, payments: paymentStatusStore });
});

// Endpoint for frontend to poll payment status
app.get('/api/mpesa/payment-status/:checkoutId', (req, res) => {
  const { checkoutId } = req.params;
  const status = paymentStatusStore[checkoutId] || 'pending';
  res.json({ success: true, status });
});

app.listen(PORT, () => {
  console.log(`MPesa backend running on port ${PORT}`);
});
