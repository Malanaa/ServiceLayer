const express = require('express');
const axios = require('axios');

const router = express.Router();
const URL_PAYMENT_SERVICE = process.env.URL_PAYMENT_SERVICE || 'http://payment-service:9102';

// POST /api/payment/process -> proxy to payment-service
router.post('/process', async (req, res) => {
  try {
    const forwardHeaders = { Cookie: req.headers.cookie || '' };
    if (req.headers['x-user-id']) forwardHeaders['X-User-Id'] = req.headers['x-user-id'];
    else if (req.cookies && req.cookies.user_id) forwardHeaders['X-User-Id'] = req.cookies.user_id;
    if (req.headers.authorization) forwardHeaders['Authorization'] = req.headers.authorization;

    const response = await axios.post(`${URL_PAYMENT_SERVICE}/api/payment/process`, req.body, {
      headers: forwardHeaders,
      withCredentials: true,
      validateStatus: (s) => s < 500,
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/payment/reset -> proxy to payment-service
router.post('/reset', async (req, res) => {
  try {
    const forwardHeaders = { Cookie: req.headers.cookie || '' };
    if (req.headers['x-user-id']) forwardHeaders['X-User-Id'] = req.headers['x-user-id'];
    else if (req.cookies && req.cookies.user_id) forwardHeaders['X-User-Id'] = req.cookies.user_id;
    if (req.headers.authorization) forwardHeaders['Authorization'] = req.headers.authorization;

    const response = await axios.post(`${URL_PAYMENT_SERVICE}/api/payment/reset`, {}, {
      headers: forwardHeaders,
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
