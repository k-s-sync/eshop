const express = require('express');
const cors = require('cors');
const https = require('https');
const PaytmChecksum = require('paytmchecksum');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_freshharvest';

// Nodemailer Ethereal Transport (Testing only)
let transporter;
nodemailer.createTestAccount((err, account) => {
    if (err) {
        console.error('Failed to create Ethereal testing account', err);
        return;
    }
    transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
            user: account.user,
            pass: account.pass
        }
    });
    console.log('Nodemailer configured for testing with Ethereal');
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ success: false, message: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: 'Token invalid or expired' });
        req.user = user;
        next();
    });
};

// Admin Middleware
const isAdmin = (req, res, next) => {
    db.get(`SELECT is_admin FROM users WHERE id = ?`, [req.user.id], (err, user) => {
        if (err || !user || user.is_admin !== 1) {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        next();
    });
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Paytm callback uses urlencoded form data

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// Register User
app.post('/api/auth/register', async (req, res) => {
    try {
        const { fullName, email, phone, password } = req.body;
        
        // Basic validation
        if (!fullName || !email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide all required fields' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert into DB
        db.run(`INSERT INTO users (full_name, email, phone, password_hash) VALUES (?, ?, ?, ?)`, 
            [fullName, email, phone, passwordHash], 
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ success: false, message: 'Email already exists' });
                    }
                    console.error(err);
                    return res.status(500).json({ success: false, message: 'Database error' });
                }
                
                // Auto-login after registration
                const token = jwt.sign({ id: this.lastID, email }, JWT_SECRET, { expiresIn: '7d' });
                res.status(201).json({ success: true, message: 'Registration successful', token });
            }
        );
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Login User
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, message: 'Login successful', token, user: { id: user.id, name: user.full_name, email: user.email, is_admin: user.is_admin } });
    });
});

// Forgot Password
app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    
    db.get(`SELECT id FROM users WHERE email = ?`, [email], (err, user) => {
        if (err || !user) {
            // We return success anyway to prevent email enumeration attacks
            return res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
        }

        // Generate a random token
        const resetToken = require('crypto').randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

        db.run(`UPDATE users SET reset_token = ?, reset_expiry = ? WHERE id = ?`, [resetToken, tokenExpiry.toISOString(), user.id], function(err) {
            if (err) return res.status(500).json({ success: false, message: 'Database error' });

            const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/reset-password?token=${resetToken}`;
            
            const mailOptions = {
                from: '"FreshHarvest Admin" <admin@freshharvest.local>',
                to: email,
                subject: 'Password Reset Request',
                text: `You requested a password reset. Click this link to reset your password: ${resetLink} \n\nIf you did not request this, please ignore this email.`,
                html: `<p>You requested a password reset.</p><p>Click this link to reset your password: <a href="${resetLink}">${resetLink}</a></p><p>If you did not request this, please ignore this email.</p>`
            };

            if (transporter) {
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        return console.log(error);
                    }
                    console.log('Password Reset preview URL: %s', nodemailer.getTestMessageUrl(info));
                });
            }

            res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
        });
    });
});

// Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
        return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }

    db.get(`SELECT id FROM users WHERE reset_token = ? AND reset_expiry > ?`, [token, new Date().toISOString()], async (err, user) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        db.run(`UPDATE users SET password_hash = ?, reset_token = NULL, reset_expiry = NULL WHERE id = ?`, [passwordHash, user.id], function(err) {
            if (err) return res.status(500).json({ success: false, message: 'Database error' });
            res.json({ success: true, message: 'Password has been successfully reset' });
        });
    });
});

// Get User Profile
app.get('/api/profile', authenticateToken, (req, res) => {
    db.get(`SELECT id, full_name, email, phone, is_admin, created_at FROM users WHERE id = ?`, [req.user.id], (err, user) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, user });
    });
});

// Update Profile
app.put('/api/profile', authenticateToken, (req, res) => {
    const { fullName, phone } = req.body;
    db.run(`UPDATE users SET full_name = ?, phone = ? WHERE id = ?`, [fullName, phone, req.user.id], function(err) {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, message: 'Profile updated successfully' });
    });
});

// ==========================================
// ADDRESS ROUTES
// ==========================================

// Get all addresses for user
app.get('/api/addresses', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC`, [req.user.id], (err, addresses) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, addresses });
    });
});

