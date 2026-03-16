import './InfoSection.css';

const InfoSection = () => {
  return (
    <div className="info-sections">
      <section id="about" className="info-section glass-panel">
        <div className="container info-container">
          <div className="info-content">
            <h2>About FreshHarvest</h2>
            <p>
              Founded in 2024, FreshHarvest was born out of a simple idea: everyone deserves access to fresh, healthy, and organic produce. We bypass the long supply chains of traditional grocery stores to bring vegetables directly from the earth to your table. 
            </p>
            <p>
              Our mission is to support sustainable agriculture, reduce food miles, and help our community eat better. Every bundle of asparagus or pint of tomatoes you purchase supports local ecosystems and farming families.
            </p>
          </div>
          <div className="info-image">
            <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800" alt="Fresh vegetables at a market" loading="lazy" />
          </div>
        </div>
      </section>

      <section id="farms" className="info-section">
        <div className="container info-container reverse">
          <div className="info-content">
            <h2>Our Partner Farms</h2>
            <p>
              We don't just buy vegetables; we partner with the people who grow them. Our network consists of over 50 small to medium-sized family farms located within a 100-mile radius of our fulfillment centers.
            </p>
            <p>
              Before partnering with a farm, we personally visit their fields to ensure they meet our strict organic and ethical labor standards. No synthetic pesticides, no cutting corners—just honest, hard work and beautiful produce.
            </p>
          </div>
          <div className="info-image">
            <img src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=800" alt="Farmer in a field" loading="lazy" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default InfoSection;
