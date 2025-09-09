// In-memory store for payment status (for demo; use DB in production)
let paymentStatusStore = global.paymentStatusStore || {};
global.paymentStatusStore = paymentStatusStore;

export default function handler(req, res) {
  res.status(200).json({ success: true, payments: paymentStatusStore });
}
