import { useSearchParams, Link } from 'react-router-dom';

const PaymentFailed = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const error = searchParams.get('error');

  return (
    <div className="container" style={{ padding: '120px 2rem', textAlign: 'center', minHeight: '60vh' }}>
      <h1 style={{ color: '#EF4444', fontSize: '3rem', marginBottom: '1rem' }}>Payment Failed</h1>
      <p style={{ fontSize: '1.2rem', color: 'var(--color-text-light)' }}>
        We couldn't process your payment right now. Please try again.
      </p>
      {error && <p style={{ color: '#EF4444' }}>Reason: {error.replace('_', ' ')}</p>}
      {orderId && (
        <div style={{ margin: '2rem 0', padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', display: 'inline-block' }}>
          <strong>Order ID:</strong> {orderId}
        </div>
      )}
      <div style={{ marginTop: '2rem' }}>
        <Link to="/" className="btn btn-primary" style={{ backgroundColor: '#EF4444' }}>Try Again</Link>
      </div>
    </div>
  );
};

export default PaymentFailed;
