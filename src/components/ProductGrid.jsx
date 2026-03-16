import ProductCard from './ProductCard';
import './ProductGrid.css';

const ProductGrid = ({ products }) => {
  return (
    <section className="product-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Fresh Arrivals</h2>
          <p className="section-subtitle">Handpicked daily from our partner farms</p>
        </div>
        
        <div className="product-grid">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductGrid;
