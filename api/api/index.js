const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
    const { url, method } = req;
    console.log('API Request:', method, url);

    // Health check
    if (url === '/api' || url === '/api/' || url === '/') {
      return res.json({ 
        status: 'OK', 
        message: 'Givento API is running',
        mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString(),
        endpoints: [
          'GET /api/health',
          'GET /api/products',
          'GET /api/products/latest',
          'GET /api/categories',
          'POST /api/auth/login',
          'GET /api/orders'
        ]
      });
    }

    // Parse request body for POST/PUT requests
    if (method === 'POST' || method === 'PUT') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      await new Promise(resolve => {
        req.on('end', () => {
          try {
            req.body = JSON.parse(body);
          } catch (e) {
            req.body = {};
          }
          resolve();
        });
      });
    }

    // Products endpoints
    if (url === '/api/products') {
      if (method === 'GET') {
        const products = await Product.find().sort({ createdAt: -1 });
        return res.json(products);
      }
      if (method === 'POST') {
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

    if (url === '/api/products/latest') {
      if (method === 'GET') {
        const latestProduct = await Product.findOne().sort({ createdAt: -1 });
        return res.json(latestProduct);
      }
    }

    // Product by ID endpoint
    if (url.match(/^\/api\/products\/[a-fA-F0-9]{24}$/)) {
      const productId = url.split('/').pop();
      if (method === 'GET') {
        const product = await Product.findById(productId);
        if (!product) {
          return res.status(404).json({ message: 'Product not found' });
        }
        return res.json(product);
      }
      if (method === 'PUT') {
        const updates = req.body;
        const product = await Product.findByIdAndUpdate(productId, updates, { new: true });
        if (!product) {
          return res.status(404).json({ message: 'Product not found' });
        }
        return res.json(product);
      }
      if (method === 'DELETE') {
        const product = await Product.findByIdAndDelete(productId);
        if (!product) {
          return res.status(404).json({ message: 'Product not found' });
        }
        return res.json({ message: 'Product deleted successfully' });
      }
    }

    // Auth endpoints
    if (url === '/api/auth/login') {
      if (method === 'POST') {
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
    if (url === '/api/orders') {
      if (method === 'GET') {
        const orders = await Order.find().sort({ createdAt: -1 });
        return res.json(orders);
      }
      if (method === 'POST') {
        const { customerInfo, items, totalAmount, shippingAddress } = req.body;
        const order = new Order({
          customerInfo, items, totalAmount: parseFloat(totalAmount),
          shippingAddress, status: 'pending'
        });
        await order.save();
        return res.status(201).json(order);
      }
    }

    // Categories endpoints
    if (url === '/api/categories') {
      if (method === 'GET') {
        const categories = await Product.distinct('category');
        return res.json(categories.map(cat => ({ name: cat, slug: cat.toLowerCase().replace(/\s+/g, '-') })));
      }
    }

    // Category products endpoint
    if (url.match(/^\/api\/categories\/[^\/]+\/products$/)) {
      const categorySlug = url.split('/')[3];
      const categoryName = categorySlug.replace(/-/g, ' ');
      if (method === 'GET') {
        const products = await Product.find({ 
          category: new RegExp(categoryName, 'i') 
        }).sort({ createdAt: -1 });
        return res.json(products);
      }
    }

    // Health check
    if (url === '/api/health') {
      return res.json({ 
        status: 'OK', 
        message: 'API is running',
        mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString()
      });
    }

    console.log('Route not found:', url);
    return res.status(404).json({ message: `Route not found: ${url}` });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
}
