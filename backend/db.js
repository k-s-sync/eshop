const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Define schemas
        db.serialize(() => {
            // Users Table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT,
                password_hash TEXT NOT NULL,
                is_admin BOOLEAN DEFAULT 0,
                reset_token TEXT,
                reset_expiry DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Addresses Table
            db.run(`CREATE TABLE IF NOT EXISTS addresses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                address_line TEXT NOT NULL,
                city TEXT NOT NULL,
                state TEXT NOT NULL,
                postal_code TEXT NOT NULL,
                is_default BOOLEAN DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`);

            // Orders Table
            db.run(`CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                tx_order_id TEXT UNIQUE NOT NULL,
                total_amount REAL NOT NULL,
                status TEXT DEFAULT 'PENDING',
                address_line TEXT,
                city TEXT,
                state TEXT,
                postal_code TEXT,
                payment_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
            )`);

            // Order Items Table
            db.run(`CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_name TEXT NOT NULL,
                price REAL NOT NULL,
                quantity INTEGER NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
            )`);
            
            // Products Table (Store Inventory)
            db.run(`CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                unit TEXT,
                category TEXT,
                description TEXT,
                image TEXT
            )`);
            
            console.log('Database tables verified/created successfuly.');

            // Seed initial products if empty
            db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
                if (err) {
                    console.error("Error checking products count:", err);
                } else if (row.count === 0) {
                    console.log("Seeding initial products into database...");
                    const stmt = db.prepare(`INSERT INTO products (id, name, price, unit, category, description, image) VALUES (?, ?, ?, ?, ?, ?, ?)`);
                    const seedProducts = [
                        ['v1', 'Organic Heirloom Tomatoes', 4.99, 'lb', 'Fruits & Veg', 'Vibrant, juicy, and bursting with rich, earthy flavor. Grown locally without synthetic pesticides.', 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800'],
                        ['v2', 'Fresh English Cucumbers', 1.99, 'each', 'Crisp & Cool', 'Seedless, thin-skinned, and perfectly crisp. Ideal for salads, snacking, or spa water.', 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?auto=format&fit=crop&q=80&w=800'],
                        ['v3', 'Bundle of Asparagus', 3.49, 'bunch', 'Spring Greens', 'Tender spears with a delicate crunch. Perfect roasted with garlic and olive oil.', 'https://images.unsplash.com/photo-1515471209610-dae1c92d8777?auto=format&fit=crop&q=80&w=800'],
                        ['v4', 'Crisp Romaine Lettuce', 2.29, 'head', 'Greens', 'The foundation of a great Caesar salad. Crisp, sturdy leaves with a mild, sweet flavor.', 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?auto=format&fit=crop&q=80&w=800'],
                        ['v5', 'Sweet Bell Peppers', 3.99, 'pack', 'Peppers', 'A colorful mix of red, yellow, and orange peppers. Sweet, crunchy, and packed with Vitamin C.', '/bell-peppers.png'],
                        ['v6', 'Earthy Portobello Mushrooms', 5.49, '8oz', 'Fungi', 'Rich, savory, and full of umami. A culinary favorite for stir-fries and luxurious risottos.', 'https://images.unsplash.com/photo-1504545102780-26774c1bb073?auto=format&fit=crop&q=80&w=800']
                    ];
                    
                    seedProducts.forEach(p => stmt.run(p));
                    stmt.finalize();
                    console.log("Seeding complete.");
                }
            });
        });
    }
});

module.exports = db;
