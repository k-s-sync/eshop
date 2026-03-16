import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './ProfileDashboard.css';

const ProfileDashboard = () => {
  const { user, token, logout, loading, setUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Data States
  const [profileData, setProfileData] = useState({ fullName: '', phone: '' });
  const [addresses, setAddresses] = useState([]);
  const [orders, setOrders] = useState([]);
  
  // UI States
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState('');
  
  // New Address Form State
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [newAddress, setNewAddress] = useState({ addressLine: '', city: '', state: '', postalCode: '', isDefault: false });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && token) {
      if (activeTab === 'profile') fetchProfile();
      if (activeTab === 'addresses') fetchAddresses();
      if (activeTab === 'orders') fetchOrders();
    }
  }, [activeTab, user, token]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProfileData({ fullName: data.user.full_name, phone: data.user.phone || '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAddresses = async () => {
    try {
      const res = await fetch('/api/addresses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setAddresses(data.addresses);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setOrders(data.orders);
    } catch (err) {
      console.error(err);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setMessage('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(profileData)
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Profile updated successfully!');
        setUser({ ...user, name: profileData.fullName });
      } else {
        setMessage('Failed to update profile.');
      }
    } catch (err) {
      setMessage('Network error.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    const isEdit = editingAddressId !== null;
    const url = isEdit ? `/api/addresses/${editingAddressId}` : '/api/addresses';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newAddress)
      });
      const data = await res.json();
      if (data.success) {
        setShowAddressForm(false);
        setEditingAddressId(null);
        setNewAddress({ addressLine: '', city: '', state: '', postalCode: '', isDefault: false });
        fetchAddresses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditClick = (addr) => {
    setNewAddress({
      addressLine: addr.address_line,
      city: addr.city,
      state: addr.state,
      postalCode: addr.postal_code,
      isDefault: addr.is_default === 1
    });
    setEditingAddressId(addr.id);
    setShowAddressForm(true);
  };

  const handleDeleteAddress = async (id) => {
    if(!window.confirm('Delete this address?')) return;
    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) fetchAddresses();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !user) return <div className="container" style={{padding: '120px 2rem', textAlign: 'center'}}>Loading...</div>;

  return (
    <div className="container profile-container">
      <div className="profile-sidebar">
        <div className="profile-header">
          <div className="profile-avatar">{(user.name || user.full_name || 'U').charAt(0)}</div>
          <h3>{user.name || user.full_name}</h3>
          <p>{user.email}</p>
        </div>
        <nav className="profile-nav">
          <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>My Profile</button>
          <button className={activeTab === 'addresses' ? 'active' : ''} onClick={() => setActiveTab('addresses')}>Saved Addresses</button>
          <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>Order History</button>
          <button className="logout-btn" onClick={logout}>Logout</button>
        </nav>
      </div>

      <div className="profile-content">
        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="tab-pane active fade-in">
            <h2>Personal Information</h2>
            {message && <div className="alert-success">{message}</div>}
            <form onSubmit={handleProfileUpdate} className="profile-form">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={profileData.fullName} onChange={(e) => setProfileData({...profileData, fullName: e.target.value})} required/>
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" value={user.email} disabled className="disabled-input" />
                <small>Email cannot be changed.</small>
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={isUpdating}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}

        {/* ADDRESSES TAB */}
        {activeTab === 'addresses' && (
          <div className="tab-pane active fade-in">
            <div className="flex-between">
              <h2>Saved Addresses</h2>
              <button className="btn btn-primary btn-sm" onClick={() => {
                if (showAddressForm) {
                  setShowAddressForm(false);
                  setEditingAddressId(null);
                  setNewAddress({ addressLine: '', city: '', state: '', postalCode: '', isDefault: false });
                } else {
                  setShowAddressForm(true);
                }
              }}>
                {showAddressForm ? 'Cancel' : '+ Add New'}
              </button>
            </div>

            {showAddressForm && (
              <form onSubmit={handleSaveAddress} className="address-form glass-panel" style={{marginBottom: '2rem'}}>
                <h3 style={{marginBottom: '1rem', color: 'var(--color-primary-dark)'}}>
                  {editingAddressId ? 'Edit Address' : 'Add New Address'}
                </h3>
                <div className="form-group">
                  <label>Address Line (Street, Apt)</label>
                  <input type="text" required value={newAddress.addressLine} onChange={e => setNewAddress({...newAddress, addressLine: e.target.value})}/>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>City</label>
                    <input type="text" required value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})}/>
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input type="text" required value={newAddress.state} onChange={e => setNewAddress({...newAddress, state: e.target.value})}/>
                  </div>
                  <div className="form-group">
                    <label>Postal Code</label>
                    <input type="text" required value={newAddress.postalCode} onChange={e => setNewAddress({...newAddress, postalCode: e.target.value})}/>
                  </div>
                </div>
                <div className="form-group checkbox-group">
                  <label>
                    <input type="checkbox" checked={newAddress.isDefault} onChange={e => setNewAddress({...newAddress, isDefault: e.target.checked})} />
                    Set as default delivery address
                  </label>
                </div>
                <button type="submit" className="btn btn-primary">
                  {editingAddressId ? 'Update Address' : 'Save Address'}
                </button>
              </form>
            )}

            <div className="address-grid">
              {addresses.length === 0 && !showAddressForm && (
                <p className="empty-state">No saved addresses found.</p>
              )}
              {addresses.map(addr => (
                <div key={addr.id} className={`address-card ${addr.is_default ? 'default' : ''}`}>
                  {!!addr.is_default && <span className="badge">Default</span>}
                  <p className="addr-line">{addr.address_line}</p>
                  <p>{addr.city}, {addr.state} {addr.postal_code}</p>
                  <div className="addr-actions" style={{display: 'flex', gap: '1rem'}}>
                    <button className="edit-btn" onClick={() => handleEditClick(addr)} style={{background:'none', border:'none', color:'var(--color-primary)', cursor:'pointer', fontWeight: 500, fontSize: '0.9rem'}}>Edit</button>
                    <button className="delete-btn" onClick={() => handleDeleteAddress(addr.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="tab-pane active fade-in">
            <h2>Order History</h2>
            {orders.length === 0 ? (
              <div className="empty-state">
                <span className="icon">📦</span>
                <p>You haven't placed any orders yet.</p>
              </div>
            ) : (
              <div className="order-list">
                {orders.map(order => (
                  <div key={order.id} className="order-card">
                    <div className="order-header">
                      <div>
                        <span className="order-date">{new Date(order.created_at).toLocaleDateString()}</span>
                        <span className={`order-status status-${order.status.toLowerCase()}`}>{order.status}</span>
                      </div>
                      <div className="order-total">
                        Total: ₹{order.total_amount}
                      </div>
                    </div>
                    <div className="order-items">
                      {order.items.map(item => (
                        <div key={item.id} className="oi-row">
                          <span>{item.quantity}x {item.product_name}</span>
                          <span>${item.price}</span>
                        </div>
                      ))}
                    </div>
                    <div className="order-footer">
                      ID: {order.tx_order_id} 
                      {order.payment_id && ` | Ref: ${order.payment_id}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileDashboard;
