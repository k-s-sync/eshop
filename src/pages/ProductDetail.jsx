import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    // Scroll to top when loading the page
    window.scrollTo(0, 0);
    
    fetch(`http://localhost:5000/api/products/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProduct(data.product);
        } else {
          navigate('/');
        }
      })
      .catch(err => {
        console.error('Error fetching product:', err);
        navigate('/');
      });
  }, [id, navigate]);

  if (!product) return null;

  const handleAdd = () => {
    // Add the specific quantity to cart
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
    
    setAdded(true);
    setTimeout(() => setAdded(false), 800);
  };

  const increaseQuantity = () => setQuantity(prev => prev + 1);
  const decreaseQuantity = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  return (
    <div className="product-detail-page">
      <div className="container">
        <Link to="/" className="back-link">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Shop
        </Link>

        <div className="product-detail-container glass-panel">
          <div className="product-detail-image-wrapper">
             {imgError ? (
                <div className="product-detail-image-error">
                  <span>🥬</span>
                </div>
              ) : (
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="product-detail-image" 
                  onError={() => setImgError(true)} 
                />
              )}
          </div>

          <div className="product-detail-info">
            <div className="product-detail-category">{product.category}</div>
            <h1 className="product-detail-name">{product.name}</h1>
            
            <div className="product-detail-price-box">
              <span className="product-detail-amount">${product.price}</span>
              <span className="product-detail-unit">/ {product.unit}</span>
            </div>

            <div className="product-detail-description-section">
              <h3>About this product</h3>
              <p className="product-detail-description">{product.description}</p>
              
              <ul className="product-detail-features">
                <li><span className="feature-icon">✨</span> Farm fresh daily</li>
                <li><span className="feature-icon">🌱</span> 100% Organic certified</li>
                <li><span className="feature-icon">🚚</span> Next-day delivery available</li>
              </ul>
            </div>

            <div className="product-detail-actions">
              <div className="product-detail-quantity">
                <button onClick={decreaseQuantity} aria-label="Decrease quantity">−</button>
                <span>{quantity}</span>
                <button onClick={increaseQuantity} aria-label="Increase quantity">+</button>
              </div>

              <button 
                className={`btn btn-primary product-detail-add-btn ${added ? 'added' : ''}`}
                onClick={handleAdd}
              >
                {added ? (
                  <>✓ Added to Cart</>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                    Add {quantity > 1 ? `${quantity} ` : ''}to Cart
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
