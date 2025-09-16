const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import required modules for Vercel serverless
const { parse } = require('url');

// Models
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  originalPrice: { type: Number, required: true },
  salePrice: { type: Number, required: true },
  category: { type: String, required: true },
  sizes: [{ type: String }],
  colors: [{ type: String }],
  images: [{ type: String, required: true }],
  isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false }
}, { timestamps: true });

const OrderSchema = new mongoose.Schema({
  customerInfo: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true }
  },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String,
    price: Number,
    quantity: Number,
    size: String,
    color: String
  }],
  totalAmount: { type: Number, required: true },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  }
}, { timestamps: true });

let Product, User, Order;
try {
  Product = mongoose.model('Product');
  User = mongoose.model('User');
  Order = mongoose.model('Order');
} catch {
  Product = mongoose.model('Product', ProductSchema);
  User = mongoose.model('User', UserSchema);
  Order = mongoose.model('Order', OrderSchema);
}

// Database connection
let cachedConnection = null;

const connectDB = async () => {
  if (cachedConnection) {
    return cachedConnection;
  }
  
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    cachedConnection = connection;
    return connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

module.exports = async (req, res) => {
  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await connectDB();
    const { pathname } = parse(req.url, true);
    console.log('API Request:', req.method, pathname);

    // Products endpoints
    if (pathname === '/api/products') {
      if (req.method === 'GET') {
        const products = await Product.find().sort({ createdAt: -1 });
        return res.json(products);
      }
      if (req.method === 'POST') {
        const { name, description, originalPrice, salePrice, category, sizes, colors, images } = req.body;
        const product = new Product({
          name, description, originalPrice: parseFloat(originalPrice),
          salePrice: parseFloat(salePrice), category, sizes: sizes || [],
          colors: colors || [], images: images || []
        });
        await product.save();
        return res.status(201).json(product);
      }
    }

    if (pathname === '/api/products/latest') {
      if (req.method === 'GET') {
        const latestProduct = await Product.findOne().sort({ createdAt: -1 });
        return res.json(latestProduct);
      }
    }

    // Product by ID endpoint
    if (pathname.match(/^\/api\/products\/[a-fA-F0-9]{24}$/)) {
      const productId = pathname.split('/').pop();
      if (req.method === 'GET') {
        const product = await Product.findById(productId);
        if (!product) {
          return res.status(404).json({ message: 'Product not found' });
        }
        return res.json(product);
      }
      if (req.method === 'PUT') {
        const updates = req.body;
        const product = await Product.findByIdAndUpdate(productId, updates, { new: true });
        if (!product) {
          return res.status(404).json({ message: 'Product not found' });
        }
        return res.json(product);
      }
      if (req.method === 'DELETE') {
        const product = await Product.findByIdAndDelete(productId);
        if (!product) {
          return res.status(404).json({ message: 'Product not found' });
        }
        return res.json({ message: 'Product deleted successfully' });
      }
    }

    // Product toggle availability endpoint
    if (pathname.match(/^\/api\/products\/[a-fA-F0-9]{24}\/toggle$/)) {
      const productId = pathname.split('/')[3];
      if (req.method === 'PUT') {
        const product = await Product.findById(productId);
        if (!product) {
          return res.status(404).json({ message: 'Product not found' });
        }
        product.isAvailable = !product.isAvailable;
        await product.save();
        return res.json(product);
      }
    }

    // Auth endpoints
    if (pathname === '/api/auth/login') {
      if (req.method === 'POST') {
        const { email, password } = req.body;
        let user = await User.findOne({ email });
        if (!user) {
          return res.status(400).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(400).json({ message: 'Invalid credentials' });
        }
        const payload = { user: { id: user.id, isAdmin: user.isAdmin } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' }, (err, token) => {
          if (err) throw err;
          res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin }
          });
        });
        return;
      }
    }

    // Orders endpoints
    if (pathname === '/api/orders') {
      if (req.method === 'GET') {
        const orders = await Order.find().sort({ createdAt: -1 });
        return res.json(orders);
      }
      if (req.method === 'POST') {
        const { customerInfo, items, totalAmount, shippingAddress } = req.body;
        const order = new Order({
          customerInfo, items, totalAmount: parseFloat(totalAmount),
          shippingAddress, status: 'pending'
        });
        await order.save();
        return res.status(201).json(order);
      }
    }

    // Order by ID endpoint
    if (pathname.match(/^\/api\/orders\/[a-fA-F0-9]{24}$/)) {
      const orderId = pathname.split('/').pop();
      if (req.method === 'GET') {
        const order = await Order.findById(orderId).populate('items.productId');
        if (!order) {
          return res.status(404).json({ message: 'Order not found' });
        }
        return res.json(order);
      }
      if (req.method === 'PUT') {
        const updates = req.body;
        const order = await Order.findByIdAndUpdate(orderId, updates, { new: true });
        if (!order) {
          return res.status(404).json({ message: 'Order not found' });
        }
        return res.json(order);
      }
    }

    // Categories endpoints
    if (pathname === '/api/categories') {
      if (req.method === 'GET') {
        const categories = await Product.distinct('category');
        return res.json(categories.map(cat => ({ name: cat, slug: cat.toLowerCase().replace(/\s+/g, '-') })));
      }
    }

    // Category products endpoint
    if (pathname.match(/^\/api\/categories\/[^\/]+\/products$/)) {
      const categorySlug = pathname.split('/')[3];
      const categoryName = categorySlug.replace(/-/g, ' ');
      if (req.method === 'GET') {
        const products = await Product.find({ 
          category: new RegExp(categoryName, 'i') 
        }).sort({ createdAt: -1 });
        return res.json(products);
      }
    }

    // Health check
    if (pathname === '/api/health') {
      return res.json({ 
        status: 'OK', 
        message: 'API is running',
        mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString()
      });
    }

    console.log('Route not found:', pathname);
    return res.status(404).json({ message: `Route not found: ${pathname}` });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
}
