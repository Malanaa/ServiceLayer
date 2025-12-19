const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());


const USERS_DB = __dirname + '/mock-users.json';
let users = [];
try {
  if (fs.existsSync(USERS_DB)) {
    users = JSON.parse(fs.readFileSync(USERS_DB, 'utf8') || '[]');
  }
} catch (e) {
  console.error('Failed to read users DB:', e.message);
  users = [];
}

function persistUsers() {
  try {
    fs.writeFileSync(USERS_DB, JSON.stringify(users, null, 2));
  } catch (e) {
    console.error('Failed to write users DB:', e.message);
  }
}

const PROD_DB = __dirname + '/mock-products.json';
let products = [];
try {
  if (fs.existsSync(PROD_DB)) {
    products = JSON.parse(fs.readFileSync(PROD_DB, 'utf8') || '[]');
  }
} catch (e) {
  console.error('Failed to read products DB:', e.message);
  products = [];
}

try {
  let changed = false;
  products = (products || []).map(p => {
    if (p.inventory === undefined) {
      p.inventory = 10;
      changed = true;
    }
    return p;
  });
  if (changed) persistProducts();
} catch (e) {
  console.error('Failed to normalize product inventory:', e.message);
}

function persistProducts() {
  try {
    fs.writeFileSync(PROD_DB, JSON.stringify(products, null, 2));
  } catch (e) {
    console.error('Failed to write products DB:', e.message);
  }
}


const ORDERS_DB = __dirname + '/mock-orders.json';
let orders = {};
try {
  if (fs.existsSync(ORDERS_DB)) {
    orders = JSON.parse(fs.readFileSync(ORDERS_DB, 'utf8') || '{}');
  }
} catch (e) {
  console.error('Failed to read orders DB:', e.message);
  orders = {};
}

function persistOrders() {
  try {
    fs.writeFileSync(ORDERS_DB, JSON.stringify(orders, null, 2));
  } catch (e) {
    console.error('Failed to write orders DB:', e.message);
  }
}

app.post('/api/auth/register', (req, res) => {
  const { email, password, firstName, lastName, address, payment } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  if (users.find(u => u.email === email)) return res.status(409).json({ message: 'User exists' });
  const id = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
  const user = { id, email, firstName: firstName || '', lastName: lastName || '', address: address || {}, payment: payment || {} };
  users.push({ ...user, password });
  try { persistUsers(); } catch (e) { console.error('Failed to persist users:', e.message); }

  const userKey = `mock-${id}`;
  carts[userKey] = carts[userKey] || { items: [] };
  try { persistCarts(); } catch (e) { console.error('Failed to persist carts after register:', e.message); }

  res.cookie('session', userKey, { httpOnly: true });

  return res.status(201).json({ user });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const u = users.find(x => x.email === email && x.password === password);
  if (!u) return res.status(401).json({ message: 'Invalid credentials' });

  try {
    const incoming = req.cookies && req.cookies.session;
    if (incoming && incoming.startsWith('anon-')) {
      const anonCart = carts[incoming];
      const userKey = `mock-${u.id}`;
      carts[userKey] = carts[userKey] || { items: [] };
      if (anonCart && Array.isArray(anonCart.items) && anonCart.items.length) {
      
        const base = carts[userKey].items.length ? Math.max(...carts[userKey].items.map(i=>i.id)) : 0;
        anonCart.items.forEach((it, idx) => {
          const existing = carts[userKey].items.find(x => x.productId === it.productId);
          if (existing) {
            existing.quantity = (existing.quantity || 0) + (it.quantity || 0);
          } else {
            const newId = base + carts[userKey].items.length + 1;
            carts[userKey].items.push({ id: newId, productId: it.productId, quantity: it.quantity });
          }
        });
      
        delete carts[incoming];
        try {
          carts[userKey].items = normalizeCartItems(carts[userKey].items || []);
          persistCarts();
        } catch(e) { console.error('persistCarts error:', e.message); }
      }
    }
  } catch (e) {
    console.error('Error merging anon cart on login:', e.message);
  }

  res.cookie('session', `mock-${u.id}`, { httpOnly: true });
  return res.json({ user: { id: u.id, email: u.email, isAdmin: !!u.isAdmin } });
});