// Add new address
app.post('/api/addresses', authenticateToken, (req, res) => {
    const { addressLine, city, state, postalCode, isDefault } = req.body;
    
    // If setting as default, unset other defaults first
    const insertAddress = () => {
        db.run(`INSERT INTO addresses (user_id, address_line, city, state, postal_code, is_default) VALUES (?, ?, ?, ?, ?, ?)`,
            [req.user.id, addressLine, city, state, postalCode, isDefault ? 1 : 0],
            function(err) {
                if (err) return res.status(500).json({ success: false, message: 'Database error' });
                res.status(201).json({ success: true, message: 'Address added', addressId: this.lastID });
            }
        );
    };

    if (isDefault) {
        db.run(`UPDATE addresses SET is_default = 0 WHERE user_id = ?`, [req.user.id], function(err) {
            if (err) return res.status(500).json({ success: false, message: 'Database error' });
            insertAddress();
        });
    } else {
        insertAddress();
    }
});

// Edit address
app.put('/api/addresses/:id', authenticateToken, (req, res) => {
    const { addressLine, city, state, postalCode, isDefault } = req.body;
    
    // If setting as default, unset other defaults first
    const updateAddress = () => {
        db.run(`UPDATE addresses SET address_line = ?, city = ?, state = ?, postal_code = ?, is_default = ? WHERE id = ? AND user_id = ?`,
            [addressLine, city, state, postalCode, isDefault ? 1 : 0, req.params.id, req.user.id],
            function(err) {
                if (err) return res.status(500).json({ success: false, message: 'Database error' });
                if (this.changes === 0) return res.status(404).json({ success: false, message: 'Address not found or unauthorized' });
                res.json({ success: true, message: 'Address updated' });
            }
        );
    };

    if (isDefault) {
        db.run(`UPDATE addresses SET is_default = 0 WHERE user_id = ?`, [req.user.id], function(err) {
            if (err) return res.status(500).json({ success: false, message: 'Database error' });
            updateAddress();
        });
    } else {
        updateAddress();
    }
});

// Delete address
app.delete('/api/addresses/:id', authenticateToken, (req, res) => {
    db.run(`DELETE FROM addresses WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id], function(err) {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, message: 'Address deleted' });
    });
});

// ==========================================
// PRODUCT ROUTES
// ==========================================

// Get all products (Public)
app.get('/api/products', (req, res) => {
    const { category, search } = req.query;
    
    let query = `SELECT * FROM products WHERE 1=1`;
    let params = [];
    
    if (category && category !== 'All') {
        query += ` AND category = ?`;
        params.push(category);
    }
    
    if (search) {
        query += ` AND name LIKE ?`;
        params.push(`%${search}%`);
    }

    db.all(query, params, (err, products) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, products });
    });
});

// Get single product (Public)
app.get('/api/products/:id', (req, res) => {
    db.get(`SELECT * FROM products WHERE id = ?`, [req.params.id], (err, product) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        res.json({ success: true, product });
    });
});

// ==========================================
// ADMIN ROUTES
// ==========================================

// --- Admin: Products ---

// Add a Product
app.post('/api/admin/products', authenticateToken, isAdmin, (req, res) => {
    const { id, name, price, unit, category, description, image } = req.body;
    db.run(`INSERT INTO products (id, name, price, unit, category, description, image) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, name, price, unit, category, description, image],
        function(err) {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.status(201).json({ success: true, message: 'Product created' });
        }
    );
});

// Update a Product
app.put('/api/admin/products/:id', authenticateToken, isAdmin, (req, res) => {
    const { name, price, unit, category, description, image } = req.body;
    db.run(`UPDATE products SET name = ?, price = ?, unit = ?, category = ?, description = ?, image = ? WHERE id = ?`,
        [name, price, unit, category, description, image, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ success: false, message: err.message });
            if (this.changes === 0) return res.status(404).json({ success: false, message: 'Product not found' });
            res.json({ success: true, message: 'Product updated' });
        }
    );
});

