
import db from './firestore.js';

let paymentStatusStore = global.paymentStatusStore || {};
global.paymentStatusStore = paymentStatusStore;

export default async function handler(req, res) {
  const { checkoutId } = req.query;
  if (!checkoutId) {
    return res.status(400).json({ success: false, error: 'Missing checkoutId' });
  }
  try {
    // Try to get payment status from Firestore
    const doc = await db.collection('transactions').doc(checkoutId).get();
    if (doc.exists) {
      const data = doc.data();
      const status = data.status || 'paid';
      return res.status(200).json({ success: true, status });
    }
  } catch (e) {
    // If Firestore fails, fallback to in-memory
    console.error('Firestore error:', e);
  }
  // fallback to in-memory (should rarely be used)
  const status = paymentStatusStore[checkoutId] || 'pending';
  res.status(200).json({ success: true, status });
}
