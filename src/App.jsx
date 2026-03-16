import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import CartSidebar from './components/CartSidebar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import OrderConfirmation from './pages/OrderConfirmation';
import PaymentFailed from './pages/PaymentFailed';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfileDashboard from './pages/ProfileDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <div className="app">
            <Navbar />
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/order-confirmation" element={<OrderConfirmation />} />
                <Route path="/payment-failed" element={<PaymentFailed />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/profile" element={<ProfileDashboard />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
              </Routes>
            </main>
            <Footer />
            <CartSidebar />
          </div>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
