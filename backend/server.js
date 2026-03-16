const express = require('express');
const cors = require('cors');
const https = require('https');
const PaytmChecksum = require('paytmchecksum');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

const supabase = require('./supabase');

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
const isAdmin = async (req, res, next) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('is_admin')
            .eq('id', req.user.id)
            .single();

        if (error || !user || user.is_admin !== true) {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        next();
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
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

        // Insert into Supabase
        const { data, error } = await supabase
            .from('users')
            .insert([
                { full_name: fullName, email: email, phone: phone, password_hash: passwordHash }
            ])
            .select();

        if (error) {
            if (error.code === '23505') { // Postgres UNIQUE constraint violation code
                return res.status(400).json({ success: false, message: 'Email already exists' });
            }
            console.error(error);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        const newUser = data[0];
        // Auto-login after registration
        const token = jwt.sign({ id: newUser.id, email }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ success: true, message: 'Registration successful', token });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (error || !user) {
        return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, message: 'Login successful', token, user: { id: user.id, name: user.full_name, email: user.email, is_admin: user.is_admin } });
});

// Forgot Password
app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

    if (userError || !user) {
        // We return success anyway to prevent email enumeration attacks
        return res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
    }

    // Generate a random token
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    const { error: updateError } = await supabase
        .from('users')
        .update({ reset_token: resetToken, reset_expiry: tokenExpiry.toISOString() })
        .eq('id', user.id);

    if (updateError) return res.status(500).json({ success: false, message: 'Database error' });

    const defaultFrontendUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5174';
    const resetLink = `${process.env.FRONTEND_URL || defaultFrontendUrl}/reset-password?token=${resetToken}`;
            
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

// Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
        return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }

    const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('reset_token', token)
        .gt('reset_expiry', new Date().toISOString())
        .single();

    if (userError || !user) {
        return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: passwordHash, reset_token: null, reset_expiry: null })
        .eq('id', user.id);

    if (updateError) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, message: 'Password has been successfully reset' });
});

// Get User Profile
app.get('/api/profile', authenticateToken, async (req, res) => {
    const { data: user, error } = await supabase
        .from('users')
        .select('id, full_name, email, phone, is_admin, created_at')
        .eq('id', req.user.id)
        .single();

    if (error || !user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
});

// Update Profile
app.put('/api/profile', authenticateToken, async (req, res) => {
    const { fullName, phone } = req.body;
    const { error } = await supabase
        .from('users')
        .update({ full_name: fullName, phone: phone })
        .eq('id', req.user.id);

    if (error) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, message: 'Profile updated successfully' });
});

// ==========================================
// ADDRESS ROUTES
// ==========================================

// Get all addresses for user
app.get('/api/addresses', authenticateToken, async (req, res) => {
    const { data: addresses, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', req.user.id)
        .order('is_default', { ascending: false })
        .order('id', { ascending: false });

    if (error) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, addresses });
});

// Add new address
app.post('/api/addresses', authenticateToken, async (req, res) => {
    const { addressLine, city, state, postalCode, isDefault } = req.body;
    
    try {
        if (isDefault) {
            await supabase
                .from('addresses')
                .update({ is_default: false })
                .eq('user_id', req.user.id);
        }

        const { data, error } = await supabase
            .from('addresses')
            .insert([
                { user_id: req.user.id, address_line: addressLine, city, state, postal_code: postalCode, is_default: isDefault }
            ])
            .select();

        if (error) return res.status(500).json({ success: false, message: 'Database error' });
        res.status(201).json({ success: true, message: 'Address added', addressId: data[0].id });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Edit address
app.put('/api/addresses/:id', authenticateToken, async (req, res) => {
    const { addressLine, city, state, postalCode, isDefault } = req.body;
    
    try {
        if (isDefault) {
            await supabase
                .from('addresses')
                .update({ is_default: false })
                .eq('user_id', req.user.id);
        }

        const { error } = await supabase
            .from('addresses')
            .update({ address_line: addressLine, city, state, postal_code: postalCode, is_default: isDefault })
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);

        if (error) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, message: 'Address updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Delete address
app.delete('/api/addresses/:id', authenticateToken, async (req, res) => {
    const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', req.params.id)
        .eq('user_id', req.user.id);

    if (error) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, message: 'Address deleted' });
});

// ==========================================
// PRODUCT ROUTES
// ==========================================

// Get all products (Public)
app.get('/api/products', async (req, res) => {
    const { category, search } = req.query;
    
    let query = supabase.from('products').select('*');
    
    if (category && category !== 'All') {
        query = query.eq('category', category);
    }
    
    if (search) {
        query = query.ilike('name', `%${search}%`);
    }

    const { data: products, error } = await query;
    if (error) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, products });
});

// Get single product (Public)
app.get('/api/products/:id', async (req, res) => {
    const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', req.params.id)
        .single();

    if (error || !product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
});

// ==========================================
// ADMIN ROUTES
// ==========================================

// --- Admin: Products ---

// Add a Product
app.post('/api/admin/products', authenticateToken, isAdmin, async (req, res) => {
    const { id, name, price, unit, category, description, image } = req.body;
    const { error } = await supabase
        .from('products')
        .insert([{ id, name, price, unit, category, description, image }]);

    if (error) return res.status(500).json({ success: false, message: error.message });
    res.status(201).json({ success: true, message: 'Product created' });
});

// Update a Product
app.put('/api/admin/products/:id', authenticateToken, isAdmin, async (req, res) => {
    const { name, price, unit, category, description, image } = req.body;
    const { error } = await supabase
        .from('products')
        .update({ name, price, unit, category, description, image })
        .eq('id', req.params.id);

    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Product updated' });
});

// Delete a Product
app.delete('/api/admin/products/:id', authenticateToken, isAdmin, async (req, res) => {
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', req.params.id);

    if (error) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, message: 'Product deleted' });
});

