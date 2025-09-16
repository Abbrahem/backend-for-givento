const mongoose = require('mongoose');

// Order Model - Updated to match frontend cart structure
const OrderSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  alternatePhone: { type: String },
  customerAddress: { type: String, required: true },
  items: [{
    product: { type: String, required: true }, // Product ID
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    size: { type: String, required: true },
    color: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String }
  }],
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  }
}, { timestamps: true });

let Order;
try {
  Order = mongoose.model('Order');
} catch {
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
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await connectDB();
    console.log('Orders API called:', req.method, req.url);

    // Handle different URL patterns for Vercel serverless
    const url = req.url || '';
    console.log('Full URL received:', url);
    
    // Remove query parameters and clean the URL
    const cleanUrl = url.split('?')[0];
    // Remove /api/orders prefix for serverless routing
    const apiPath = cleanUrl.replace(/^\/api\/orders\/?/, '');
    const pathParts = apiPath.split('/').filter(Boolean);
    console.log('Path parts after cleaning:', pathParts);
    
    // GET /api/orders - Get all orders
    if (req.method === 'GET' && pathParts.length === 0) {
      const orders = await Order.find().sort({ createdAt: -1 });
      console.log(`Found ${orders.length} orders`);
      
      // Ensure we always return an array
      if (!Array.isArray(orders)) {
        return res.json([]);
      }
      
      return res.json(orders);
    }

    // GET /api/orders/:id - Get order by ID
    if (req.method === 'GET' && pathParts.length === 1) {
      const orderId = pathParts[0];
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({ message: 'Invalid order ID' });
      }
      
      const order = await Order.findById(orderId).populate('items.productId');
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      return res.json(order);
    }

    // PUT /api/orders/:id - Update order
    if (req.method === 'PUT' && pathParts.length === 1) {
      const orderId = pathParts[0];
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({ message: 'Invalid order ID' });
      }
      
      const updates = req.body;
      const order = await Order.findByIdAndUpdate(orderId, updates, { new: true });
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      return res.json(order);
    }

    // POST /api/orders - Create new order
    if (req.method === 'POST' && pathParts.length === 0) {
      const { customerName, customerPhone, alternatePhone, customerAddress, items, totalAmount } = req.body;
      
      console.log('Creating order with data:', { customerName, customerPhone, items: items?.length, totalAmount });
      
      if (!customerName || !customerPhone || !customerAddress || !items || items.length === 0) {
        return res.status(400).json({ message: 'Customer name, phone, address and items are required' });
      }

      const order = new Order({
        customerName,
        customerPhone,
        alternatePhone: alternatePhone || '',
        customerAddress,
        items,
        totalAmount: parseFloat(totalAmount),
        status: 'pending'
      });

      await order.save();
      console.log('Order created successfully:', order._id);
      return res.status(201).json(order);
    }

    return res.status(404).json({ message: 'Route not found' });
  } catch (error) {
    console.error('Orders API Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
