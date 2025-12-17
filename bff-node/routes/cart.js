const express = require('express');
const axios = require('axios');

const router = express.Router();
// For local dev default to localhost so DNS resolution doesn't fail; override with env when using docker-compose
const URL_CART_SERVICE = process.env.URL_CART_SERVICE || 'http://localhost:8080';

// GET /api/cart -> forward to cart service
router.get('/', async (req, res) => {
  try {
    const forwardHeaders = { Cookie: req.headers.cookie || '' };
    // Prefer explicit header, otherwise use helper cookie `user_id` set at login
    if (req.headers['x-user-id']) forwardHeaders['X-User-Id'] = req.headers['x-user-id'];
    else if (req.cookies && req.cookies.user_id) forwardHeaders['X-User-Id'] = req.cookies.user_id;
    if (req.headers.authorization) forwardHeaders['Authorization'] = req.headers.authorization;

    const response = await axios.get(`${URL_CART_SERVICE}/api/cart`, {
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

// POST /api/cart/items -> add item
router.post('/items', async (req, res) => {
  try {
    const forwardHeaders = { Cookie: req.headers.cookie || '' };
    if (req.headers['x-user-id']) forwardHeaders['X-User-Id'] = req.headers['x-user-id'];
    else if (req.cookies && req.cookies.user_id) forwardHeaders['X-User-Id'] = req.cookies.user_id;
    if (req.headers.authorization) forwardHeaders['Authorization'] = req.headers.authorization;

    const response = await axios.post(`${URL_CART_SERVICE}/api/cart/items`, req.body, {
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

// DELETE /api/cart/items/:id -> remove item
router.delete('/items/:id', async (req, res) => {
  try {
    const forwardHeaders = { Cookie: req.headers.cookie || '' };
    if (req.headers['x-user-id']) forwardHeaders['X-User-Id'] = req.headers['x-user-id'];
    else if (req.cookies && req.cookies.user_id) forwardHeaders['X-User-Id'] = req.cookies.user_id;
    if (req.headers.authorization) forwardHeaders['Authorization'] = req.headers.authorization;

    const response = await axios.delete(`${URL_CART_SERVICE}/api/cart/items/${req.params.id}`, {
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

// POST /api/cart/checkout -> forward to cart service
router.post('/checkout', async (req, res) => {
  try {
    const forwardHeaders = { Cookie: req.headers.cookie || '' };
    if (req.headers['x-user-id']) forwardHeaders['X-User-Id'] = req.headers['x-user-id'];
    else if (req.cookies && req.cookies.user_id) forwardHeaders['X-User-Id'] = req.cookies.user_id;
    if (req.headers.authorization) forwardHeaders['Authorization'] = req.headers.authorization;

    const response = await axios.post(`${URL_CART_SERVICE}/api/cart/checkout`, req.body, {
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
