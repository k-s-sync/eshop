import { useState, useEffect } from 'react';
import Hero from '../components/Hero';
import ProductGrid from '../components/ProductGrid';
import InfoSection from '../components/InfoSection';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('All');

  const categories = ['All', 'Fruits & Veg', 'Crisp & Cool', 'Spring Greens', 'Greens', 'Peppers', 'Fungi'];

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const queryParams = new URLSearchParams();
    if (category !== 'All') queryParams.append('category', category);
    if (debouncedSearch) queryParams.append('search', debouncedSearch);

    fetch(`http://localhost:5000/api/products?${queryParams.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProducts(data.products);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch products:', err);
        setLoading(false);
      });
  }, [category, debouncedSearch]);

  return (
    <>
      <Hero />
      <div id="shop" className="shop-section">
        <div className="container filter-container">
          <div className="search-bar glass-panel">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              placeholder="Search for fresh vegetables..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="category-filters">
            {categories.map(cat => (
              <button 
                key={cat} 
                className={`category-btn ${category === cat ? 'active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="container" style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p className="loading-text">Bringing you the freshest harvest...</p>
          </div>
        ) : products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <div className="container no-results" style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p>No products found for your search.</p>
            <button className="btn btn-secondary" onClick={() => { setSearch(''); setCategory('All'); }}>
              Clear Filters
            </button>
          </div>
        )}
      </div>
      <InfoSection />
    </>
  );
};

export default Home;