app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('session', { path: '/' });
  return res.json({ message: 'Logged out' });
});

app.get('/api/auth/me', (req, res) => {
  const s = req.cookies && req.cookies.session;
  if (!s) return res.status(401).json({ message: 'Not authenticated' });
  const id = parseInt((s+'').split('-')[1], 10);
  const u = users.find(x => x.id === id);
  if (!u) return res.status(401).json({ message: 'Invalid session' });
  const userOrders = orders[s] || [];
  return res.json({ user: { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, address: u.address || {}, payment: u.payment || {}, orders: userOrders, isAdmin: !!u.isAdmin } });
});


app.put('/api/profile', (req, res) => {
  const key = getSessionKey(req);
  if (!key) return res.status(401).json({ message: 'Not authenticated' });
  const id = parseInt((key+'').split('-')[1], 10);
  const uIdx = users.findIndex(x => x.id === id);
  if (uIdx === -1) return res.status(401).json({ message: 'Invalid session' });
  const { firstName, lastName, address, payment } = req.body || {};
  if (firstName !== undefined) users[uIdx].firstName = firstName;
  if (lastName !== undefined) users[uIdx].lastName = lastName;
  if (address !== undefined) users[uIdx].address = address;
  if (payment !== undefined) users[uIdx].payment = payment;
  try { persistUsers(); } catch (e) { console.error('Failed to persist users:', e.message); }
  return res.json({ user: { id: users[uIdx].id, email: users[uIdx].email, firstName: users[uIdx].firstName, lastName: users[uIdx].lastName, address: users[uIdx].address || {}, payment: users[uIdx].payment || {} } });
});


app.get('/api/products', (req, res) => {
  res.json({ products });
});


app.get('/api/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const p = products.find(x => x.id === id);
  if (!p) return res.status(404).json({ message: 'Product not found' });
  res.json({ product: p });
});


function requireAdmin(req, res, next) {
  const key = getSessionKey(req);
  if (!key || !isAuthenticatedKey(key)) return res.status(401).json({ message: 'Not authenticated' });
  const id = parseInt((key+'').split('-')[1], 10);
  const u = users.find(x => x.id === id);
  if (!u || !u.isAdmin) return res.status(403).json({ message: 'Admin access required' });
  req.adminUser = u;
  next();
}

function gatherAllOrders() {
  const all = [];
  Object.keys(orders).forEach(k => {
    const list = orders[k] || [];
    const uid = parseInt((k+'').split('-')[1], 10);
    const u = users.find(x => x.id === uid) || { id: uid, email: 'unknown' };
    list.forEach(o => {
     
      const enrichedItems = (o.items || []).map(it => {
        const p = products.find(x => x.id === it.productId) || { id: it.productId, name: 'unknown', price: 0 };
        return {
          productId: it.productId,
          productName: p.name || p.title || 'unknown',
          price: Number(p.price) || 0,
          quantity: Number(it.quantity) || 0
        };
      });
     
      all.push({ sessionKey: k, userId: uid, userEmail: u.email, ...o, items: enrichedItems });
    });
  });
  return all;
}


