const mongoose = require('mongoose');

// Product Model (for category operations)
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
    console.log('Categories API called:', req.method, req.url);

    // Simple approach - just return categories for any GET request
    if (req.method === 'GET') {
      try {
        const categories = await Product.distinct('category');
        const categoryList = categories.map(cat => ({ 
          name: cat, 
          slug: cat.toLowerCase().replace(/\s+/g, '-') 
        }));
        console.log(`Found ${categoryList.length} categories:`, categoryList);
        return res.status(200).json(categoryList);
      } catch (dbError) {
        console.error('Database error in categories:', dbError);
        // Return empty array if no products exist yet
        return res.status(200).json([]);
      }
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Categories API Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
