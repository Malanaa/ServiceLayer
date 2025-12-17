// Minimal auth demo client
// Set API_BASE to the BFF address where `/api/auth/*` is exposed.
const API_BASE = window.API_BASE || 'http://localhost:5000';

const resultEl = document.getElementById('result');

function show(obj) {
  resultEl.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
}

async function post(path, body) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  try { return { status: res.status, body: JSON.parse(text) }; } catch (e) { return { status: res.status, body: text }; }
}

document.getElementById('registerForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = ev.target;
  const body = {
    firstName: f.firstName.value,
    lastName: f.lastName.value,
    email: f.email.value,
    password: f.password.value
  };
  show('Sending register...');
  try {
    const r = await post('/api/auth/register', body);
    show(r);
  } catch (e) { show('Error: ' + e.message); }
});

document.getElementById('loginForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = ev.target;
  const body = { email: f.email.value, password: f.password.value };
  show('Sending login...');
  try {
    const r = await post('/api/auth/login', body);
    show(r);
  } catch (e) { show('Error: ' + e.message); }
});

document.getElementById('meBtn').addEventListener('click', async () => {
  show('Fetching /api/auth/me...');
  try {
    const res = await fetch(API_BASE + '/api/auth/me', { credentials: 'include' });
    const data = await res.json();
    show({ status: res.status, body: data });
  } catch (e) { show('Error: ' + e.message); }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  show('Logging out...');
  try {
    const res = await fetch(API_BASE + '/api/auth/logout', { method: 'POST', credentials: 'include' });
    const data = await res.json();
    show({ status: res.status, body: data });
  } catch (e) { show('Error: ' + e.message); }
});
