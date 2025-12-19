const express = require('express');
const axios = require('axios');

const router = express.Router();
const URL_USER_SERVICE = process.env.URL_USER_SERVICE || 'http://localhost:8080';
const URL_STORAGE_SERVICE = process.env.URL_STORAGE_SERVICE || 'http://storage-service:8080';
const URL_STORAGE_SERVICE_FALLBACK = process.env.URL_STORAGE_SERVICE_FALLBACK || 'http://host.docker.internal:9001';

// Helper to build shipping address string
function buildShippingAddress(address) {
  if (!address || typeof address !== 'object') return undefined;
  const parts = [];
  if (address.street) parts.push(address.street);
  if (address.city) parts.push(address.city);
  // accept either state or province
  if (address.state) parts.push(address.state);
  else if (address.province) parts.push(address.province);
  if (address.zip) parts.push(address.zip);
  return parts.length ? parts.join(', ') : undefined;
}

// Helper to mask credit card to ****-****-****-1234
function maskCardNumber(payment) {
  if (!payment || !payment.cardNumber) return undefined;
  const digits = String(payment.cardNumber).replace(/\D/g, '');
  if (!digits) return undefined;
  const last4 = digits.slice(-4);
  return `****-****-****-${last4}`;
}

async function updateProfileHandler(req, res) {
  try {
    // Who is the current user?
    const meResp = await axios.get(`${URL_USER_SERVICE}/api/auth/me`, {
      headers: { Cookie: req.headers.cookie || '' },
      withCredentials: true,
      validateStatus: (s) => s < 500,
    });
    if (!meResp.status || meResp.status !== 200 || !meResp.data || !meResp.data.authenticated) {
      return res.status(meResp.status || 401).json(meResp.data || { authenticated: false });
    }
    const user = meResp.data.user || {};
    const userId = user.id;
    if (!userId) return res.status(401).json({ authenticated: false });

    // Build update payload for storage-service
    const payload = {};
    const { address, payment, phone } = req.body || {};
    const addr = buildShippingAddress(address);
    if (addr) payload.shippingAddress = addr;
    // add components if provided
    if (address && typeof address === 'object') {
      if (address.street) payload.street = address.street;
      if (address.city) payload.city = address.city;
      if (address.state) payload.state = address.state;
      if (address.province) payload.province = address.province;
      if (address.zip) payload.zip = address.zip;
    }
    const mask = maskCardNumber(payment);
    if (mask) payload.creditCardMask = mask;
    if (payment && typeof payment === 'object') {
      if (payment.cardHolderName) payload.cardHolderName = payment.cardHolderName;
      if (payment.expiry) payload.cardExpiry = payment.expiry;
    }
    if (phone) payload.phoneNumber = String(phone).replace(/[\s\-]/g, '');

    // No changes? return current profile
    if (Object.keys(payload).length === 0) {
      return res.status(200).json({ updated: false, user });
    }

    const options = { validateStatus: (s) => s < 500 };
    try {
      const upd = await axios.put(`${URL_STORAGE_SERVICE}/internal/users/${userId}`, payload, options);
      return res.status(upd.status).json(upd.data);
    } catch (e) {
      // try fallback via host if service DNS/port not reachable from container
      try {
        const upd2 = await axios.put(`${URL_STORAGE_SERVICE_FALLBACK}/internal/users/${userId}`, payload, options);
        return res.status(upd2.status).json(upd2.data);
      } catch (e2) {
        if (e2.response) return res.status(e2.response.status).json(e2.response.data);
        return res.status(500).json({ message: 'Server error', error: e2.message });
      }
    }
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

// Support PUT and POST for compatibility with frontend/test script
router.put('/', updateProfileHandler);
router.post('/', updateProfileHandler);

// GET / - return profile (or empty profile) — tolerant for unauthenticated callers
async function getProfileHandler(req, res) {
  try {
    const meResp = await axios.get(`${URL_USER_SERVICE}/api/auth/me`, {
      headers: { Cookie: req.headers.cookie || '' },
      withCredentials: true,
      validateStatus: (s) => s < 500,
    });

    // if not authenticated, return empty profile (200) so frontend can safely render
    if (!meResp.status || meResp.status !== 200 || !meResp.data || !meResp.data.authenticated) {
      return res.status(200).json({ profile: {} });
    }

    const user = meResp.data.user || {};
    const userId = user.id;
    if (!userId) return res.status(200).json({ profile: {} });

    const options = { validateStatus: (s) => s < 500 };
    try {
      const stored = await axios.get(`${URL_STORAGE_SERVICE}/internal/users/${userId}`, options);
      const data = stored.data || {};

      // Map storage response to frontend-friendly profile shape
      const profile = {
        address: {
          line1: data.street || '',
          city: data.city || '',
          postal: data.zip || data.postal || '',
          country: data.country || '',
          province: data.province || data.state || ''
        },
        payment: {
          // storage may expose cardHolderName or creditCardMask
          name: data.cardHolderName || data.cardHolder || '',
          cardNumber: data.creditCardMask || '',
          expiry: data.cardExpiry || '',
          cvv: ''
        }
      };

      return res.status(stored.status || 200).json({ profile, user });
    } catch (e) {
      // try fallback storage host
      try {
        const stored2 = await axios.get(`${URL_STORAGE_SERVICE_FALLBACK}/internal/users/${userId}`, options);
        const data = stored2.data || {};
        const profile = {
          address: {
            line1: data.street || '',
            city: data.city || '',
            postal: data.zip || data.postal || '',
            country: data.country || '',
            province: data.province || data.state || ''
          },
          payment: {
            name: data.cardHolderName || data.cardHolder || '',
            cardNumber: data.creditCardMask || '',
            expiry: data.cardExpiry || '',
            cvv: ''
          }
        };
        return res.status(stored2.status || 200).json({ profile, user });
      } catch (e2) {
        return res.status(200).json({ profile: {} });
      }
    }
  } catch (err) {
    return res.status(200).json({ profile: {} });
  }
}

router.get('/', getProfileHandler);

module.exports = router;
