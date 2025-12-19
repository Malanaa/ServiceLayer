import React, { useState, useEffect } from 'react';
import { ShoppingCart, User, LogOut, Package, CreditCard, Search, Menu, X } from 'lucide-react';

const API_BASE = 'http://localhost:3000/api';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
  const [checkoutAddress, setCheckoutAddress] = useState({});
  const [checkoutPayment, setCheckoutPayment] = useState({});
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [saveProfileInfo, setSaveProfileInfo] = useState(false);

  const formatExpiry = (value) => {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return digits.slice(0, 2) + '/' + digits.slice(2);
  };

  
  useEffect(() => {
    setProducts([
      { id: 1, name: 'Wireless Headphones', price: 99.99, description: 'Premium sound quality', image: '🎧' },
      { id: 2, name: 'Smart Watch', price: 299.99, description: 'Track your fitness', image: '⌚' },
      { id: 3, name: 'Laptop Stand', price: 49.99, description: 'Ergonomic design', image: '💻' },
      { id: 4, name: 'Mechanical Keyboard', price: 149.99, description: 'Tactile typing experience', image: '⌨️' },
      { id: 5, name: 'USB-C Hub', price: 79.99, description: '7-in-1 connectivity', image: '🔌' },
      { id: 6, name: 'Desk Lamp', price: 39.99, description: 'LED with adjustable brightness', image: '💡' },
    ]);
  }, []);

  
  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const res = await fetch(`${API_BASE}/cart`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCart(data);
        setUser({ loggedIn: true }); 
      }
    } catch (err) {
      console.log('Not logged in or cart unavailable');
    }
  };

  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(prev => ({ ...prev, profile: data }));
        // Initialize checkout fields with user's data
        const addr = data.address || {};
        const payment = data.payment || {};
        setCheckoutAddress({
          street: addr.street || '',
          city: addr.city || '',
          province: addr.province || addr.state || '',
          zip: addr.zip || '',
          country: addr.country || ''
        });
        setCheckoutPayment({
          cardName: payment.name || (data.firstName ? `${data.firstName} ${data.lastName}` : ''),
          cardNumber: payment.cardNumber || '',
          cardExpiry: payment.expiry || '',
          cardCvc: payment.cvc || ''
        });
      }
    } catch (err) {
      console.log('Failed to fetch user profile');
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
        setUser({ email: authEmail });
        
        // Profile data is now saved server-side during registration, no client POST required
        // (frontend will still fetch the fresh profile via fetchUserProfile())
        
        setShowAuthModal(false);
        setAuthEmail('');
        setAuthPassword('');
        setAddrProvince('');
        setAddrCity('');
        setAddrStreet('');
        setAddrZip('');
        setCardNumber('');
        setCardHolderName('');
        setCardExpiry('');
        setCardCvc('');
        setSaveProfileInfo(false);
        showMessage(authMode === 'login' ? 'Login successful!' : 'Registration successful!', 'success');
        await fetchCart();
        await fetchUserProfile();
      } else {
        showMessage(data.message || 'Authentication failed', 'error');
      }
    } catch (err) {
      showMessage('Server error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCart(null);
    setOrders([]);
    setView('products');
    showMessage('Logged out successfully', 'success');
  };

  const addToCart = async (product) => {
    
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
          } catch (e) {
           
          }
        }
        if (typeof inv !== 'undefined' && Number(inv) === 0) {
          showMessage('Sorry — this item is out of stock', 'error');
          return;
        }
      }
    } catch (e) {
      
    }

    if (!user) {
      showMessage('Please login to add items to cart', 'error');
      setShowAuthModal(true);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/cart/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });

      if (res.ok) {
        await fetchCart();
        showMessage('Added to cart!', 'success');
      } else {
        const data = await res.json();
          const srv = (data && data.message) ? String(data.message).toLowerCase() : '';
          if (srv.includes('exceeds') || srv.includes('out of stock') || srv.includes('insufficient')) {
            showMessage('Limit crossed', 'error');
          } else {
            showMessage(data.message || 'Added locally to cart', 'success');
          }
      }
    } catch (err) {
      showMessage('Server error', 'error');
    }
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

  const handleCheckout = async () => {
    if (!cart || !cart.items || cart.items.length === 0) {
      showMessage('Cart is empty', 'error');
      return;
    }

    // Fetch user profile to pre-fill checkout information
    await fetchUserProfile();
    setShowCheckoutModal(true);
  };

  const handleCheckoutSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/orders/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          paymentMethod: 'credit_card',
          shippingAddress: checkoutAddress,
          paymentDetails: checkoutPayment
        }),
      });

      const data = await res.json();

      if (res.ok) {
        showMessage('Order placed successfully!', 'success');
        setShowCheckoutModal(false);
        await fetchCart();
        
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
        showMessage(data.message || 'Checkout failed', 'error');
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

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cartItemCount = cart?.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;

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
              {user ? (
                <>
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

                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="checkbox"
                      id="saveProfile"
                      checked={saveProfileInfo}
                      onChange={(e) => setSaveProfileInfo(e.target.checked)}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <label htmlFor="saveProfile" className="text-sm text-gray-700 cursor-pointer">
                      Save this info to my profile
                    </label>
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
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Checkout</h2>
              <button onClick={() => setShowCheckoutModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Shipping Address */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Shipping Address</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Address line 1"
                    value={checkoutAddress.street || ''}
                    onChange={(e) => setCheckoutAddress({ ...checkoutAddress, street: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="City"
                      value={checkoutAddress.city || ''}
                      onChange={(e) => setCheckoutAddress({ ...checkoutAddress, city: e.target.value })}
                      className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="Postal Code"
                      value={checkoutAddress.zip || ''}
                      onChange={(e) => setCheckoutAddress({ ...checkoutAddress, zip: e.target.value })}
                      className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Province"
                      value={checkoutAddress.province || ''}
                      onChange={(e) => setCheckoutAddress({ ...checkoutAddress, province: e.target.value })}
                      className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="Country"
                      value={checkoutAddress.country || ''}
                      onChange={(e) => setCheckoutAddress({ ...checkoutAddress, country: e.target.value })}
                      className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Name on card"
                    value={checkoutPayment.cardName || ''}
                    onChange={(e) => setCheckoutPayment({ ...checkoutPayment, cardName: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Card number"
                    value={checkoutPayment.cardNumber || ''}
                    onChange={(e) => setCheckoutPayment({ ...checkoutPayment, cardNumber: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={checkoutPayment.cardExpiry || ''}
                      onChange={(e) => setCheckoutPayment({ ...checkoutPayment, cardExpiry: formatExpiry(e.target.value) })}
                      className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="CVV"
                      value={checkoutPayment.cardCvc || ''}
                      onChange={(e) => setCheckoutPayment({ ...checkoutPayment, cardCvc: e.target.value })}
                      className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Order Summary</h3>
                <div className="text-sm text-gray-600 mb-3">
                  {cart?.items?.length} item(s)
                </div>
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="font-semibold">Total:</span>
                  <span className="text-2xl font-bold text-orange-500">
                    ${cart?.items?.reduce((sum, item) => {
                      const product = products.find(p => p.id === item.productId);
                      return sum + ((product?.price || 0) * (item.quantity || 1));
                    }, 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowCheckoutModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCheckoutSubmit}
                  disabled={loading}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CreditCard size={20} />
                  {loading ? 'Processing...' : 'Pay Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === 'products' && (
          <div>
            <h2 className="text-3xl font-bold mb-6">Featured Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition">
                  <div className="text-6xl text-center py-8 bg-gradient-to-br from-orange-50 to-gray-50">
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
                          <p className="text-gray-600">Quantity: {item.quantity || 1}</p>
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
                    const prod = products.find(p => p.id === it.productId) || {};
                    return (
                      <li key={it.productId} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="font-medium">{prod.name || `Product ${it.productId}`}</div>
                          <div className="text-sm text-gray-500">Quantity: {it.quantity}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-orange-500">${((prod.price||0) * (it.quantity||1)).toFixed(2)}</div>
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