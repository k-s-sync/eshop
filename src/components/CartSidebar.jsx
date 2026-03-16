import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import './CartSidebar.css';
import './CartSidebar.css';

const CartSidebar = () => {
  const { 
    cartItems, 
    isCartOpen, 
    setIsCartOpen, 
    removeFromCart, 
    updateQuantity, 
    totalPrice,
    clearCart 
  } = useCart();

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('cart'); // 'cart' | 'address'

  const { user, token } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [guestForm, setGuestForm] = useState({
    name: '', email: '', phone: '', addressLine: '', city: '', state: '', postalCode: ''
  });

  // Reset step when cart closes
  useEffect(() => {
    if (!isCartOpen) {
      setCheckoutStep('cart');
      setPaymentSuccess(false);
    }
  }, [isCartOpen]);

  // Fetch addresses if logged in
  useEffect(() => {
    if (user && token && isCartOpen) {
      fetch('http://localhost:5000/api/addresses', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.addresses.length > 0) {
          setAddresses(data.addresses);
          setSelectedAddressId(data.addresses[0].id); // Auto-select first (default) address
        }
      })
      .catch(console.error);
    }
  }, [user, token, isCartOpen]);

  if (!isCartOpen) return null;

  // Paytm Integration
  const handleCheckout = async (e) => {
    if (e) e.preventDefault();
    setIsProcessing(true);

    const totalINR = Math.round(totalPrice * 83);
    const orderId = 'ORD_' + new Date().getTime(); // Unique Order ID

    let addressData;
    let customerData;

    if (user) {
      const selectedObj = addresses.find(a => a.id === Number(selectedAddressId));
      if (!selectedObj) {
        alert("Please add an address first or select one.");
        setIsProcessing(false);
        return;
      }
      addressData = {
        addressLine: selectedObj.address_line,
        city: selectedObj.city,
        state: selectedObj.state,
        postalCode: selectedObj.postal_code
      };
      customerData = {
        customerName: user.name,
        customerEmail: user.email,
        customerPhone: user.phone || '9999999999',
        userId: user.id
      };
    } else {
      addressData = {
        addressLine: guestForm.addressLine,
        city: guestForm.city,
        state: guestForm.state,
        postalCode: guestForm.postalCode
      };
      customerData = {
        customerName: guestForm.name,
        customerEmail: guestForm.email,
        customerPhone: guestForm.phone,
        userId: null
      };
    }

    try {
      // 1. Fetch Transaction Token from Node backend
      const response = await fetch('http://localhost:5000/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId,
          amount: totalINR,
          items: cartItems, // Send cart items just in case the backend needs it
          address: addressData,
          ...customerData
        })
      });

      const data = await response.json();

      if (data.success) {
        // 2. Configure Paytm CheckoutJS
        const config = {
          "root": "", // Leave empty to render in overlay full page
          "flow": "DEFAULT",
          "data": {
            "orderId": data.orderId,
            "token": data.txnToken,
            "tokenType": "TXN_TOKEN",
            "amount": totalINR.toString()
          },
          "handler": {
            "notifyMerchant": function(eventName, data) {
              console.log("Paytm Event:", eventName, data);
            }
            // Note: The actual success/fail redirect happens via backend webhook payload to callbackUrl
          }
        };

        // 3. Dynamically load Paytm Checkout Script
        const script = document.createElement("script");
        script.src = `https://securegw-stage.paytm.in/merchantpgpui/checkoutjs/merchants/${data.mid}.js`;
        script.type = "application/javascript";
        script.crossOrigin = "anonymous";
        
        script.onload = () => {
          if (window.Paytm && window.Paytm.CheckoutJS) {
            window.Paytm.CheckoutJS.init(config).then(function onSuccess() {
              window.Paytm.CheckoutJS.invoke();
            }).catch(function onError(error) {
              console.error("Paytm Invocation Error:", error);
              setIsProcessing(false);
            });
          }
        };
        
        script.onerror = () => {
          alert('Failed to load Paytm SDK');
          setIsProcessing(false);
        };
        
        document.body.appendChild(script);

      } else {
        alert("Failed to initiate payment: " + data.message);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Backend request failed:", error);
      alert("Error contacting payment server. Make sure the Node.js backend is running on port 5000.");
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="cart-overlay" onClick={() => setIsCartOpen(false)}></div>
      <div className="cart-sidebar">
        <div className="cart-header">
          <h2>Your Cart</h2>
          <button className="close-btn" onClick={() => setIsCartOpen(false)} aria-label="Close cart">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {checkoutStep === 'cart' ? (
          <div className="cart-items">
            {cartItems.length === 0 ? (
              <div className="empty-cart">
                <span className="empty-cart-icon">🛒</span>
                <p>Your cart is empty.</p>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setIsCartOpen(false)}
                  style={{marginTop: '1rem'}}
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              cartItems.map(item => (
                <div key={item.id} className="cart-item">
                  <img src={item.image} alt={item.name} className="cart-item-img" />
                  <div className="cart-item-details">
                    <h4>{item.name}</h4>
                    <p className="cart-item-price">${item.price} / {item.unit}</p>
                    
                    <div className="cart-item-actions">
                      <div className="quantity-controls">
                        <button onClick={() => updateQuantity(item.id, -1)} aria-label="Decrease quantity">−</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} aria-label="Increase quantity">+</button>
                      </div>
                      <button 
                        className="remove-btn"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Remove ${item.name}`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="cart-item-total">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="checkout-address-step fade-in">
            <button className="back-btn" onClick={() => setCheckoutStep('cart')}>← Back to Cart</button>
            <h3 style={{marginBottom: '1rem', color: 'var(--color-primary-dark)'}}>Delivery Details</h3>
            
            {user ? (
              <div className="logged-in-checkout">
                {addresses.length > 0 ? (
                  <div className="address-selector">
                    <p style={{marginBottom: '0.5rem', fontWeight: 500}}>Select a saved address:</p>
                    {addresses.map(addr => (
                      <label key={addr.id} className={`address-radio-card ${Number(selectedAddressId) === addr.id ? 'selected' : ''}`}>
                        <input 
                          type="radio" 
                          name="address" 
                          value={addr.id} 
                          checked={Number(selectedAddressId) === addr.id}
                          onChange={(e) => setSelectedAddressId(e.target.value)} 
                        />
                        <div className="radio-content">
                          <p className="addr-l1">{addr.address_line}</p>
                          <p className="addr-l2">{addr.city}, {addr.state} {addr.postal_code}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="no-address">
                    <p>You don't have any saved addresses.</p>
                    <a href="/profile" className="btn btn-primary btn-sm" style={{display:'inline-block', marginTop:'1rem', textDecoration:'none'}}>Go to Profile to Add One</a>
                  </div>
                )}
              </div>
            ) : (
              <form id="guest-checkout-form" className="guest-checkout-form" onSubmit={handleCheckout}>
                <div className="form-group"><input type="text" placeholder="Full Name" required value={guestForm.name} onChange={e=>setGuestForm({...guestForm, name: e.target.value})} /></div>
                <div className="form-group"><input type="email" placeholder="Email" required value={guestForm.email} onChange={e=>setGuestForm({...guestForm, email: e.target.value})} /></div>
                <div className="form-group"><input type="tel" placeholder="Phone" required value={guestForm.phone} onChange={e=>setGuestForm({...guestForm, phone: e.target.value})} /></div>
                <div className="form-group"><input type="text" placeholder="Street Address / Apt" required value={guestForm.addressLine} onChange={e=>setGuestForm({...guestForm, addressLine: e.target.value})} /></div>
                <div style={{display:'flex', gap:'0.5rem'}}>
                  <div className="form-group" style={{flex:2}}><input type="text" placeholder="City" required value={guestForm.city} onChange={e=>setGuestForm({...guestForm, city: e.target.value})} /></div>
                  <div className="form-group" style={{flex:1}}><input type="text" placeholder="State" required value={guestForm.state} onChange={e=>setGuestForm({...guestForm, state: e.target.value})} /></div>
                </div>
                <div className="form-group"><input type="text" placeholder="Postal Code" required value={guestForm.postalCode} onChange={e=>setGuestForm({...guestForm, postalCode: e.target.value})} /></div>
              </form>
            )}
          </div>
        )}

        {paymentSuccess ? (
          <div className="cart-success">
            <span className="success-icon">🎉</span>
            <h3>Payment Successful!</h3>
            <p>Your order is confirmed and will be delivered fresh tomorrow.</p>
          </div>
        ) : cartItems.length > 0 && (
          <div className="cart-footer">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>${totalPrice.toFixed(2)} (₹{Math.round(totalPrice * 83)})</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span style={{color: 'var(--color-primary)', fontWeight: 600}}>Free</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>${totalPrice.toFixed(2)} (₹{Math.round(totalPrice * 83)})</span>
            </div>
            {checkoutStep === 'cart' ? (
              <button 
                className={`btn btn-primary checkout-btn`}
                onClick={() => setCheckoutStep('address')}
              >
                Proceed to Checkout
              </button>
            ) : (
              <button 
                type={user ? "button" : "submit"}
                form={!user ? "guest-checkout-form" : undefined}
                className={`btn btn-primary checkout-btn ${isProcessing ? 'processing' : ''}`}
                onClick={user ? handleCheckout : undefined}
                disabled={isProcessing || (user && addresses.length === 0)}
              >
                {isProcessing ? 'Processing...' : 'Pay with UPI'}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default CartSidebar;
