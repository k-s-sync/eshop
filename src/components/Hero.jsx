import './Hero.css';

const Hero = () => {
  return (
    <section className="hero">
      <div className="hero-bg"></div>
      <div className="container hero-content">
        <span className="hero-badge glass-panel">Farm to Table</span>
        <h1 className="hero-title">
          Fresh Organic <br/>
          <span className="highlight">Vegetables</span> Delivered
        </h1>
        <p className="hero-subtitle">
          Experience the crisp crunch of locally sourced, pesticide-free produce 
          brought directly from our fields to your front door.
        </p>
        <button className="btn btn-primary hero-btn">
          Shop Fresh Produce
        </button>
      </div>
    </section>
  );
};

export default Hero;
