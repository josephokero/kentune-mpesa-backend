let paymentStatusStore = global.paymentStatusStore || {};
global.paymentStatusStore = paymentStatusStore;

export default function handler(req, res) {
  const { checkoutId } = req.query;
  const status = paymentStatusStore[checkoutId] || 'pending';
  res.status(200).json({ success: true, status });
}
