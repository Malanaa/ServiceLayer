const express = require('express');
const axios = require('axios');

const router = express.Router();
const URL_USER_SERVICE = process.env.URL_USER_SERVICE || 'http://localhost:8080';

// GET /api/products -> proxy to user-service
router.get('/', async (req, res) => {
  try {
    const response = await axios.get(`${URL_USER_SERVICE}/api/products`, {
      validateStatus: (s) => s < 500,
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/products -> proxy to user-service
router.post('/', async (req, res) => {
  try {
    const response = await axios.post(`${URL_USER_SERVICE}/api/products`, req.body, {
      validateStatus: (s) => s < 500,
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