app.get('/api/admin/orders', requireAdmin, (req, res) => {
  try {
    const { userId, userEmail, productId, productName, productPrice, quantity, start, end } = req.query || {};
    let all = gatherAllOrders();
    
    if (userId) all = all.filter(o => String(o.sessionKey).includes(`mock-${String(userId)}`) || String(o.userId) === String(userId));
    
    if (userEmail) all = all.filter(o => String(o.userEmail || '').toLowerCase() === String(userEmail).toLowerCase());
    
    if (productId) all = all.filter(o => (o.items || []).some(i => String(i.productId) === String(productId)));
   
    if (productName) {
      const needle = String(productName).toLowerCase();
      all = all.filter(o => (o.items || []).some(i => String(i.productName || '').toLowerCase().includes(needle)));
    }
   
    if (productPrice) {
      const pp = String(productPrice);
      if (pp.includes('-')) {
        const [minS, maxS] = pp.split('-').map(s => s.trim());
        const min = parseFloat(minS) || 0;
        const max = parseFloat(maxS) || Number.POSITIVE_INFINITY;
        all = all.filter(o => (o.items || []).some(i => Number(i.price) >= min && Number(i.price) <= max));
      } else {
        const val = parseFloat(pp);
        if (!Number.isNaN(val)) {
          all = all.filter(o => (o.items || []).some(i => Number(i.price) === val));
        }
      }
    }
   
    if (quantity) {
      const q = String(quantity);
      if (q.includes('-')) {
        const [minS, maxS] = q.split('-').map(s => s.trim());
        const min = parseInt(minS, 10) || 0;
        const max = parseInt(maxS, 10) || Number.POSITIVE_INFINITY;
        all = all.filter(o => (o.items || []).some(i => Number(i.quantity) >= min && Number(i.quantity) <= max));
      } else {
        const qv = parseInt(q, 10);
        if (!Number.isNaN(qv)) {
          all = all.filter(o => (o.items || []).some(i => Number(i.quantity) === qv));
        }
      }
    }
    if (start) {
      const s = new Date(start);
      all = all.filter(o => new Date(o.createdAt) >= s);
    }
    if (end) {
      const e = new Date(end);
      all = all.filter(o => new Date(o.createdAt) <= e);
    }
    res.json({ orders: all });
  } catch (e) {
    res.status(500).json({ message: 'Server error', error: e.message });
  }
});


app.get('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const all = gatherAllOrders();
  const o = all.find(x => Number(x.id) === id);
  if (!o) return res.status(404).json({ message: 'Order not found' });
  res.json({ order: o });
});


app.get('/api/admin/users', requireAdmin, (req, res) => {
  const summary = users.map(u => ({ id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, address: u.address || {}, payment: u.payment || {}, isAdmin: !!u.isAdmin }));
  res.json({ users: summary });
});


app.put('/api/admin/users/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const idx = users.findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ message: 'User not found' });
  const { address, payment, firstName, lastName } = req.body || {};
  if (address !== undefined) users[idx].address = address;
  if (payment !== undefined) users[idx].payment = payment;
  if (firstName !== undefined) users[idx].firstName = firstName;
  if (lastName !== undefined) users[idx].lastName = lastName;
  try { persistUsers(); } catch (e) { console.error('Failed to persist users after admin update:', e.message); }
  res.json({ user: { id: users[idx].id, email: users[idx].email, firstName: users[idx].firstName, lastName: users[idx].lastName, address: users[idx].address, payment: users[idx].payment } });
});

app.put('/api/admin/products/:id/inventory', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const pIdx = products.findIndex(x => x.id === id);
  if (pIdx === -1) return res.status(404).json({ message: 'Product not found' });
  const { inventory, delta } = req.body || {};
  if (inventory !== undefined) {
    products[pIdx].inventory = Number(inventory) || 0;
  } else if (delta !== undefined) {
    products[pIdx].inventory = (Number(products[pIdx].inventory) || 0) + Number(delta);
    if (products[pIdx].inventory < 0) products[pIdx].inventory = 0;
  } else {
    return res.status(400).json({ message: 'inventory or delta required' });
  }
  try { persistProducts(); } catch (e) { console.error('Failed to persist products after inventory change:', e.message); }
  res.json({ product: products[pIdx] });
});


const carts = {};


