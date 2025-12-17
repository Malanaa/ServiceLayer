const express = require('express');
const axios = require('axios');

const router = express.Router();
const URL_USER_SERVICE = process.env.URL_USER_SERVICE || 'http://localhost:8080';

// POST /api/auth/register -> proxy to user-service
router.post('/register', async (req, res) => {
  // Basic server-side validation to provide field-level errors quickly to the frontend
  const required = ['email', 'password', 'name', 'lastName', 'phoneNumber', 'shippingAddress', 'creditCardNumber'];
  const missing = required.filter(f => !req.body || req.body[f] === undefined || req.body[f] === null || String(req.body[f]).trim() === '');
  if (missing.length > 0) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: missing.map(f => ({ field: f, message: `${f} is required` }))
    });
  }

  try {
    const response = await axios.post(`${URL_USER_SERVICE}/api/auth/register`, req.body, {
      validateStatus: (s) => s < 500,
    });

    // If upstream returns validation info, normalize to { errors: [{field,message}] }
    if (response.status >= 400 && response.data) {
      if (response.data.errors) return res.status(response.status).json(response.data);
      if (response.data.fieldErrors) {
        return res.status(response.status).json({ message: response.data.message || 'Validation failed', errors: response.data.fieldErrors });
      }
    }

    return res.status(response.status).json(response.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/auth/login -> proxy to user-service and forward set-cookie
router.post('/login', async (req, res) => {
  // Validate required fields for login to provide immediate field-level feedback
  const missing = [];
  if (!req.body || !req.body.email || String(req.body.email).trim() === '') missing.push('email');
  if (!req.body || !req.body.password || String(req.body.password).trim() === '') missing.push('password');
  if (missing.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors: missing.map(f => ({ field: f, message: `${f} is required` })) });
  }

  try {
    const response = await axios.post(`${URL_USER_SERVICE}/api/auth/login`, req.body, {
      withCredentials: true,
      validateStatus: (s) => s < 500,
    });

    const setCookie = response.headers && response.headers['set-cookie'];
    if (setCookie) res.setHeader('Set-Cookie', setCookie);
    // If the upstream returned a user object, set a helper cookie `user_id` on the BFF
    // so downstream proxied requests can include the user's id automatically.
    try {
      const userId = response.data && response.data.user && response.data.user.id;
      if (userId) {
        // match upstream refresh token lifetime (7 days) in milliseconds
        const maxAgeMs = 604800 * 1000;
        res.cookie('user_id', String(userId), { path: '/', httpOnly: true, maxAge: maxAgeMs });
      }
    } catch (e) {
      // ignore cookie-setting errors
    }

    // Normalize upstream validation errors to a consistent shape
    if (response.status >= 400 && response.data) {
      if (response.data.errors) return res.status(response.status).json(response.data);
      if (response.data.fieldErrors) return res.status(response.status).json({ message: response.data.message || 'Validation failed', errors: response.data.fieldErrors });
      // If upstream returns a single message like "Missing field: email", try to parse it
      if (response.data.message && typeof response.data.message === 'string') {
        const m = response.data.message.match(/(missing|missing required|missing field)[:\s]*([a-zA-Z_\-]+)/i);
        if (m && m[2]) {
          return res.status(response.status).json({ message: response.data.message, errors: [{ field: m[2], message: response.data.message }] });
        }
      }
    }

    return res.status(response.status).json(response.data);
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;

// GET /api/auth/me -> proxy to user-service to fetch current user/session
router.get('/me', async (req, res) => {
  try {
    const forwardHeaders = { Cookie: req.headers.cookie || '' };
    if (req.headers.authorization) forwardHeaders['Authorization'] = req.headers.authorization;

    const response = await axios.get(`${URL_USER_SERVICE}/api/auth/me`, {
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
