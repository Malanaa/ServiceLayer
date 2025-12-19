const express = require('express');
const axios = require('axios');

const router = express.Router();
// Prefer explicit ORDER service, but fall back to USER service where checkout is implemented
const URL_ORDER_SERVICE = process.env.URL_USER_SERVICE || 'http://localhost:8080';

// POST /api/orders/checkout -> proxy to the checkout implementation.
// In this stack checkout orchestration lives in the user-service at /api/cart/checkout,
// so forward there by default. If an explicit ORDER service is provided, you can
// override `URL_ORDER_SERVICE` in the environment, but the default uses the user-service.
router.post('/checkout', async (req, res) => {
  try {
    // forward to user-service checkout endpoint which orchestrates reserve->payment->finalize
    const target = `${URL_ORDER_SERVICE.replace(/\/$/, '')}/api/cart/checkout`;
    const response = await axios.post(target, req.body, {
      headers: { Cookie: req.headers.cookie || '' },
      withCredentials: true,
      validateStatus: (s) => s < 500,
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/orders -> list orders
router.get('/', async (req, res) => {
  try {
    const response = await axios.get(`${URL_ORDER_SERVICE}/api/orders`, {
      headers: { Cookie: req.headers.cookie || '' },
      withCredentials: true,
      validateStatus: (s) => s < 500,
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/orders/:orderId -> get specific order
router.get('/:orderId', async (req, res) => {
  try {
    const response = await axios.get(`${URL_ORDER_SERVICE}/api/orders/${req.params.orderId}`, {
      headers: { Cookie: req.headers.cookie || '' },
      withCredentials: true,
      validateStatus: (s) => s < 500,
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