const CARTS_DB = __dirname + '/mock-carts.json';
let persistedCarts = {};
try {
  if (fs.existsSync(CARTS_DB)) {
    persistedCarts = JSON.parse(fs.readFileSync(CARTS_DB, 'utf8') || '{}');
  
    Object.assign(carts, persistedCarts);
   
    try {
      let changed = false;
      Object.keys(carts).forEach(k => {
        const before = carts[k].items || [];
        const after = normalizeCartItems(before);
        if (JSON.stringify(before) !== JSON.stringify(after)) {
          carts[k].items = after;
          changed = true;
        }
      });
      if (changed) persistCarts();
    } catch (e) {
      console.error('Failed to normalize persisted carts:', e.message);
    }
  }
} catch (e) {
  console.error('Failed to read carts DB:', e.message);
  persistedCarts = {};
}

function persistCarts() {
  try {
    fs.writeFileSync(CARTS_DB, JSON.stringify(carts, null, 2));
  } catch (e) {
    console.error('Failed to write carts DB:', e.message);
  }
}

function normalizeCartItems(items) {
  if (!Array.isArray(items)) return [];
  const map = {};
  items.forEach(it => {
    const pid = it.productId;
    if (!map[pid]) {
      map[pid] = { id: it.id, productId: pid, quantity: Number(it.quantity) || 0 };
    } else {
      map[pid].quantity = (map[pid].quantity || 0) + (Number(it.quantity) || 0);
    }
  });
  return Object.values(map).map((it, idx) => ({ id: idx + 1, productId: it.productId, quantity: it.quantity }));
}

function getSessionKey(req) {
  const s = req.cookies && req.cookies.session;
  return s || null;
}

function isAuthenticatedKey(key) {
  
  return typeof key === 'string' && key.startsWith('mock-');
}

app.get('/api/cart', (req, res) => {
  const key = getSessionKey(req);
  if (!key) return res.status(401).json({ message: 'Not authenticated' });
  const cart = carts[key] || { items: [] };
  res.json(cart);
});

app.post('/api/cart/items', (req, res) => {
  let key = getSessionKey(req);
  
  if (!key) {
    key = `anon-${Date.now()}-${Math.floor(Math.random()*100000)}`;
    
    res.cookie('session', key, { httpOnly: true });
  }
  const { productId, quantity } = req.body || {};
  if (!productId) return res.status(400).json({ message: 'productId required' });
  const prod = products.find(p => p.id == productId);
  if (!prod) return res.status(404).json({ message: 'Product not found' });
 
  if (typeof prod.inventory !== 'undefined' && Number(prod.inventory) <= 0) {
    return res.status(400).json({ message: 'Product out of stock' });
  }
  const cart = (carts[key] = carts[key] || { items: [] });
  
  const existing = cart.items.find(i => i.productId === prod.id);
  if (existing) {
    const newQty = (existing.quantity || 0) + (Number(quantity) || 1);
    if (typeof prod.inventory !== 'undefined' && newQty > prod.inventory) {
      return res.status(400).json({ message: `Requested quantity (${newQty}) exceeds available inventory (${prod.inventory})` });
    }
    existing.quantity = newQty;
    try { persistCarts(); } catch (e) { console.error('Failed to persist carts:', e.message); }
    return res.status(200).json({ item: existing });
  }
  const id = cart.items.length ? Math.max(...cart.items.map(i => i.id)) + 1 : 1;
  const item = { id, productId: prod.id, quantity: Number(quantity) || 1 };
  cart.items.push(item);

  try { persistCarts(); } catch (e) { console.error('Failed to persist carts:', e.message); }
  res.status(201).json({ item });
});


