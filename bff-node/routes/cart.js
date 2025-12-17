const express = require('express');
const axios = require('axios');

const router = express.Router();
const URL_CART_SERVICE = process.env.URL_CART_SERVICE || 'http://user-service:8080';

// GET /api/cart -> forward to cart service
router.get('/', async (req, res) => {
  try {
    const response = await axios.get(`${URL_CART_SERVICE}/api/cart`, {
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

// POST /api/cart/items -> add item
router.post('/items', async (req, res) => {
  try {
    const response = await axios.post(`${URL_CART_SERVICE}/api/cart/items`, req.body, {
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

// DELETE /api/cart/items/:id -> remove item
router.delete('/items/:id', async (req, res) => {
  try {
    const response = await axios.delete(`${URL_CART_SERVICE}/api/cart/items/${req.params.id}`, {
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

// POST /api/cart/checkout -> forward to cart service
router.post('/checkout', async (req, res) => {
  try {
    const response = await axios.post(`${URL_CART_SERVICE}/api/cart/checkout`, req.body, {
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
