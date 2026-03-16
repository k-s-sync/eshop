import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('inventory');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    id: '', name: '', price: '', unit: '', category: '', description: '', image: ''
  });

  useEffect(() => {
    // Wait for auth to finish loading before checking permissions
    if (authLoading) return;

    console.log("Admin Check - User:", user);
    console.log("Admin Check - is_admin:", user?.is_admin);

    const isAdmin = user && (user.is_admin === 1 || user.is_admin === true || String(user.is_admin) === '1');

    if (!isAdmin) {
      console.log("Admin Check - Redirecting to home: Not an admin");
      navigate('/');
      return;
    }
    fetchData();
  }, [user, authLoading, navigate, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'inventory' ? '/api/products' : '/api/admin/orders';
      const headers = activeTab === 'orders' ? { 'Authorization': `Bearer ${token}` } : {};
      
      const res = await fetch(`http://localhost:5000${endpoint}`, { headers });
      const data = await res.json();
      
      if (data.success) {
        if (activeTab === 'inventory') setProducts(data.products);
        else setOrders(data.orders);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
    setLoading(false);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    const method = editingProduct ? 'PUT' : 'POST';
    const url = editingProduct 
      ? `http://localhost:5000/api/admin/products/${editingProduct.id}` 
      : 'http://localhost:5000/api/admin/products';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productForm)
      });
      const data = await res.json();
      if (data.success) {
        setShowProductModal(false);
        setEditingProduct(null);
        fetchData();
        setProductForm({ id: '', name: '', price: '', unit: '', category: '', description: '', image: '' });
      }
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await fetch(`http://localhost:5000/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setProductForm({ id: 'v' + Date.now().toString().slice(-4), name: '', price: '', unit: '', category: '', description: '', image: '' });
    setShowProductModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setProductForm(product);
    setShowProductModal(true);
  };

  if (authLoading || (loading && products.length === 0 && orders.length === 0)) {
    return <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>Loading Admin Dashboard...</div>;
  }

  const isAdmin = user && (user.is_admin === 1 || user.is_admin === true || String(user.is_admin) === '1');
  if (!isAdmin) return null;

  return (
    <div className="admin-dashboard-page">
      <div className="container">
        <header className="admin-header">
          <div>
            <h1>Admin Dashboard</h1>
            <p>Welcome back, {user.name}. Manage your harvest and orders.</p>
          </div>
        </header>

        <div className="admin-tabs">
          <button 
            className={`admin-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            Inventory Management
          </button>
          <button 
            className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Recent Orders
          </button>
        </div>

        {activeTab === 'inventory' ? (
          <div className="inventory-section">
            <div className="inventory-actions">
              <h3>Product Stock</h3>
              <button className="btn btn-primary" onClick={openAddModal}>+ Add New Vegetable</button>
            </div>

            <div className="inventory-table-container glass-panel">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td><img src={p.image} alt="" className="product-img-small" /></td>
                      <td><code>{p.id}</code></td>
                      <td>{p.name}</td>
                      <td><span className="badge badge-category">{p.category}</span></td>
                      <td>₹{p.price} / {p.unit}</td>
                      <td className="admin-action-btns">
                        <button className="icon-btn" onClick={() => openEditModal(p)} title="Edit">✏️</button>
                        <button className="icon-btn delete" onClick={() => deleteProduct(p.id)} title="Delete">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="orders-section">
            <div className="inventory-actions">
              <h3>Customer Orders</h3>
            </div>

            <div className="inventory-table-container glass-panel">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th>Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td>#{o.id}</td>
                      <td>
                        <div className="order-customer-info">
                          <span>{o.customer_name || 'Guest'}</span>
                          <span className="customer-email">{o.customer_email || 'No Email'}</span>
                        </div>
                      </td>
                      <td>₹{o.total_amount}</td>
                      <td>
                        <span className={`badge badge-status ${o.status.toLowerCase()}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="order-items-summary">
                        {o.items?.length} items
                      </td>
                      <td>
                        <select 
                          value={o.status} 
                          onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                          className="status-select"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="PAID">Paid</option>
                          <option value="PROCESSING">Processing</option>
                          <option value="OUT_FOR_DELIVERY">Shipping</option>
                          <option value="DELIVERED">Delivered</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showProductModal && (
        <div className="modal-overlay">
          <div className="admin-modal glass-panel">
            <h2>{editingProduct ? 'Edit Vegetable' : 'Add New Vegetable'}</h2>
            <form onSubmit={handleProductSubmit} className="admin-form">
              <div className="form-group">
                <label>Unique ID (slug)</label>
                <input 
                  type="text" 
                  value={productForm.id} 
                  onChange={e => setProductForm({...productForm, id: e.target.value})}
                  disabled={!!editingProduct}
                  placeholder="e.g. v7"
                  required 
                />
              </div>
              <div className="form-group">
                <label>Product Name</label>
                <input 
                  type="text" 
                  value={productForm.name} 
                  onChange={e => setProductForm({...productForm, name: e.target.value})}
                  placeholder="e.g. Fresh Carrots"
                  required 
                />
              </div>
              <div className="form-row" style={{display: 'flex', gap: '1rem'}}>
                <div className="form-group" style={{flex: 1}}>
                  <label>Price (₹)</label>
                  <input 
                    type="number" step="0.01"
                    value={productForm.price} 
                    onChange={e => setProductForm({...productForm, price: e.target.value})}
                    required 
                  />
                </div>
                <div className="form-group" style={{flex: 1}}>
                  <label>Unit</label>
                  <input 
                    type="text" 
                    value={productForm.unit} 
                    onChange={e => setProductForm({...productForm, unit: e.target.value})}
                    placeholder="lb / each / bunch"
                    required 
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Category</label>
                <select 
                  value={productForm.category} 
                  onChange={e => setProductForm({...productForm, category: e.target.value})}
                  required
                >
                  <option value="">Select Category</option>
                  <option value="Fruits & Veg">Fruits & Veg</option>
                  <option value="Greens">Greens</option>
                  <option value="Peppers">Peppers</option>
                  <option value="Fungi">Fungi</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Image URL</label>
                <input 
                  type="text" 
                  value={productForm.image} 
                  onChange={e => setProductForm({...productForm, image: e.target.value})}
                  placeholder="https://images.unsplash.com/..."
                  required 
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  rows="3"
                  value={productForm.description} 
                  onChange={e => setProductForm({...productForm, description: e.target.value})}
                  required 
                ></textarea>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowProductModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingProduct ? 'Update Product' : 'Create Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
