import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const OrderConfirmation = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { clearCart } = useCart();

  useEffect(() => {
    // Clear the cart when landing on the success page
    clearCart();
    // In a real app, you would also mark the order as paid in the DB here or via webhook
  }, [clearCart]);

  return (
    <div className="container" style={{ padding: '120px 2rem', textAlign: 'center', minHeight: '60vh' }}>
      <h1 style={{ color: 'var(--color-primary-dark)', fontSize: '3rem', marginBottom: '1rem' }}>🎉 Payment Successful!</h1>
      <p style={{ fontSize: '1.2rem', color: 'var(--color-text-light)' }}>
        Thank you for your purchase. Your payment was successfully processed via Paytm.
      </p>
      {orderId && (
        <div style={{ margin: '2rem 0', padding: '1.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', display: 'inline-block' }}>
          <strong>Order ID:</strong> {orderId}
        </div>
      )}
      <div style={{ marginTop: '2rem' }}>
        <Link to="/" className="btn btn-primary">Return to Shop</Link>
      </div>
    </div>
  );
};

export default OrderConfirmation;
