import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container footer-content">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <span className="footer-logo-icon">🌿</span>
            <span className="footer-logo-text">FreshHarvest</span>
          </Link>
          <p className="footer-tagline">
            Farm-fresh organic vegetables delivered to your doorstep. Supporting local farmers since 2024.
          </p>
        </div>

        <div className="footer-links-group">
          <h4>Shop</h4>
          <ul>
            <li><Link to="/#shop">All Vegetables</Link></li>
            <li><Link to="/#shop">Seasonal Picks</Link></li>
            <li><Link to="/#shop">Organic Bundles</Link></li>
            <li><Link to="/#shop">Gift Boxes</Link></li>
          </ul>
        </div>

        <div className="footer-links-group">
          <h4>Company</h4>
          <ul>
            <li><Link to="/#about">About Us</Link></li>
            <li><Link to="/#farms">Our Farms</Link></li>
            <li><Link to="/#about">Sustainability</Link></li>
            <li><Link to="/#about">Careers</Link></li>
          </ul>
        </div>

        <div className="footer-links-group">
          <h4>Support</h4>
          <ul>
            <li><a href="#">Help Center</a></li>
            <li><a href="#">Delivery Info</a></li>
            <li><a href="#">Returns</a></li>
            <li><a href="#">Contact Us</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-content">
          <p>© 2024 FreshHarvest. All rights reserved.</p>
          <div className="footer-bottom-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
