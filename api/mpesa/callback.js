let paymentStatusStore = global.paymentStatusStore || {};
global.paymentStatusStore = paymentStatusStore;

export default function handler(req, res) {
  const callback = req.body.Body?.stkCallback;
  let status = 'pending';
  let checkoutId = null;
  if (callback) {
    checkoutId = callback.CheckoutRequestID;
    if (callback.ResultCode === 0) {
      status = 'paid';
    } else {
      status = 'failed';
    }
    if (checkoutId) {
      paymentStatusStore[checkoutId] = status;
    }
  }
  res.status(200).json({ success: true, status, checkoutId, message: callback?.ResultDesc || 'Callback received.' });
}
