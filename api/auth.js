const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// User Model
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false }
}, { timestamps: true });

let User;
try {
  User = mongoose.model('User');
} catch {
  User = mongoose.model('User', UserSchema);
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
    console.log('Auth API called:', req.method, req.url);

    // Handle different URL patterns for Vercel serverless
    const url = req.url || '';
    // Remove /api/auth prefix for serverless routing
    const apiPath = url.replace(/^\/api\/auth\/?/, '');
    const pathParts = apiPath.split('/').filter(Boolean);
    
    // POST /api/auth/login - User login
    if (req.method === 'POST' && pathParts[0] === 'login') {
      const { email, password } = req.body;
      
      console.log('Login attempt for email:', email);
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      let user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const payload = { user: { id: user.id, isAdmin: user.isAdmin } };
      
      return new Promise((resolve, reject) => {
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' }, (err, token) => {
          if (err) {
            console.error('JWT sign error:', err);
            return res.status(500).json({ message: 'Token generation failed' });
          }
          
          console.log('Login successful for user:', user.email);
          res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin }
          });
          resolve();
        });
      });
    }

    // POST /api/auth/register - User registration
    if (req.method === 'POST' && pathParts[0] === 'register') {
      const { name, email, password, isAdmin } = req.body;
      
      console.log('Registration attempt for email:', email);
      
      if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email and password are required' });
      }

      // Check if user already exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user
      user = new User({
        name,
        email,
        password: hashedPassword,
        isAdmin: isAdmin || false
      });

      await user.save();
      console.log('User registered successfully:', user.email);

      const payload = { user: { id: user.id, isAdmin: user.isAdmin } };
      
      return new Promise((resolve, reject) => {
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' }, (err, token) => {
          if (err) {
            console.error('JWT sign error:', err);
            return res.status(500).json({ message: 'Token generation failed' });
          }
          
          res.status(201).json({
            token,
            user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin }
          });
          resolve();
        });
      });
    }

    return res.status(404).json({ message: 'Route not found' });
  } catch (error) {
    console.error('Auth API Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
