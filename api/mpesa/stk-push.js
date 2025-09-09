import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { phone_number, amount, narrative } = req.body;
  if (!phone_number || !amount) {
    return res.status(400).json({ error: 'Phone number and amount are required.' });
  }
  try {
    const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
    const tokenRes = await axios.get('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { Authorization: `Basic ${auth}` }
    });
    const access_token = tokenRes.data.access_token;
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(
      process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp
    ).toString('base64');
    const payload = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerBuyGoodsOnline',
      Amount: amount,
      PartyA: phone_number,
      PartyB: process.env.MPESA_TILL_NUMBER,
      PhoneNumber: phone_number,
      CallBackURL: `${process.env.BASE_URL}/api/mpesa/callback`,
      AccountReference: narrative || 'Kentunez Payment',
      TransactionDesc: narrative || 'Kentunez Payment'
    };
    const stkRes = await axios.post('https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest', payload, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      }
    });
    res.status(200).json({
      success: true,
      message: stkRes.data.CustomerMessage || 'STK Push request sent. Check your phone to complete payment.',
      data: stkRes.data
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.response?.data || err.message,
      message: 'Failed to initiate MPesa payment. Please try again or contact support.'
    });
  }
}
