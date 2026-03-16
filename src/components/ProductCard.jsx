import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './ProductCard.css';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const [imgError, setImgError] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 800);
  };

  return (
    <article className="product-card glass-panel">
      <Link to={`/product/${product.id}`} className="product-image-link">
        <div className="product-image-container">
          {imgError ? (
            <span className="product-image-error">🥬</span>
          ) : (
            <img 
              src={product.image} 
              alt={product.name} 
              className="product-image" 
              loading="lazy"
              onError={() => setImgError(true)} 
            />
          )}
          <span className="product-category">{product.category}</span>
        </div>
      </Link>
      <div className="product-info">
        <Link to={`/product/${product.id}`} className="product-title-link">
          <h3 className="product-name">{product.name}</h3>
        </Link>
        <p className="product-desc">{product.description}</p>
        <div className="product-bottom">
          <div className="product-price">
            <span className="amount">${product.price}</span>
            <span className="unit">/ {product.unit}</span>
          </div>
          <button 
            className={`btn btn-primary add-btn ${added ? 'added' : ''}`}
            onClick={handleAdd}
            aria-label={`Add ${product.name} to cart`}
          >
            {added ? (
              <>✓ Added</>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Add
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
