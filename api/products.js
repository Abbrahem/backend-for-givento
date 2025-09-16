const mongoose = require('mongoose');

// Product Model
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

let Product;
try {
  Product = mongoose.model('Product');
} catch {
  Product = mongoose.model('Product', ProductSchema);
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
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await connectDB();
    console.log('Products API called:', req.method, req.url);

    // Handle different URL patterns for Vercel serverless
    const url = req.url || '';
    console.log('Full URL received:', url);
    
    // Remove query parameters and clean the URL
    const cleanUrl = url.split('?')[0];
    // Remove /api/products prefix for serverless routing
    const apiPath = cleanUrl.replace(/^\/api\/products\/?/, '');
    const pathParts = apiPath.split('/').filter(Boolean);
    console.log('Path parts after cleaning:', pathParts);
    
    // GET /api/products - Get all products
    if (req.method === 'GET' && pathParts.length === 0) {
      const products = await Product.find().sort({ createdAt: -1 });
      console.log(`Found ${products.length} products`);
      
      // Ensure we always return an array
      if (!Array.isArray(products)) {
        return res.json([]);
      }
      
      return res.json(products);
    }

    // GET /api/products/latest - Get latest product
    if (req.method === 'GET' && pathParts[0] === 'latest') {
      const latestProduct = await Product.findOne().sort({ createdAt: -1 });
      return res.json(latestProduct);
    }

    // GET /api/products/:id - Get product by ID
    if (req.method === 'GET' && pathParts.length === 1 && pathParts[0] !== 'latest') {
      const productId = pathParts[0];
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }
      
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      return res.json(product);
    }

    // PUT /api/products/:id/toggle - Toggle product availability
    if (req.method === 'PUT' && pathParts.length === 2 && pathParts[1] === 'toggle') {
      const productId = pathParts[0];
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }
      
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      product.isAvailable = !product.isAvailable;
      await product.save();
      return res.json(product);
    }

    // PUT /api/products/:id - Update product
    if (req.method === 'PUT' && pathParts.length === 1) {
      const productId = pathParts[0];
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }
      
      const updates = req.body;
      const product = await Product.findByIdAndUpdate(productId, updates, { new: true });
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      return res.json(product);
    }

    // DELETE /api/products/:id - Delete product
    if (req.method === 'DELETE' && pathParts.length === 1) {
      const productId = pathParts[0];
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }
      
      const product = await Product.findByIdAndDelete(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      return res.json({ message: 'Product deleted successfully' });
    }

    // POST /api/products - Create new product
    if (req.method === 'POST' && pathParts.length === 0) {
      const { name, description, originalPrice, salePrice, category, sizes, colors, images } = req.body;
      
      console.log('Creating product with data:', { name, category, images: images?.length });
      
      if (!images || images.length === 0) {
        return res.status(400).json({ message: 'At least one image is required' });
      }

      const product = new Product({
        name,
        description,
        originalPrice: parseFloat(originalPrice),
        salePrice: parseFloat(salePrice),
        category,
        sizes: sizes || [],
        colors: colors || [],
        images: images || []
      });

      await product.save();
      console.log('Product created successfully:', product._id);
      return res.status(201).json(product);
    }

    return res.status(404).json({ message: 'Route not found' });
  } catch (error) {
    console.error('Products API Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
}
