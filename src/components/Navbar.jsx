import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { totalItems, setIsCartOpen } = useCart();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (hash) => {
    setMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/' + hash);
    } else {
      window.location.hash = hash;
    }
  };

  return (
    <nav className="navbar glass-panel">
      <div className="container nav-content">
        <Link to="/" className="logo">
          <img src="/logo.png" alt="FreshHarvest" className="logo-img" />
          <span className="logo-text">FreshHarvest</span>
        </Link>

        <div className={`nav-links ${menuOpen ? 'nav-links--open' : ''}`}>
          <button className="nav-btn active" onClick={() => handleNavClick('#shop')}>Shop</button>
          <button className="nav-btn" onClick={() => handleNavClick('#about')}>About</button>
          <button className="nav-btn" onClick={() => handleNavClick('#farms')}>Our Farms</button>
          
          {user ? (
            <>
              {(user.is_admin === 1 || user.is_admin === true || String(user.is_admin) === '1') && (
                <Link to="/admin" className="nav-btn admin-link" onClick={() => setMenuOpen(false)}>Admin</Link>
              )}
              <Link to="/profile" className="nav-btn" style={{textDecoration: 'none', color: 'inherit'}} onClick={() => setMenuOpen(false)}>Profile</Link>
              <button className="nav-btn" onClick={() => { logout(); setMenuOpen(false); navigate('/'); }}>Logout</button>
            </>
          ) : (
            <Link to="/login" className="nav-btn" style={{textDecoration: 'none', color: 'inherit'}} onClick={() => setMenuOpen(false)}>Login</Link>
          )}
        </div>

        <div className="nav-actions">
          <button 
            className="cart-btn"
            onClick={() => setIsCartOpen(true)}
            aria-label="Open Cart"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
          </button>

          <button 
            className={`hamburger ${menuOpen ? 'hamburger--active' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle Menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
