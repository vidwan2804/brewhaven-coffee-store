// ==================== DEPENDENCIES ====================
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// ==================== CONFIGURATION ====================
const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/coffee-ecommerce';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// ==================== DATABASE CONNECTION ====================
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));


// ==================== MONGOOSE SCHEMAS ====================

// User Schema
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: ['customer', 'admin'],
        default: 'customer'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function() {
    if (!this.isModified('password')) return;

    this.password = await bcrypt.hash(this.password, 10);
});


// Product Schema
const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    category: {
        type: String,
        required: true,
        enum: ['Single Origin', 'Blend', 'Decaf']
    },
    description: {
        type: String,
        required: true
    },
    image: {
        type: String,
        default: '☕'
    },
    stock: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    rating: {
        type: Number,
        min: 0,
        max: 5,
        default: 4.5
    },
    roast: {
        type: String,
        enum: ['Light', 'Medium', 'Dark'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Order Schema
const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        name: String,
        price: Number,
        quantity: {
            type: Number,
            required: true,
            min: 1
        }
    }],
    total: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    shippingAddress: {
        name: String,
        address: String,
        city: String,
        zipCode: String
    },
    paymentInfo: {
        cardNumber: String // Only last 4 digits
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// ==================== MODELS ====================
const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);

// ==================== AUTHENTICATION MIDDLEWARE ====================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Admin middleware
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }
        
        // Create new user
        const user = new User({ name, email, password });
        await user.save();
        
        // Generate token
        const token = jwt.sign(
            { _id: user._id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            token
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        // Generate token
        const token = jwt.sign(
            { _id: user._id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            token
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== PRODUCT ROUTES ====================

// Get all products with filters
app.get('/api/products', async (req, res) => {
    try {
        const { category, roast, search, limit } = req.query;
        let query = {};
        
        if (category && category !== 'All') {
            query.category = category;
        }
        
        if (roast && roast !== 'All') {
            query.roast = roast;
        }
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        let productsQuery = Product.find(query);
        
        if (limit) {
            productsQuery = productsQuery.limit(parseInt(limit));
        }
        
        const products = await productsQuery.sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create product (Admin only)
app.post('/api/products', authenticateToken, isAdmin, async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update product (Admin only)
app.put('/api/products/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete product (Admin only)
app.delete('/api/products/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== ORDER ROUTES ====================

// Create order
app.post('/api/orders', authenticateToken, async (req, res) => {
    try {
        const orderData = {
            ...req.body,
            userId: req.user._id
        };
        
        const order = new Order(orderData);
        await order.save();
        
        // Update product stock
        for (const item of order.items) {
            await Product.findByIdAndUpdate(
                item.productId,
                { $inc: { stock: -item.quantity } }
            );
        }
        
        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get user orders
app.get('/api/orders/user/:userId', authenticateToken, async (req, res) => {
    try {
        // Ensure user can only see their own orders (unless admin)
        if (req.user._id !== req.params.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const orders = await Order.find({ userId: req.params.userId })
            .sort({ createdAt: -1 })
            .populate('userId', 'name email');
        
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all orders (Admin only)
app.get('/api/orders', authenticateToken, isAdmin, async (req, res) => {
    try {
        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .populate('userId', 'name email');
        
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update order status (Admin only)
app.patch('/api/orders/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== ADMIN ROUTES ====================

// Get dashboard statistics
app.get('/api/admin/stats', authenticateToken, isAdmin, async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalCustomers = await User.countDocuments({ role: 'customer' });
        
        const orders = await Order.find();
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        
        res.json({
            totalRevenue,
            totalOrders,
            totalProducts,
            totalCustomers
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== SEED DATA ROUTE (Development Only) ====================
app.post('/api/seed', async (req, res) => {
    try {
        // Clear existing data
        await User.deleteMany({});
        await Product.deleteMany({});
        await Order.deleteMany({});
        
        // Create admin user
        const adminUser = new User({
            name: 'Admin User',
            email: 'admin@coffee.com',
            password: 'admin123',
            role: 'admin'
        });
        await adminUser.save();
        
        // Create regular user
        const regularUser = new User({
            name: 'John Doe',
            email: 'user@coffee.com',
            password: 'user123',
            role: 'customer'
        });
        await regularUser.save();
        
        // Create products
        const products = [
            { name: 'Ethiopian Yirgacheffe', price: 18.99, category: 'Single Origin', description: 'Bright, floral notes with hints of blueberry', image: '☕', stock: 50, rating: 4.8, roast: 'Light' },
            { name: 'Colombian Supremo', price: 16.99, category: 'Single Origin', description: 'Rich, smooth with caramel sweetness', image: '☕', stock: 45, rating: 4.6, roast: 'Medium' },
            { name: 'Sumatra Mandheling', price: 19.99, category: 'Single Origin', description: 'Full-bodied, earthy with chocolate notes', image: '☕', stock: 30, rating: 4.7, roast: 'Dark' },
            { name: 'House Blend', price: 14.99, category: 'Blend', description: 'Balanced and smooth, perfect for everyday', image: '☕', stock: 100, rating: 4.5, roast: 'Medium' },
            { name: 'Espresso Roast', price: 17.99, category: 'Blend', description: 'Bold and intense, ideal for espresso', image: '☕', stock: 60, rating: 4.9, roast: 'Dark' },
            { name: 'Decaf Colombian', price: 15.99, category: 'Decaf', description: 'All the flavor, none of the caffeine', image: '☕', stock: 40, rating: 4.3, roast: 'Medium' },
            { name: 'French Roast', price: 16.99, category: 'Blend', description: 'Smoky and bold with a robust finish', image: '☕', stock: 55, rating: 4.7, roast: 'Dark' },
            { name: 'Breakfast Blend', price: 13.99, category: 'Blend', description: 'Light and crisp, perfect morning start', image: '☕', stock: 75, rating: 4.4, roast: 'Light' }
        ];
        
        await Product.insertMany(products);
        
        res.json({ message: 'Database seeded successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Seed error', error: error.message });
    }
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api`);
    console.log(`🌱 Seed database: POST http://localhost:${PORT}/api/seed`);
});

// ==================== GRACEFUL SHUTDOWN ====================
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await mongoose.connection.close();
    process.exit(0);
});