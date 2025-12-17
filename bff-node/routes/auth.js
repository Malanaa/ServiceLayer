const express = require('express');
const axios = require('axios');

const router = express.Router();
const URL_USER_SERVICE = process.env.URL_USER_SERVICE || 'http://user-service:8080';

// POST /api/auth/register -> proxy to user-service
router.post('/register', async (req, res) => {
  try {
    const response = await axios.post(`${URL_USER_SERVICE}/api/auth/register`, req.body, {
      validateStatus: (s) => s < 500,
    });
    return res.status(response.status).json(response.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/auth/login -> proxy to user-service and forward set-cookie
router.post('/login', async (req, res) => {
  try {
    const response = await axios.post(`${URL_USER_SERVICE}/api/auth/login`, req.body, {
      withCredentials: true,
      validateStatus: (s) => s < 500,
    });

    const setCookie = response.headers && response.headers['set-cookie'];
    if (setCookie) res.setHeader('Set-Cookie', setCookie);
    return res.status(response.status).json(response.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
