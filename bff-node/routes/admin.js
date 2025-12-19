const express = require('express');
const axios = require('axios');

const router = express.Router();
const URL_USER_SERVICE = process.env.URL_USER_SERVICE || 'http://localhost:8080';

// GET /api/admin/orders
router.get('/orders', async (req, res) => {
  try {
    const response = await axios.get(`${URL_USER_SERVICE}/api/admin/orders`, { params: req.query, validateStatus: s => s < 500, headers: { cookie: req.headers.cookie || '' } });
    return res.status(response.status).json(response.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/orders/:id', async (req, res) => {
  try {
    const response = await axios.get(`${URL_USER_SERVICE}/api/admin/orders/${req.params.id}`, { validateStatus: s => s < 500, headers: { cookie: req.headers.cookie || '' } });
    return res.status(response.status).json(response.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// users
router.get('/users', async (req, res) => {
  try {
    const response = await axios.get(`${URL_USER_SERVICE}/api/admin/users`, { validateStatus: s => s < 500, headers: { cookie: req.headers.cookie || '' } });
    return res.status(response.status).json(response.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const response = await axios.put(`${URL_USER_SERVICE}/api/admin/users/${req.params.id}`, req.body, { validateStatus: s => s < 500, headers: { cookie: req.headers.cookie || '' } });
    return res.status(response.status).json(response.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// update product inventory
router.put('/products/:id/inventory', async (req, res) => {
  try {
    const response = await axios.put(`${URL_USER_SERVICE}/api/admin/products/${req.params.id}/inventory`, req.body, { validateStatus: s => s < 500, headers: { cookie: req.headers.cookie || '' } });
    return res.status(response.status).json(response.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