// Delete a Product
app.delete('/api/admin/products/:id', authenticateToken, isAdmin, (req, res) => {
    db.run(`DELETE FROM products WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, message: 'Product deleted' });
    });
});

// --- Admin: Orders ---

// Get all orders (Admin)
app.get('/api/admin/orders', authenticateToken, isAdmin, (req, res) => {
    const query = `
        SELECT orders.*, users.full_name as customer_name, users.email as customer_email 
        FROM orders 
        LEFT JOIN users ON orders.user_id = users.id 
        ORDER BY orders.created_at DESC
    `;
    
    db.all(query, [], (err, orders) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        
        if (orders.length === 0) return res.json({ success: true, orders: [] });
        
        let processedOrders = 0;
        orders.forEach(order => {
            db.all(`SELECT * FROM order_items WHERE order_id = ?`, [order.id], (err, items) => {
                order.items = items || [];
                processedOrders++;
                if (processedOrders === orders.length) {
                    res.json({ success: true, orders });
                }
            });
        });
    });
});

// Update Order Status (Admin)
app.put('/api/admin/orders/:id/status', authenticateToken, isAdmin, (req, res) => {
    const { status } = req.body;
    db.run(`UPDATE orders SET status = ? WHERE id = ?`, [status, req.params.id], function(err) {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (this.changes === 0) return res.status(404).json({ success: false, message: 'Order not found' });
        res.json({ success: true, message: 'Order status updated' });
    });
});

// ==========================================
// ORDER ROUTES (HISTORY)
// ==========================================

app.get('/api/orders', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`, [req.user.id], (err, orders) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        
        // Map order items to each order
        if (orders.length === 0) return res.json({ success: true, orders: [] });
        
        let processedOrders = 0;
        orders.forEach(order => {
            db.all(`SELECT * FROM order_items WHERE order_id = ?`, [order.id], (err, items) => {
                order.items = items || [];
                processedOrders++;
                if (processedOrders === orders.length) {
                    res.json({ success: true, orders });
                }
            });
        });
    });
});

// ==========================================
// PAYTM CHECKOUT ROUTES
// ==========================================