// --- Admin: Orders ---

// Get all orders (Admin)
app.get('/api/admin/orders', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                customer:users(full_name, email),
                items:order_items(*)
            `)
            .order('created_at', { ascending: false });

        if (error) return res.status(500).json({ success: false, message: 'Database error' });
        
        // Map data to match expected frontend structure if necessary
        const formattedOrders = orders.map(order => ({
            ...order,
            customer_name: order.customer?.full_name,
            customer_email: order.customer?.email
        }));

        res.json({ success: true, orders: formattedOrders });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update Order Status (Admin)
app.put('/api/admin/orders/:id/status', authenticateToken, isAdmin, async (req, res) => {
    const { status } = req.body;
    const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', req.params.id);

    if (error) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, message: 'Order status updated' });
});

// ==========================================
// ORDER ROUTES (HISTORY)
// ==========================================

app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                items:order_items(*)
            `)
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, orders });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ==========================================
// PAYTM CHECKOUT ROUTES
// ==========================================

// Initialize Payment Route
app.post('/api/payment/initiate', async (req, res) => {
    try {
        const { orderId, amount, items, customerName, customerEmail, customerPhone, address, userId } = req.body;

        // Pending Order Creation in Supabase before Paytm redirect
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert([
                { 
                    user_id: userId || null, 
                    tx_order_id: orderId, 
                    total_amount: amount, 
                    status: 'PENDING', 
                    address_line: address?.addressLine, 
                    city: address?.city, 
                    state: address?.state, 
                    postal_code: address?.postalCode 
                }
            ])
            .select();

        if (orderError) {
            console.error("Could not insert pending order:", orderError);
        } else {
            const dbOrder = orderData[0];
            // Insert items if dbOrder exists
            if (dbOrder && items && items.length > 0) {
                const orderItems = items.map(item => ({
                    order_id: dbOrder.id,
                    product_name: item.name,
                    price: item.price,
                    quantity: item.quantity
                }));
                const { error: itemsError } = await supabase
                    .from('order_items')
                    .insert(orderItems);
                if (itemsError) console.error("Could not insert order items:", itemsError);
            }
        }

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
app.post('/api/payment/callback', async (req, res) => {
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
    
    const defaultFrontendUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5174';
    const frontendUrl = process.env.FRONTEND_URL || defaultFrontendUrl;

    if (isVerifySignature) {
        if (paytmParams.STATUS === 'TXN_SUCCESS') {
            // Transaction is successful
            console.log('Payment Successful. TXN ID:', paytmParams.TXNID);
            
            // Update order status in database
            const { error: updateError } = await supabase
                .from('orders')
                .update({ status: 'PAID', payment_id: paytmParams.TXNID })
                .eq('tx_order_id', paytmParams.ORDERID);

            if (updateError) {
                console.error("Failed to update order status to PAID:", updateError);
            } else {
                // Fire Order Confirmation Email
                const { data: orderData, error: orderFetchError } = await supabase
                    .from('orders')
                    .select(`
                        *,
                        customer:users(email),
                        items:order_items(*)
                    `)
                    .eq('tx_order_id', paytmParams.ORDERID)
                    .single();

                if (!orderFetchError && orderData && transporter) {
                    const emailToSendTo = orderData.customer?.email || 'guest@example.com';
                    const itemsHtml = orderData.items.map(item => `<li>${item.quantity}x ${item.product_name} - ₹${item.price}</li>`).join('');
                    
                    const mailOptions = {
                        from: '"FreshHarvest Orders" <orders@freshharvest.local>',
                        to: emailToSendTo,
                        subject: `Order Confirmation #${orderData.id} - FreshHarvest`,
                        html: `
                            <h1>Thank you for your order!</h1>
                            <p>Your payment of <strong>₹${orderData.total_amount}</strong> has been received (Transaction ID: ${paytmParams.TXNID}).</p>
                            
                            <h3>Order Details:</h3>
                            <ul>
                                ${itemsHtml}
                            </ul>
                            
                            <h3>Delivery Address:</h3>
                            <p>
                                ${orderData.address_line}<br>
                                ${orderData.city}, ${orderData.state} ${orderData.postal_code}
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
            }

            // Redirect to Success Page with Order ID
            res.redirect(`${frontendUrl}/order-confirmation?orderId=${paytmParams.ORDERID}`);
        } else {
            // Transaction failed
            console.log('Payment Failed. TXN ID:', paytmParams.TXNID);
            
            await supabase
                .from('orders')
                .update({ status: 'FAILED' })
                .eq('tx_order_id', paytmParams.ORDERID);

            // Redirect to Failure Page
            res.redirect(`${frontendUrl}/payment-failed?orderId=${paytmParams.ORDERID}`);
        }
    } else {
        console.log("Checksum Mismatched");
        res.redirect(`${frontendUrl}/payment-failed?error=checksum_mismatch`);
    }
});

// Seeding logic for initial products
const seedProducts = async () => {
    try {
        const { count, error: countError } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error("Error checking products count:", countError);
            return;
        }

        if (count === 0) {
            console.log("Seeding initial products into Supabase...");
            const initialProducts = [
                { id: 'v1', name: 'Organic Heirloom Tomatoes', price: 4.99, unit: 'lb', category: 'Fruits & Veg', description: 'Vibrant, juicy, and bursting with rich, earthy flavor. Grown locally without synthetic pesticides.', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800' },
                { id: 'v2', name: 'Fresh English Cucumbers', price: 1.99, unit: 'each', category: 'Crisp & Cool', description: 'Seedless, thin-skinned, and perfectly crisp. Ideal for salads, snacking, or spa water.', image: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?auto=format&fit=crop&q=80&w=800' },
                { id: 'v3', name: 'Bundle of Asparagus', price: 3.49, unit: 'bunch', category: 'Spring Greens', description: 'Tender spears with a delicate crunch. Perfect roasted with garlic and olive oil.', image: 'https://images.unsplash.com/photo-1515471209610-dae1c92d8777?auto=format&fit=crop&q=80&w=800' },
                { id: 'v4', name: 'Crisp Romaine Lettuce', price: 2.29, unit: 'head', category: 'Greens', description: 'The foundation of a great Caesar salad. Crisp, sturdy leaves with a mild, sweet flavor.', image: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?auto=format&fit=crop&q=80&w=800' },
                { id: 'v5', name: 'Sweet Bell Peppers', price: 3.99, unit: 'pack', category: 'Peppers', description: 'A colorful mix of red, yellow, and orange peppers. Sweet, crunchy, and packed with Vitamin C.', image: '/bell-peppers.png' },
                { id: 'v6', name: 'Earthy Portobello Mushrooms', price: 5.49, unit: '8oz', category: 'Fungi', description: 'Rich, savory, and full of umami. A culinary favorite for stir-fries and luxurious risottos.', image: 'https://images.unsplash.com/photo-1504545102780-26774c1bb073?auto=format&fit=crop&q=80&w=800' }
            ];

            const { error: insertError } = await supabase
                .from('products')
                .insert(initialProducts);

            if (insertError) {
                console.error("Error seeding products:", insertError);
            } else {
                console.log("Seeding complete.");
            }
        }
    } catch (err) {
        console.error("Unexpected error during seeding:", err);
    }
};

app.listen(PORT, async () => {
    console.log(`Backend Server running on port ${PORT}`);
    await seedProducts();
});