app.put('/api/cart/items/:id', (req, res) => {
  let key = getSessionKey(req);
  if (!key) return res.status(401).json({ message: 'Not authenticated' });
  const cart = (carts[key] = carts[key] || { items: [] });
  const id = Number(req.params.id);
  const idx = cart.items.findIndex(i => i.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Item not found' });
  const qty = Number(req.body && req.body.quantity);
  if (!qty || qty < 1) return res.status(400).json({ message: 'Invalid quantity' });

  const prod = products.find(p => p.id === cart.items[idx].productId);
  if (prod && typeof prod.inventory !== 'undefined' && qty > prod.inventory) {
    return res.status(400).json({ message: `Requested quantity (${qty}) exceeds available inventory (${prod.inventory})` });
  }

  cart.items[idx].quantity = qty;
  try { persistCarts(); } catch (e) { console.error('Failed to persist carts:', e.message); }
  return res.json({ item: cart.items[idx] });
});

app.delete('/api/cart/items/:id', (req, res) => {
  const key = getSessionKey(req);
  if (!key) return res.status(401).json({ message: 'Not authenticated' });
  const cart = carts[key] || { items: [] };
  const id = Number(req.params.id);
  const idx = cart.items.findIndex(i => i.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Item not found' });
  const removed = cart.items.splice(idx, 1)[0];
  try { persistCarts(); } catch (e) { console.error('Failed to persist carts:', e.message); }
  res.json({ removed });
});


app.post('/api/cart/checkout', (req, res) => {
  const key = getSessionKey(req);
  if (!key || !isAuthenticatedKey(key)) return res.status(401).json({ message: 'Authentication required to checkout' });
  const cart = carts[key] || { items: [] };
  if (!cart.items || cart.items.length === 0) return res.status(400).json({ message: 'Cart is empty' });


  const total = cart.items.reduce((sum, item) => {
    const p = products.find(x => x.id == item.productId);
    return sum + ((p?.price || 0) * (item.quantity || 1));
  }, 0);

  const orderId = (orders[key] && orders[key].length ? Math.max(...orders[key].map(o => o.id)) + 1 : 1);
  const payment = req.body && req.body.payment ? req.body.payment : null;
  const address = req.body && req.body.address ? req.body.address : null;
  const order = { id: orderId, items: cart.items.slice(), total, payment, address, status: 'Completed', createdAt: new Date().toISOString() };
  orders[key] = orders[key] || [];
  orders[key].push(order);

  try {
    (order.items || []).forEach(it => {
      const pIdx = products.findIndex(p => p.id === it.productId);
      if (pIdx !== -1) {
        products[pIdx].inventory = (Number(products[pIdx].inventory) || 0) - (Number(it.quantity) || 0);
        if (products[pIdx].inventory < 0) products[pIdx].inventory = 0;
      }
    });

    persistProducts();
  } catch (e) {
    console.error('Failed updating product inventory on checkout:', e.message);
  }

  try {
    persistOrders();
  } catch (e) {
    console.error('Failed to persist orders after checkout:', e.message);
  }


  carts[key] = { items: [] };

  res.json({ order });
});


app.get('/api/orders', (req, res) => {
  const key = getSessionKey(req);
  if (!key) return res.status(401).json({ message: 'Not authenticated' });
  res.json({ orders: orders[key] || [] });
});


app.get('/api/orders/:id', (req, res) => {
  const key = getSessionKey(req);
  if (!key) return res.status(401).json({ message: 'Not authenticated' });
  const list = orders[key] || [];
  const id = Number(req.params.id);
  const o = list.find(x => x.id === id);
  if (!o) return res.status(404).json({ message: 'Order not found' });
  res.json({ order: o });
});

app.post('/api/products', (req, res) => {
  const { name, price, description, image } = req.body || {};
  if (!name) return res.status(400).json({ message: 'name required' });
  const id = products.length ? Math.max(...products.map(p => p.id)) + 1 : 1;
  const item = { id, name, price: Number(price) || 0, description: description || '', image: image || '' };
  products.push(item);
  persistProducts();
  res.status(201).json({ product: item });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Mock user-service listening on http://localhost:${PORT}`));