// Initialize Payment Route
app.post('/api/payment/initiate', async (req, res) => {
    try {
        const { orderId, amount, items, customerName, customerEmail, customerPhone, address, userId } = req.body;

        // Pending Order Creation in DB before Paytm redirect
        db.run(`INSERT INTO orders (user_id, tx_order_id, total_amount, status, address_line, city, state, postal_code) 
                VALUES (?, ?, ?, 'PENDING', ?, ?, ?, ?)`,
            [userId || null, orderId, amount, address?.addressLine, address?.city, address?.state, address?.postalCode],
            function(err) {
                if (err) console.error("Could not insert pending order:", err);
                const dbOrderId = this ? this.lastID : null;
                
                // Insert items if dbOrderId exists
                if (dbOrderId && items && items.length > 0) {
                    items.forEach(item => {
                        db.run(`INSERT INTO order_items (order_id, product_name, price, quantity) VALUES (?, ?, ?, ?)`,
                            [dbOrderId, item.name, item.price, item.quantity]
                        );
                    });
                }
            }
        );

        const paytmParams = {};
        
        // Prepare Paytm Request Body
        paytmParams.body = {
            "requestType": "Payment",
            "mid": process.env.PAYTM_MERCHANT_ID,
            "websiteName": process.env.PAYTM_WEBSITE,
            "orderId": orderId,
            "callbackUrl": process.env.PAYTM_CALLBACK_URL,
            "txnAmount": {
                "value": amount.toString(),
                "currency": "INR",
            },
            "userInfo": {
                "custId": customerEmail || 'GUEST_CUST',
                "firstName": customerName,
                "email": customerEmail,
                "mobile": customerPhone
            }
        };

        // Generate Checksum using Paytm library
        const checksum = await PaytmChecksum.generateSignature(
            JSON.stringify(paytmParams.body), 
            process.env.PAYTM_MERCHANT_KEY
        );

        paytmParams.head = { "signature": checksum };
        const post_data = JSON.stringify(paytmParams);

        const options = {
            hostname: process.env.PAYTM_ENVIRONMENT,
            port: 443,
            path: `/theia/api/v1/initiateTransaction?mid=${process.env.PAYTM_MERCHANT_ID}&orderId=${orderId}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': post_data.length
            }
        };

        // Request token from Paytm
        let response = "";
        const post_req = https.request(options, function (post_res) {
            post_res.on('data', function (chunk) {
                response += chunk;
            });

            post_res.on('end', function () {
                const result = JSON.parse(response);
                if (result.body.resultInfo.resultStatus === "S") {
                    res.json({
                        success: true,
                        txnToken: result.body.txnToken,
                        orderId: orderId,
                        mid: process.env.PAYTM_MERCHANT_ID
                    });
                } else {
                    res.status(400).json({ 
                        success: false, 
                        message: result.body.resultInfo.resultMsg 
                    });
                }
            });
        });

        post_req.write(post_data);
        post_req.end();

    } catch (error) {
        console.error("Payment Initiation Error:", error);
        res.status(500).json({ success: false, message: 'Server error generating token' });
    }
});

// Paytm Callback handling Payment Status
app.post('/api/payment/callback', (req, res) => {
    const paytmParams = req.body;
    
    // Extract Checksum Hash
    const paytmChecksum = paytmParams.CHECKSUMHASH;
    delete paytmParams.CHECKSUMHASH;

    // Verify Signature
    const isVerifySignature = PaytmChecksum.verifySignature(
        paytmParams, 
        process.env.PAYTM_MERCHANT_KEY, 
        paytmChecksum
    );
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';

    if (isVerifySignature) {
        if (paytmParams.STATUS === 'TXN_SUCCESS') {
            // Transaction is successful
            console.log('Payment Successful. TXN ID:', paytmParams.TXNID);
            
            // Update order status in database
            db.run(`UPDATE orders SET status = 'PAID', payment_id = ? WHERE tx_order_id = ?`, 
                [paytmParams.TXNID, paytmParams.ORDERID], 
                function(err) {
                    if (err) {
                        console.error("Failed to update order status to PAID:", err);
                        return;
                    }

                    // Fire Order Confirmation Email
                    db.get(`
                        SELECT o.*, u.email as user_email 
                        FROM orders o 
                        LEFT JOIN users u ON o.user_id = u.id 
                        WHERE o.tx_order_id = ?
                    `, [paytmParams.ORDERID], (err, order) => {
                        if (!err && order && transporter) {
                            
                            // Get the actual email (either attached to the order or the user account)
                            const emailToSendTo = order.user_email || 'guest@example.com';
                            
                            if (emailToSendTo) {
                                db.all(`SELECT * FROM order_items WHERE order_id = ?`, [order.id], (err, items) => {
                                    if (!err && items) {
                                        const itemsHtml = items.map(item => `<li>${item.quantity}x ${item.product_name} - ₹${item.price}</li>`).join('');
                                        
                                        const mailOptions = {
                                            from: '"FreshHarvest Orders" <orders@freshharvest.local>',
                                            to: emailToSendTo,
                                            subject: `Order Confirmation #${order.id} - FreshHarvest`,
                                            html: `
                                                <h1>Thank you for your order!</h1>
                                                <p>Your payment of <strong>₹${order.total_amount}</strong> has been received (Transaction ID: ${paytmParams.TXNID}).</p>
                                                
                                                <h3>Order Details:</h3>
                                                <ul>
                                                    ${itemsHtml}
                                                </ul>
                                                
                                                <h3>Delivery Address:</h3>
                                                <p>
                                                    ${order.address_line}<br>
                                                    ${order.city}, ${order.state} ${order.postal_code}
                                                </p>
                                                
                                                <p>We are preparing your fresh vegetables for delivery!</p>
                                            `
                                        };
                            
                                        transporter.sendMail(mailOptions, (error, info) => {
                                            if (!error) {
                                                console.log('Order Confirmation preview URL: %s', nodemailer.getTestMessageUrl(info));
                                            }
                                        });
                                    }
                                });
                            }
                        }
                    });
                }
            );

            // Redirect to Success Page with Order ID
            res.redirect(`${frontendUrl}/order-confirmation?orderId=${paytmParams.ORDERID}`);
        } else {
            // Transaction failed
            console.log('Payment Failed. TXN ID:', paytmParams.TXNID);
            
            db.run(`UPDATE orders SET status = 'FAILED' WHERE tx_order_id = ?`, [paytmParams.ORDERID]);

            // Redirect to Failure Page
            res.redirect(`${frontendUrl}/payment-failed?orderId=${paytmParams.ORDERID}`);
        }
    } else {
        console.log("Checksum Mismatched");
        res.redirect(`${frontendUrl}/payment-failed?error=checksum_mismatch`);
    }
});

app.listen(PORT, () => {
    console.log(`Backend Server running on port ${PORT}`);
});
