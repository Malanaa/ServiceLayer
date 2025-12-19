import React, { useState, useEffect } from 'react';
import { ShoppingCart, User, LogOut, Package, CreditCard, Search, Menu, X } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

function App() {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [view, setView] = useState('products');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profile, setProfile] = useState({ address: { line1: '', city: '', postal: '', country: '' }, payment: { name: '', cardNumber: '', expiry: '', cvv: '' } });
  const [checkoutAddress, setCheckoutAddress] = useState({ line1: '', city: '', postal: '', country: '' });
  const [paymentInfo, setPaymentInfo] = useState({ name: '', cardNumber: '', expiry: '', cvv: '' });
  const [saveInfoOnCheckout, setSaveInfoOnCheckout] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrProvince, setAddrProvince] = useState('');
  const [addrZip, setAddrZip] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  const formatExpiry = (value) => {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return digits.slice(0, 2) + '/' + digits.slice(2);
  };

  // filters & sorting
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterGenre, setFilterGenre] = useState('All');
  const [filterBrand, setFilterBrand] = useState('All');
  const [sortOption, setSortOption] = useState('none');

  // Mock products - replace with actual API call if you have a products endpoint
  const fetchProducts = async () => {
    const fallback = [
      { id: 1, name: 'Wireless Headphones', price: 99.99, description: 'Premium sound quality', image: '🎧' },
      { id: 2, name: 'Smart Watch', price: 299.99, description: 'Track your fitness', image: '⌚' },
      { id: 3, name: 'Laptop Stand', price: 49.99, description: 'Ergonomic design', image: '💻' },
      { id: 4, name: 'Mechanical Keyboard', price: 149.99, description: 'Tactile typing experience', image: '⌨️' },
      { id: 5, name: 'USB-C Hub', price: 79.99, description: '7-in-1 connectivity', image: '🔌' },
      { id: 6, name: 'Desk Lamp', price: 39.99, description: 'LED with adjustable brightness', image: '💡' },
    ];

    try {
      const res = await fetch(`${API_BASE}/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || data || fallback);
        return;
      }
    } catch (e) {}

    try {
      const direct = await fetch('http://localhost:8080/api/products');
      if (direct.ok) {
        const ddata = await direct.json();
        setProducts(ddata.products || ddata || fallback);
        return;
      }
    } catch (e) {}

    setProducts(fallback);
  };

  useEffect(() => { fetchProducts(); }, []);

  // Check if user is logged in and fetch cart
  useEffect(() => {
    // fetch cart (but don't assume auth from cart existence)
    fetchCart();
    // explicitly verify authentication
    (async function checkAuth() {
      try {
        const r = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
        if (r.ok) {
          const d = await r.json();
          setUser(d.user || { loggedIn: true });
        } else {
          setUser(null);
        }
      } catch (e) {
        setUser(null);
      }
    })();
  }, []);

  const fetchCart = async () => {
    try {
      const res = await fetch(`${API_BASE}/cart`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCart(data);
        // sync local fallback
        try { localStorage.setItem('localCart', JSON.stringify(data)); } catch (e) {}
        return;
      }
    } catch (err) {
      // unable to fetch server cart; fall back to localStorage cart for anonymous users
      try {
        const raw = localStorage.getItem('localCart');
        if (raw) {
          setCart(JSON.parse(raw));
          return;
        }
      } catch (e) {}
      console.log('Not logged in or cart unavailable');
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/orders`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const list = data.orders || data;
        setOrders(list);
        return list;
      }
    } catch (err) {
      showMessage('Failed to fetch orders', 'error');
    }
  };

  const fetchProfile = async () => {
    const defaultProfile = {
      address: { line1: '', city: '', postal: '', country: '', province: '' },
      payment: { name: '', cardNumber: '', expiry: '', cvv: '' }
    };

    try {
      const res = await fetch(`${API_BASE}/profile`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const p = data.profile || data || {};
        // Only update `user` if the profile endpoint returns user info
        if (data.user) setUser(data.user);
        setProfile({
          address: {
            line1: (p.address && (p.address.line1 || p.address.street)) || '',
            city: (p.address && (p.address.city || '')) || '',
            postal: (p.address && (p.address.postal || p.address.zip)) || '',
            country: (p.address && p.address.country) || '',
            province: (p.address && (p.address.province || p.address.state || '')) || ''
          },
          payment: {
            name: (p.payment && (p.payment.name || p.payment.cardHolderName || p.payment.card_holder_name || p.payment.cardHolder)) || '',
            cardNumber: (p.payment && (p.payment.cardNumber || p.payment.number || '')) || '',
            expiry: (p.payment && (p.payment.expiry || '')) || '',
            cvv: ''
          }
        });
        return;
      }
    } catch (e) {
      // fall through to ensure profile is set to defaults below
    }

    // Ensure `profile` is always populated even when not authenticated or on error
    setProfile(defaultProfile);
  };

  const saveProfile = async () => {
    try {
      const body = {
        address: {
          line1: profile.address.line1,
          city: profile.address.city,
          postal: profile.address.postal,
          country: profile.address.country
        },
        payment: {
          name: profile.payment.name,
          cardNumber: profile.payment.cardNumber,
          expiry: profile.payment.expiry,
        }
      };
      const res = await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const d = await res.json();
        setUser(d.user || user);
        setShowProfileModal(false);
        showMessage('Profile updated', 'success');
      } else {
        const err = await res.json().catch(()=>({}));
        showMessage(err.message || 'Failed to update profile', 'error');
      }
    } catch (e) {
      showMessage('Server error', 'error');
    }
  };

  const handleAuth = async () => {
    if (!authEmail || !authPassword) {
      showMessage('Please fill in all fields', 'error');
      return;
    }

    setLoading(true);

    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      let body = { email: authEmail, password: authPassword };
      if (authMode === 'register') {
        const address = {};
        if (addrStreet) address.street = addrStreet;
        if (addrCity) address.city = addrCity;
        if (addrProvince) address.province = addrProvince;
        if (addrZip) address.zip = addrZip;
        if (Object.keys(address).length) body.address = address;
        const payment = {};
        if (cardNumber) payment.cardNumber = cardNumber;
        if (cardHolderName) payment.cardHolderName = cardHolderName;
        if (cardExpiry) payment.expiry = cardExpiry;
        if (cardCvc) payment.cvc = cardCvc;
        if (Object.keys(payment).length) body.payment = payment;
      }

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        setUser(data.user || { email: authEmail });
        setShowAuthModal(false);
        setAuthEmail('');
        setAuthPassword('');
        setAddrStreet('');
        setAddrCity('');
        setAddrProvince('');
        setAddrZip('');
        setCardNumber('');
        setCardExpiry('');
        setCardCvc('');
        showMessage(authMode === 'login' ? 'Login successful!' : 'Registration successful!', 'success');
        // merge any localStorage cart into server cart after login
        try { await mergeLocalCart(); } catch(e) {}
        await fetchCart();
        // If this was a registration and the request included address/payment,
        // persist that info to the profile endpoint so subsequent reads return it.
        if (authMode === 'register' && (body.address || body.payment)) {
          try {
            const profileBody = { address: body.address || {}, payment: body.payment || {} };
            const pr = await fetch(`${API_BASE}/profile`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(profileBody)
            });
            if (pr.ok) {
              const pd = await pr.json().catch(()=>({}));
              setProfile(prev => ({ ...prev, address: profileBody.address || prev.address, payment: profileBody.payment || prev.payment }));
              setUser(pd.user || (data.user || { email: authEmail }));
            }
          } catch (e) {
            // ignore profile save failures and continue
          }
        }

        // fetch profile so address/payment are available (ensure freshest copy)
        try { await fetchProfile(); } catch(e) {}
      } else {
        showMessage(data.message || 'Authentication failed', 'error');
      }
    } catch (err) {
      showMessage('Server error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const mergeLocalCart = async () => {
    try {
      const raw = localStorage.getItem('localCart');
      if (!raw) return;
      const lc = JSON.parse(raw);
      if (!lc || !Array.isArray(lc.items) || lc.items.length === 0) return;
      // POST each item to server cart
      for (const it of lc.items) {
        try {
          await fetch(`${API_BASE}/cart/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ productId: it.productId, quantity: it.quantity }),
          });
        } catch (e) {
          // ignore individual failures
        }
      }
      // clear local fallback
      localStorage.removeItem('localCart');
    } catch (e) {}
  };

  const handleLogout = () => {
    (async () => {
      try {
        await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
      } catch (e) {
        // ignore network errors
      }
      setUser(null);
      setCart(null);
      setOrders([]);
      setView('products');
      showMessage('Logged out successfully', 'success');
    })();
  };

  const addToCart = async (product) => {
    // Prevent adding out-of-stock products. If inventory is unknown, fetch product detail.
    try {
      if (product) {
        let inv = product.inventory;
        if (typeof inv === 'undefined' && product.id) {
          try {
            const r = await fetch(`${API_BASE}/products/${product.id}`);
            if (r.ok) {
              const dd = await r.json();
              const pdet = dd.product || dd;
              inv = pdet && pdet.inventory;
            }
          } catch (e) { }
        }
        if (typeof inv !== 'undefined' && Number(inv) === 0) {
          showMessage('Sorry — this item is out of stock', 'error');
          return;
        }
      }
    } catch (e) { }

    // allow adding to cart for anonymous users; session cookie will be set by server
    // attempt server add; always update local fallback so cart is viewable when offline/not authed
    try {
      const res = await fetch(`${API_BASE}/cart/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });

      if (res.ok) {
        await fetchCart();
        showMessage('Added to cart! Sign in to checkout.', 'success');
      } else {
        // server failed, still persist locally
        const data = await res.json().catch(()=> ({}));
        showMessage(data.message || 'Added locally to cart', 'success');
        // fall through to local persist
      }
    } catch (err) {
      // Network error: persist locally
      showMessage('Added locally to cart', 'success');
    }

    // update localStorage fallback cart so user can always view cart
    try {
      const raw = localStorage.getItem('localCart');
      const lc = raw ? JSON.parse(raw) : { items: [] };
      // append or increment
      const existing = lc.items.find(i => i.productId === product.id);
      if (existing) existing.quantity = (existing.quantity || 0) + 1;
      else lc.items.push({ id: Date.now(), productId: product.id, quantity: 1 });
      localStorage.setItem('localCart', JSON.stringify(lc));
      setCart(lc);
    } catch (e) {}
  };

  const removeFromCart = async (itemId) => {
    try {
      const res = await fetch(`${API_BASE}/cart/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        await fetchCart();
        showMessage('Item removed', 'success');
      }
    } catch (err) {
      showMessage('Failed to remove item', 'error');
    }
  };

  const updateCartItem = async (itemId, quantity, inventory) => {
    if (!quantity || quantity < 1) {
      showMessage('Quantity must be at least 1', 'error');
      return;
    }
    // If inventory not provided, try to resolve it from local product list or by fetching product detail.
    try {
      let inv = inventory;
      if (typeof inv === 'undefined') {
        // try local lookup from products via cart item
        const cartItem = (cart && cart.items) ? (cart.items.find(i => i.id === itemId || i.productId === itemId)) : null;
        const pid = cartItem ? cartItem.productId : null;
        if (pid) {
          const prod = products.find(p => p.id === pid);
          if (prod && typeof prod.inventory !== 'undefined') inv = prod.inventory;
        }
        if (typeof inv === 'undefined' && cartItem && cartItem.productId) {
          try {
            const r = await fetch(`${API_BASE}/products/${cartItem.productId}`);
            if (r.ok) {
              const dd = await r.json();
              const pdet = dd.product || dd;
              inv = pdet && pdet.inventory;
            }
          } catch (e) {}
        }
      }
      if (typeof inv !== 'undefined' && quantity > inv) {
        showMessage('Limit crossed', 'error');
        return;
      }
    } catch (e) {
      // on error, fall through to server-side validation
    }

    try {
      const res = await fetch(`${API_BASE}/cart/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ quantity })
      });
      if (res.ok) {
        await fetchCart();
        showMessage('Cart updated', 'success');
        return;
      }
      if (res.status === 401) {
        // not authenticated or server unavailable for session — update local fallback if present
        try {
          const raw = localStorage.getItem('localCart');
          if (raw) {
            const lc = JSON.parse(raw);
            const it = lc.items.find(i => i.id === itemId || i.productId === itemId);
            if (it) {
              it.quantity = quantity;
              localStorage.setItem('localCart', JSON.stringify(lc));
              setCart(lc);
              showMessage('Cart updated locally', 'success');
              return;
            }
          }
        } catch (e) {}
      }
      const data = await res.json().catch(()=>({}));
      const serverMsg = (data && data.message) ? String(data.message).toLowerCase() : '';
      if (serverMsg.includes('exceeds') || serverMsg.includes('out of stock') || serverMsg.includes('insufficient')) {
        showMessage('Limit crossed', 'error');
      } else {
        showMessage(data.message || 'Failed to update cart', 'error');
      }
    } catch (e) {
      // network error: update local fallback
      try {
        const raw = localStorage.getItem('localCart');
        const lc = raw ? JSON.parse(raw) : { items: [] };
        const it = lc.items.find(i => i.id === itemId || i.productId === itemId);
        if (it) {
          it.quantity = quantity;
          localStorage.setItem('localCart', JSON.stringify(lc));
          setCart(lc);
          showMessage('Cart updated locally', 'success');
          return;
        }
      } catch (er) {}
      showMessage('Network error updating cart', 'error');
    }
  };

  const handleCheckout = async () => {
    if (!cart || !cart.items || cart.items.length === 0) {
      showMessage('Cart is empty', 'error');
      return;
    }

    if (!user) {
      showMessage('Please login to checkout', 'error');
      setShowAuthModal(true);
      return;
    }

    // prefill checkout fields from profile when available
    try {
      // ensure we have the latest profile from the server before pre-filling
      if (user) {
        try { await fetchProfile(); } catch (e) { /* ignore fetch errors and continue with whatever we have */ }
      }
      if (profile && profile.address) {
        setCheckoutAddress({
          line1: profile.address.line1 || '',
          city: profile.address.city || '',
          postal: profile.address.postal || '',
          country: profile.address.country || ''
        });
      }
      if (profile && profile.payment) {
        setPaymentInfo({
          name: profile.payment.name || '',
          cardNumber: profile.payment.cardNumber || '',
          expiry: profile.payment.expiry || '',
          cvv: ''
        });
      }
    } catch (e) {}

    // Open checkout modal to collect payment and address
    setCheckoutError(null);
    setShowCheckoutModal(true);
  };

  const submitCheckout = async () => {
    // basic validation
    if (!checkoutAddress.line1 || !checkoutAddress.city || !paymentInfo.name || !paymentInfo.cardNumber) {
      showMessage('Please fill required payment and address fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const body = {
        paymentMethod: 'credit_card',
        payment: paymentInfo,
        address: checkoutAddress,
      };

      // if user requested to save this info to profile, persist it first
      if (saveInfoOnCheckout && user) {
        try {
          const profileBody = { address: { line1: checkoutAddress.line1, city: checkoutAddress.city, postal: checkoutAddress.postal, country: checkoutAddress.country }, payment: { name: paymentInfo.name, cardNumber: paymentInfo.cardNumber, expiry: paymentInfo.expiry } };
          const pr = await fetch(`${API_BASE}/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(profileBody)
          });
          if (pr.ok) {
            const d = await pr.json().catch(()=>({}));
            setProfile(prev => ({ ...prev, address: profileBody.address, payment: profileBody.payment }));
            setUser(d.user || user);
            try { await fetchProfile(); } catch (e) {}
          }
        } catch (e) {
          // ignore profile save failure and continue checkout
        }
      }

      const res = await fetch(`${API_BASE}/cart/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        setCheckoutError(null);
        setShowCheckoutModal(false);
        showMessage('Order placed successfully!', 'success');
        setSaveInfoOnCheckout(false);
        // refresh profile if we saved info during checkout
        try { if (saveInfoOnCheckout) await fetchProfile(); } catch (e) {}
        await fetchCart();
        // refresh product list so inventory changes are visible
        try { await fetchProducts(); } catch (e) {}
        // If backend returned the created order, show its summary.
        if (data && data.order && data.order.id) {
          setSelectedOrder(data.order);
          setView('orderSummary');
        } else {
          const fetched = await fetchOrders();
          if (fetched && fetched.length) {
            const latest = fetched.slice().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
            setSelectedOrder(latest);
            setView('orderSummary');
          } else {
            setView('orders');
          }
        }
      } else {
        const msg = (data && data.message) ? String(data.message) : '';
        const lowered = msg.toLowerCase();
        const isAuthFail = res.status === 402 || data?.code === 'CARD_DECLINED' || /authoriz|authorization|card.*declin|card declined|declined/i.test(msg);
        if (isAuthFail) {
          setCheckoutError('Credit Card Authorization Failed.');
        } else {
          showMessage(data.message || 'Checkout failed', 'error');
        }
      }
    } catch (err) {
      showMessage('Server error during checkout', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const categories = Array.from(new Set(products.map(p => (p.category || 'Uncategorized'))));
  const genres = Array.from(new Set(products.map(p => (p.genre || 'General'))));
  const brands = Array.from(new Set(products.map(p => (p.brand || 'Generic'))));

  // apply search, filters, and sorting
  const filteredProducts = products
    .filter(p => {
      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;
      return (
        (p.name || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        ((p.type || '') + ' ' + (p.genre || '') + ' ' + (p.brand || '')).toLowerCase().includes(q)
      );
    })
    .filter(p => (filterCategory === 'All' ? true : ((p.category || 'Uncategorized') === filterCategory)))
    .filter(p => (filterGenre === 'All' ? true : ((p.genre || 'General') === filterGenre)))
    .filter(p => (filterBrand === 'All' ? true : ((p.brand || 'Generic') === filterBrand)))
    .slice() // create shallow copy before sorting
    .sort((a, b) => {
      if (sortOption === 'price-asc') return (a.price || 0) - (b.price || 0);
      if (sortOption === 'price-desc') return (b.price || 0) - (a.price || 0);
      if (sortOption === 'name-asc') return ('' + a.name).localeCompare(b.name);
      if (sortOption === 'name-desc') return ('' + b.name).localeCompare(a.name);
      return 0;
    });

  const cartItemCount = cart?.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminViewTab, setAdminViewTab] = useState('orders');
  const [selectedAdminUser, setSelectedAdminUser] = useState(null);
  const [showAdminUserModal, setShowAdminUserModal] = useState(false);
  const [adminDateFrom, setAdminDateFrom] = useState('');
  const [adminDateTo, setAdminDateTo] = useState('');

  const fetchAdminOrders = async (params={}) => {
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE}/admin/orders${qs ? '?'+qs : ''}`, { credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        setAdminOrders(d.orders || []);
      } else {
        const e = await res.json().catch(()=>({}));
        showMessage(e.message || 'Failed to fetch admin orders', 'error');
      }
    } catch (e) {
      showMessage('Failed to fetch admin orders', 'error');
    }
  };

  const fetchAdminUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/users`, { credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        setAdminUsers(d.users || []);
      }
    } catch (e) {}
  };

  const updateAdminUser = async (userId, body) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const d = await res.json().catch(()=>({}));
        await fetchAdminUsers();
        showMessage('User updated', 'success');
        return d.user || null;
      }
      const err = await res.json().catch(()=>({}));
      showMessage(err.message || 'Failed to update user', 'error');
    } catch (e) {
      showMessage('Server error updating user', 'error');
    }
    return null;
  };

  const updateInventory = async (productId, newQty) => {
    try {
      const res = await fetch(`${API_BASE}/admin/products/${productId}/inventory`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory: Number(newQty) })
      });
      if (res.ok) {
        const d = await res.json();
        setProducts(prev => prev.map(p => p.id === d.product.id ? d.product : p));
        showMessage('Inventory updated', 'success');
      } else {
        const err = await res.json().catch(()=>({}));
        showMessage(err.message || 'Failed to update inventory', 'error');
      }
    } catch (e) {
      showMessage('Server error updating inventory', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden">
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <h1 className="text-2xl font-bold cursor-pointer" onClick={() => setView('products')}>
                Ytech
              </h1>
            </div>

            <div className="hidden md:flex flex-1 max-w-2xl mx-8">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <Search className="absolute right-3 top-2.5 text-gray-500" size={20} />
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Always show cart icon so anonymous users can view cart */}
              <button
                onClick={() => { setView('cart'); fetchCart(); }}
                className="relative hover:text-orange-400 transition"
              >
                <ShoppingCart size={24} />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {cartItemCount}
                  </span>
                )}
              </button>

              {user ? (
                <>
                  <button onClick={() => { setShowProfileModal(true); fetchProfile(); }} className="hover:text-orange-400 transition">
                    <User size={22} />
                  </button>
                  {user && user.isAdmin && (
                    <button onClick={() => setView('admin')} className="hover:text-orange-400 transition bg-gray-800 px-3 py-1 rounded text-sm">Admin</button>
                  )}
                  <button
                    onClick={() => { setView('orders'); fetchOrders(); }}
                    className="hover:text-orange-400 transition"
                  >
                    <Package size={24} />
                  </button>
                  <button onClick={handleLogout} className="hover:text-orange-400 transition">
                    <LogOut size={24} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg transition"
                >
                  <User size={20} />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden mt-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <Search className="absolute right-3 top-2.5 text-gray-500" size={20} />
            </div>
          </div>
        </div>
      </header>

      {/* Message Toast */}
      {message && (
        <div className={`fixed top-20 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
          message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {message.text}
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </h2>
              <button onClick={() => setShowAuthModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              {authMode === 'register' && (
                <>
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-700 mb-2">Address (optional)</p>
                    <input
                      placeholder="Street"
                      value={addrStreet}
                      onChange={(e) => setAddrStreet(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg mb-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input placeholder="City" value={addrCity} onChange={e => setAddrCity(e.target.value)} className="px-3 py-2 border rounded-lg" />
                      <input placeholder="Province" value={addrProvince} onChange={e => setAddrProvince(e.target.value)} className="px-3 py-2 border rounded-lg" />
                      <input placeholder="ZIP" value={addrZip} onChange={e => setAddrZip(e.target.value)} className="px-3 py-2 border rounded-lg" />
                    </div>
                  </div>

                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-700 mb-2">Payment (optional)</p>
                    <input placeholder="Cardholder name" value={cardHolderName} onChange={e => setCardHolderName(e.target.value)} className="w-full px-4 py-2 border rounded-lg mb-2" />
                    <input placeholder="Card number" value={cardNumber} onChange={e => setCardNumber(e.target.value)} className="w-full px-4 py-2 border rounded-lg mb-2" />
                    <div className="grid grid-cols-3 gap-2">
                      <input placeholder="MM/YY" value={cardExpiry} onChange={e => setCardExpiry(formatExpiry(e.target.value))} className="px-3 py-2 border rounded-lg" />
                      <input placeholder="CVC" value={cardCvc} onChange={e => setCardCvc(e.target.value)} className="px-3 py-2 border rounded-lg" />
                      <div />
                    </div>
                  </div>
                </>
              )}
              <button
                onClick={handleAuth}
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-medium transition disabled:opacity-50"
              >
                {loading ? 'Processing...' : authMode === 'login' ? 'Sign In' : 'Register'}
              </button>
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-orange-500 hover:text-orange-600 text-sm"
              >
                {authMode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign In'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Checkout</h2>
              <button onClick={() => setShowCheckoutModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Shipping Address</h3>
                <input value={checkoutAddress.line1} onChange={(e)=>setCheckoutAddress({...checkoutAddress,line1:e.target.value})} placeholder="Address line 1" className="w-full px-3 py-2 border rounded mb-2" />
                <div className="flex gap-2">
                  <input value={checkoutAddress.city} onChange={(e)=>setCheckoutAddress({...checkoutAddress,city:e.target.value})} placeholder="City" className="w-1/2 px-3 py-2 border rounded" />
                  <input value={checkoutAddress.postal} onChange={(e)=>setCheckoutAddress({...checkoutAddress,postal:e.target.value})} placeholder="Postal" className="w-1/2 px-3 py-2 border rounded" />
                </div>
                <input value={checkoutAddress.country} onChange={(e)=>setCheckoutAddress({...checkoutAddress,country:e.target.value})} placeholder="Country" className="w-full px-3 py-2 border rounded mt-2" />
              </div>

              <div>
                <h3 className="font-semibold mb-2">Payment Details</h3>
                {checkoutError && <div className="text-red-600 font-medium mb-2">{checkoutError}</div>}
                <input value={paymentInfo.name} onChange={(e)=>{ setPaymentInfo({...paymentInfo,name:e.target.value}); setCheckoutError(null); }} placeholder="Name on card" className="w-full px-3 py-2 border rounded mb-2" />
                <input value={paymentInfo.cardNumber} onChange={(e)=>{ setPaymentInfo({...paymentInfo,cardNumber:e.target.value}); setCheckoutError(null); }} placeholder="Card number" className="w-full px-3 py-2 border rounded mb-2" />
                <div className="flex gap-2">
                  <input value={paymentInfo.expiry} onChange={(e)=>{ setPaymentInfo({...paymentInfo,expiry:formatExpiry(e.target.value)}); setCheckoutError(null); }} placeholder="MM/YY" className="w-1/2 px-3 py-2 border rounded" />
                  <input value={paymentInfo.cvv} onChange={(e)=>{ setPaymentInfo({...paymentInfo,cvv:e.target.value}); setCheckoutError(null); }} placeholder="CVV" className="w-1/2 px-3 py-2 border rounded" />
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <div className="flex items-center mr-auto">
                {user && (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={saveInfoOnCheckout} onChange={e=>setSaveInfoOnCheckout(e.target.checked)} />
                    <span>Save this info to my profile</span>
                  </label>
                )}
              </div>
              <button onClick={() => setShowCheckoutModal(false)} className="px-4 py-2 rounded border">Cancel</button>
              <button onClick={submitCheckout} disabled={loading} className="px-4 py-2 bg-orange-500 text-white rounded">{loading ? 'Processing...' : 'Pay Now'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Profile</h2>
              <button onClick={() => setShowProfileModal(false)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>

            <div className="space-y-3">
              {/* name fields removed per request */}

              <div>
                <p className="font-semibold">Address (optional)</p>
                <input placeholder="Address line 1" value={profile.address.line1} onChange={e=>setProfile({...profile, address:{...profile.address, line1: e.target.value}})} className="w-full px-3 py-2 border rounded mb-2" />
                <div className="flex gap-2">
                  <input placeholder="City" value={profile.address.city} onChange={e=>setProfile({...profile, address:{...profile.address, city: e.target.value}})} className="flex-1 px-3 py-2 border rounded" />
                  <input placeholder="Postal" value={profile.address.postal} onChange={e=>setProfile({...profile, address:{...profile.address, postal: e.target.value}})} className="w-32 px-3 py-2 border rounded" />
                </div>
              </div>

              <div>
                <p className="font-semibold">Payment (optional)</p>
                <input placeholder="Name on card" value={profile.payment.name} onChange={e=>setProfile({...profile, payment:{...profile.payment, name: e.target.value}})} className="w-full px-3 py-2 border rounded mb-2" />
                <input placeholder="Card number" value={profile.payment.cardNumber} onChange={e=>setProfile({...profile, payment:{...profile.payment, cardNumber: e.target.value}})} className="w-full px-3 py-2 border rounded mb-2" />
                <div className="flex gap-2">
                  <input placeholder="MM/YY" value={profile.payment.expiry} onChange={e=>setProfile({...profile, payment:{...profile.payment, expiry: formatExpiry(e.target.value)}})} className="flex-1 px-3 py-2 border rounded" />
                  <input placeholder="CVC" value={profile.payment.cvv} onChange={e=>setProfile({...profile, payment:{...profile.payment, cvv: e.target.value}})} className="w-24 px-3 py-2 border rounded" />
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <div className="flex items-center mr-auto">
                  {user && (
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={saveInfoOnCheckout} onChange={e=>setSaveInfoOnCheckout(e.target.checked)} />
                      <span>Save this info to my profile</span>
                    </label>
                  )}
                </div>
                <button onClick={() => { setShowCheckoutModal(false); setCheckoutError(null); }} className="px-4 py-2 rounded border">Cancel</button>
                <button onClick={submitCheckout} disabled={loading} className="px-4 py-2 bg-orange-500 text-white rounded">{loading ? 'Processing...' : (checkoutError ? 'Try Again' : 'Pay Now')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{selectedProduct.name}</h2>
              <button onClick={() => { setShowProductModal(false); setSelectedProduct(null); }} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="text-8xl text-center py-6">{selectedProduct.image || '📦'}</div>
              <p className="text-gray-700">{selectedProduct.description}</p>
              <div className="flex items-center justify-between mt-4">
                <span className="text-2xl font-bold text-orange-500">${selectedProduct.price}</span>
                <span className="text-sm text-gray-600">{typeof selectedProduct.inventory !== 'undefined' ? `In stock: ${selectedProduct.inventory}` : 'Inventory unknown'}</span>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => { setShowProductModal(false); setSelectedProduct(null); }} className="px-4 py-2 rounded border">Close</button>
              <button onClick={() => { addToCart(selectedProduct); setShowProductModal(false); setSelectedProduct(null); }} className="px-4 py-2 bg-orange-500 text-white rounded">Add to Cart</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === 'products' && (
          <div>
            <h2 className="text-3xl font-bold mb-4">Featured Products</h2>
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex flex-col md:flex-row gap-3 items-start md:items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium mr-2">Category</label>
                <select value={filterCategory} onChange={e=>setFilterCategory(e.target.value)} className="px-3 py-2 border rounded">
                  <option>All</option>
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium mr-2">Genre</label>
                <select value={filterGenre} onChange={e=>setFilterGenre(e.target.value)} className="px-3 py-2 border rounded">
                  <option>All</option>
                  {genres.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium mr-2">Brand</label>
                <select value={filterBrand} onChange={e=>setFilterBrand(e.target.value)} className="px-3 py-2 border rounded">
                  <option>All</option>
                  {brands.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <label className="text-sm font-medium mr-2">Sort</label>
                <select value={sortOption} onChange={e=>setSortOption(e.target.value)} className="px-3 py-2 border rounded">
                  <option value="none">Default</option>
                  <option value="price-asc">Price: Low → High</option>
                  <option value="price-desc">Price: High → Low</option>
                  <option value="name-asc">Name: A → Z</option>
                  <option value="name-desc">Name: Z → A</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition">
                  <div onClick={async()=>{ try { const res = await fetch(`${API_BASE}/products/${product.id}`); if(res.ok){ const d = await res.json(); setSelectedProduct(d.product || d); } else { setSelectedProduct(product); } }catch(e){ setSelectedProduct(product);} setShowProductModal(true); }} className="cursor-pointer text-6xl text-center py-8 bg-gradient-to-br from-orange-50 to-gray-50">
                    {product.image}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
                    <p className="text-gray-600 text-sm mb-4">{product.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-orange-500">${product.price}</span>
                      <button
                        onClick={() => addToCart(product)}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'admin' && (
          <div>
            <h2 className="text-3xl font-bold mb-6">Admin Console</h2>
            <div className="flex gap-2 mb-4">
              <button onClick={()=>setAdminViewTab('orders')} className={`px-3 py-1 rounded ${adminViewTab==='orders'?'bg-gray-800 text-white':'border'}`}>Orders</button>
              <button onClick={()=>setAdminViewTab('customers')} className={`px-3 py-1 rounded ${adminViewTab==='customers'?'bg-gray-800 text-white':'border'}`}>Customers</button>
              <button onClick={()=>setAdminViewTab('inventory')} className={`px-3 py-1 rounded ${adminViewTab==='inventory'?'bg-gray-800 text-white':'border'}`}>Inventory</button>
            </div>

            {adminViewTab === 'orders' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="font-semibold mb-4">Orders</h3>
                <div className="flex flex-wrap gap-2 mb-4 items-center">
                  <input placeholder="user email" id="admin-filter-userEmail" className="px-2 py-1 border rounded" />
                  <input placeholder="product name" id="admin-filter-productName" className="px-2 py-1 border rounded" />
                  <input placeholder="product price (exact or min-max)" id="admin-filter-price" className="px-2 py-1 border rounded" />
                  <input placeholder="quantity (exact or min-max)" id="admin-filter-quantity" className="px-2 py-1 border rounded" />
                  <input type="date" value={adminDateFrom} onChange={e=>setAdminDateFrom(e.target.value)} className="px-2 py-1 border rounded" />
                  <input type="date" value={adminDateTo} onChange={e=>setAdminDateTo(e.target.value)} className="px-2 py-1 border rounded" />
                  <button onClick={() => {
                    const u = document.getElementById('admin-filter-userEmail').value;
                    const pName = document.getElementById('admin-filter-productName').value;
                    const pPrice = document.getElementById('admin-filter-price').value;
                    const qty = document.getElementById('admin-filter-quantity').value;
                    const params = {};
                    if (u) params.userEmail = u;
                    if (pName) params.productName = pName;
                    if (pPrice) params.productPrice = pPrice;
                    if (qty) params.quantity = qty;
                    if (adminDateFrom) params.start = adminDateFrom;
                    if (adminDateTo) params.end = adminDateTo;
                    fetchAdminOrders(params);
                  }} className="px-3 py-1 bg-gray-800 text-white rounded">Filter</button>
                  <button onClick={() => {
                    setAdminDateFrom(''); setAdminDateTo('');
                    document.getElementById('admin-filter-userEmail').value='';
                    document.getElementById('admin-filter-productName').value='';
                    document.getElementById('admin-filter-price').value='';
                    document.getElementById('admin-filter-quantity').value='';
                    fetchAdminOrders();
                  }} className="px-3 py-1 border rounded">Reload</button>
                </div>

                {adminOrders.length === 0 ? <div className="text-sm text-gray-600">No orders</div> : (
                  <div className="space-y-2">
                    {adminOrders.map(o => (
                      <details key={`${o.userId || o.sessionKey}-${o.id}`} className="border p-3 rounded">
                        <summary className="flex justify-between items-start cursor-pointer">
                          <div>
                            <div className="font-semibold">Order #{o.id}</div>
                            <div className="text-sm text-gray-500">User: {o.userEmail}{o.userId ? ` (${o.userId})` : ''}</div>
                            <div className="text-sm text-gray-500">Date: {new Date(o.createdAt).toLocaleString()}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-orange-500">${o.total?.toFixed(2) || '0.00'}</div>
                            <div className="text-sm text-gray-600">{o.status}</div>
                          </div>
                        </summary>
                        <div className="mt-2 text-sm">
                          <div className="font-medium">Items:</div>
                          <ul className="list-disc ml-5 mb-2">
                            {(o.items||[]).map(it => {
                              return <li key={it.productId}>{it.productName || `Product ${it.productId}`} — qty: {it.quantity} — ${((Number(it.price)||0)*(it.quantity||1)).toFixed(2)}</li>;
                            })}
                          </ul>
                          <div className="text-sm text-gray-700">Shipping: {o.shipping?.address?.line1 || 'N/A'}</div>
                          <div className="text-sm text-gray-700">Payment Method: {o.paymentMethod || 'N/A'}</div>
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            )}

            {adminViewTab === 'customers' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="font-semibold mb-4">Customers</h3>
                <div className="space-y-3">
                  <div className="flex gap-2 mb-3">
                    <button onClick={() => fetchAdminUsers()} className="px-3 py-1 bg-gray-800 text-white rounded">Reload</button>
                  </div>
                  {adminUsers.length === 0 ? <div className="text-sm text-gray-600">No customers</div> : (
                    <div className="space-y-2">
                      {adminUsers.map(u => (
                        <div key={u.id} className="border p-3 rounded flex justify-between items-center">
                          <div>
                            <div className="font-semibold">{u.email}</div>
                            <div className="text-sm text-gray-500">{u.name || ''} • {u.id}</div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={async()=>{ setSelectedAdminUser(u); setShowAdminUserModal(true); try{ await fetchAdminOrders({ userId: u.id }); }catch(e){} }} className="px-3 py-1 border rounded">View / Edit</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {adminViewTab === 'inventory' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="font-semibold mb-4">Inventory Management</h3>
                <div className="space-y-3">
                  {products.map(p => (
                    <div key={p.id} className="flex items-center justify-between border-b py-3">
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-sm text-gray-500">${p.price} • {p.category || 'Uncategorized'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="number" min="0" defaultValue={p.inventory || 0} className="w-24 px-2 py-1 border rounded" id={`inv-${p.id}`} />
                        <button onClick={() => { const el = document.getElementById(`inv-${p.id}`); const val = el ? Number(el.value) : (p.inventory||0); updateInventory(p.id, val); }} className="px-3 py-1 bg-orange-500 text-white rounded">Update</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            
            {showAdminUserModal && selectedAdminUser && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Customer: {selectedAdminUser.email}</h2>
                    <button onClick={() => { setShowAdminUserModal(false); setSelectedAdminUser(null); }} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
                  </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Email</label>
                        <input defaultValue={selectedAdminUser.email} id="admin-user-email" className="w-full px-3 py-2 border rounded mb-2" />
                        <label className="text-sm font-medium">Name</label>
                        <input defaultValue={selectedAdminUser.name || ''} id="admin-user-name" className="w-full px-3 py-2 border rounded mb-2" />

                        <p className="font-semibold">Address</p>
                        <input defaultValue={selectedAdminUser.address?.line1 || ''} id="admin-user-street" placeholder="Street / Line 1" className="w-full px-3 py-2 border rounded mb-2" />
                        <div className="flex gap-2 mb-2">
                          <input defaultValue={selectedAdminUser.address?.city || ''} id="admin-user-city" placeholder="City" className="flex-1 px-3 py-2 border rounded" />
                          <input defaultValue={selectedAdminUser.address?.state || ''} id="admin-user-state" placeholder="State" className="w-32 px-3 py-2 border rounded" />
                          <input defaultValue={selectedAdminUser.address?.postal || selectedAdminUser.address?.zip || ''} id="admin-user-postal" placeholder="Postal" className="w-32 px-3 py-2 border rounded" />
                        </div>
                        <input defaultValue={selectedAdminUser.address?.country || ''} id="admin-user-country" placeholder="Country" className="w-full px-3 py-2 border rounded" />
                      </div>

                      <div>
                        <p className="font-semibold">Payment Details</p>
                        <input defaultValue={selectedAdminUser.payment?.name || ''} id="admin-user-payment-name" placeholder="Name on card" className="w-full px-3 py-2 border rounded mb-2" />
                        <input defaultValue={selectedAdminUser.payment?.cardNumber || ''} id="admin-user-cardNumber" placeholder="Card number" className="w-full px-3 py-2 border rounded mb-2" />
                        <div className="flex gap-2 mb-2">
                          <input defaultValue={selectedAdminUser.payment?.expiry || ''} id="admin-user-expiry" placeholder="MM/YY" className="flex-1 px-3 py-2 border rounded" />
                          <input defaultValue={selectedAdminUser.payment?.cvv || ''} id="admin-user-cvv" placeholder="CVC" className="w-24 px-3 py-2 border rounded" />
                        </div>

                        <label className="text-sm font-medium">Purchase History</label>
                        <div className="max-h-48 overflow-auto border rounded p-2">
                          {(adminOrders.filter(o=>o.userId === selectedAdminUser.id) || []).map(o=> (
                            <div key={o.id} className="border-b py-2">
                              <div className="text-sm font-medium">Order #{o.id} — ${o.total?.toFixed(2) || '0.00'}</div>
                              <div className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end gap-3">
                      <button onClick={() => { setShowAdminUserModal(false); setSelectedAdminUser(null); }} className="px-4 py-2 rounded border">Cancel</button>
                      <button onClick={async () => {
                        const body = {
                          email: document.getElementById('admin-user-email').value,
                          name: document.getElementById('admin-user-name').value,
                          address: {
                            line1: document.getElementById('admin-user-street').value,
                            city: document.getElementById('admin-user-city').value,
                            province: document.getElementById('admin-user-province').value,
                            postal: document.getElementById('admin-user-postal').value,
                            country: document.getElementById('admin-user-country').value
                          },
                          payment: {
                            name: document.getElementById('admin-user-payment-name').value,
                            cardNumber: document.getElementById('admin-user-cardNumber').value,
                            expiry: document.getElementById('admin-user-expiry').value,
                            cvv: document.getElementById('admin-user-cvv').value
                          }
                        };
                        await updateAdminUser(selectedAdminUser.id, body);
                        setShowAdminUserModal(false);
                        setSelectedAdminUser(null);
                      }} className="px-4 py-2 bg-orange-500 text-white rounded">Save</button>
                    </div>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'cart' && (
          <div>
            <h2 className="text-3xl font-bold mb-6">Shopping Cart</h2>
            {!cart || !cart.items || cart.items.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <ShoppingCart size={64} className="mx-auto text-gray-300 mb-4" />
                <p className="text-xl text-gray-600">Your cart is empty</p>
                <button
                  onClick={() => setView('products')}
                  className="mt-4 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6">
                {cart.items.map(item => {
                  const product = products.find(p => p.id === item.productId);
                  return (
                    <div key={item.id} className="flex items-center justify-between border-b py-4 last:border-b-0">
                      <div className="flex items-center gap-4">
                        <div className="text-4xl">{product?.image || '📦'}</div>
                        <div>
                          <h3 className="font-semibold">{product?.name || `Product ${item.productId}`}</h3>
                          <div className="flex items-center gap-2">
                            <label className="text-gray-600">Qty</label>
                            <input type="number" min={1} max={product?.inventory || 999} value={item.quantity || 1} onChange={e=>{
                              const v = Number(e.target.value || 0);
                              if (!v || v < 1) return;
                              updateCartItem(item.id, v, product?.inventory);
                            }} className="w-20 px-2 py-1 border rounded" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-bold text-orange-500">
                          ${((product?.price || 0) * (item.quantity || 1)).toFixed(2)}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div className="mt-6 pt-6 border-t">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-xl font-semibold">Total:</span>
                    <span className="text-3xl font-bold text-orange-500">
                      ${cart.items.reduce((sum, item) => {
                        const product = products.find(p => p.id === item.productId);
                        return sum + ((product?.price || 0) * (item.quantity || 1));
                      }, 0).toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CreditCard size={20} />
                    {loading ? 'Processing...' : 'Proceed to Checkout'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'orders' && (
          <div>
            <h2 className="text-3xl font-bold mb-6">Your Orders</h2>
            {orders.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <Package size={64} className="mx-auto text-gray-300 mb-4" />
                <p className="text-xl text-gray-600">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">Order #{order.id}</h3>
                        <p className="text-gray-600 text-sm">
                          {new Date(order.createdAt || Date.now()).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        {order.status || 'Completed'}
                      </span>
                    </div>
                    <div className="border-t pt-4">
                      <p className="text-2xl font-bold text-orange-500">
                        ${order.total?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {view === 'orderSummary' && selectedOrder && (
          <div>
            <h2 className="text-3xl font-bold mb-6">Order Summary</h2>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">Order #{selectedOrder.id}</h3>
                  <p className="text-gray-600 text-sm">{new Date(selectedOrder.createdAt || Date.now()).toLocaleString()}</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  {selectedOrder.status || 'Completed'}
                </span>
              </div>

              <div className="border-t pt-4">
                <ul className="divide-y">
                  {(selectedOrder.items || []).map(it => {
                    return (
                      <li key={it.productId} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="font-medium">{it.productName || `Product ${it.productId}`}</div>
                          <div className="text-sm text-gray-500">Quantity: {it.quantity} • ${Number(it.price || 0).toFixed(2)} each</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-orange-500">${((Number(it.price||0)) * (it.quantity||1)).toFixed(2)}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-6">
                  <p className="text-2xl font-bold text-orange-500">${selectedOrder.total?.toFixed(2) || '0.00'}</p>
                  <div className="mt-4">
                    <button onClick={() => { setView('orders'); setSelectedOrder(null); fetchOrders(); }} className="mt-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg">Back to Orders</button>
                    <button onClick={() => { setView('products'); setSelectedOrder(null); }} className="ml-2 mt-2 bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg">Continue Shopping</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
