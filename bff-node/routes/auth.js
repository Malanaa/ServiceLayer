const express = require('express');
const axios = require('axios');

const router = express.Router();
const URL_USER_SERVICE = process.env.URL_USER_SERVICE || 'http://localhost:8080';
const URL_STORAGE_SERVICE = process.env.URL_STORAGE_SERVICE || 'http://storage-service:8080';
const URL_STORAGE_SERVICE_FALLBACK = process.env.URL_STORAGE_SERVICE_FALLBACK || 'http://host.docker.internal:9001';

// POST /api/auth/register -> proxy to user-service
router.post('/register', async (req, res) => {
  try {
    // Extract frontend data
    const { firstName, lastName, email, password, phone, address, payment } = req.body;

    // Format shipping address as a string if provided
    let shippingAddress = 'Not provided';
    if (address && typeof address === 'object') {
      const parts = [];
      if (address.street) parts.push(address.street);
      if (address.city) parts.push(address.city);
      if (address.state) parts.push(address.state);
      if (address.zip) parts.push(address.zip);
      if (parts.length > 0) {
        shippingAddress = parts.join(', ');
      }
    }

    // Normalize/transform fields to backend expected format
    // Phone must be E.164: +[country][number], 7-15 digits total (first non-zero)
    const rawDigits = (phone || '').replace(/\D/g, '');
    let e164Phone;
    if (!rawDigits) {
      e164Phone = '+5551234'; // minimal valid fallback matching regex
    } else if (rawDigits.length === 10) {
      e164Phone = `+1${rawDigits}`; // assume US when 10 digits
    } else if (rawDigits.startsWith('0')) {
      e164Phone = `+${rawDigits.replace(/^0+/, '') || '5551234'}`;
    } else {
      e164Phone = `+${rawDigits}`;
    }

    // Map frontend format to backend expected format
    const userInformation = {
      name: firstName || 'User',
      lastName: lastName || 'Unknown',
      email: email,
      password: password,
      phoneNumber: e164Phone,
      shippingAddress: shippingAddress,
      creditCardNumber: (payment && payment.cardNumber) || '4111111111111'
    };

    console.log('BFF Registration - Input:', JSON.stringify(req.body, null, 2));
    console.log('BFF Registration - Transformed:', JSON.stringify(userInformation, null, 2));

    const response = await axios.post(`${URL_USER_SERVICE}/api/auth/register`, userInformation, {
      headers: { Cookie: req.headers.cookie || '' },
      validateStatus: (s) => s < 500,
    });
    const setCookie = response.headers && response.headers['set-cookie'];
    // forward any Set-Cookie from user service to client
    if (setCookie) res.setHeader('Set-Cookie', setCookie);

    // If registration succeeded and there is address or payment in the original request,
    // persist structured data into storage-service directly (avoids cookie handling and an extra frontend call)
    try {
      if ((response.status === 200 || response.status === 201) && (address || payment || phone)) {
        const createdUser = response.data;
        const userId = createdUser && (createdUser.id || (createdUser.user && createdUser.user.id));
        if (userId) {
          const payload = {};
          if (address) {
            const a = address;
            if (a.street) payload.street = a.street;
            if (a.city) payload.city = a.city;
            if (a.state) payload.state = a.state;
            if (a.province) payload.province = a.province;
            if (a.zip) payload.zip = a.zip;
            const addr = [a.street, a.city, a.state || a.province, a.zip].filter(Boolean).join(', ');
            if (addr) payload.shippingAddress = addr;
          }
          if (payment) {
            const digits = String(payment.cardNumber || '').replace(/\D/g, '');
            const last4 = digits ? digits.slice(-4) : undefined;
            if (last4) payload.creditCardMask = `****-****-****-${last4}`;
            if (payment.cardHolderName) payload.cardHolderName = payment.cardHolderName;
            if (payment.expiry) payload.cardExpiry = payment.expiry;
            // never include cvc
          }
          if (phone) payload.phoneNumber = String(phone).replace(/[\s\-]/g, '');

          if (Object.keys(payload).length > 0) {
            console.log('Persisting profile after registration for userId=', userId, 'payload=', JSON.stringify(payload));
            const options = { validateStatus: (s) => s < 500 };
            let persisted = false;
            try {
              await axios.put(`${URL_STORAGE_SERVICE}/internal/users/${userId}`, payload, options);
              persisted = true;
              console.log('Persisted to storage-service internal');
            } catch (err1) {
              console.warn('Primary storage PUT failed, trying fallback:', err1?.message || err1);
              try {
                await axios.put(`${URL_STORAGE_SERVICE_FALLBACK}/internal/users/${userId}`, payload, options);
                persisted = true;
                console.log('Persisted to storage-service fallback');
              } catch (err2) {
                console.error('Failed to persist profile to storage-service after registration:', err2?.response?.data || err2.message || err2);
              }
            }

            // If we persisted, fetch the latest user from storage to return it in the registration response
            if (persisted) {
              try {
                let got;
                try {
                  got = await axios.get(`${URL_STORAGE_SERVICE}/internal/users/${userId}`, options);
                } catch (e1) {
                  got = await axios.get(`${URL_STORAGE_SERVICE_FALLBACK}/internal/users/${userId}`, options);
                }
                if (got && got.status === 200 && got.data) {
                  // return the stored user as the registration response body
                  if (setCookie) res.setHeader('Set-Cookie', setCookie);
                  return res.status(response.status).json(got.data);
                }
              } catch (e) {
                console.warn('Could not fetch persisted user to include in registration response:', e?.message || e);
              }
            }
          }
        }
      }
    } catch (e) {
      // Log but don't fail registration if profile update fails
      console.error('Failed to persist profile after registration:', e?.response?.data || e.message || e);
    }

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
      headers: { Cookie: req.headers.cookie || '' },
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

// POST /api/auth/logout -> proxy to user-service logout and forward Set-Cookie
router.post('/logout', async (req, res) => {
  try {
    const response = await axios.post(`${URL_USER_SERVICE}/api/auth/logout`, req.body, {
      headers: { Cookie: req.headers.cookie || '' },
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

// GET /api/auth/me -> proxy to user-service
router.get('/me', async (req, res) => {
  try {
    const response = await axios.get(`${URL_USER_SERVICE}/api/auth/me`, {
      headers: { Cookie: req.headers.cookie || '' },
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
