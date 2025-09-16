const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://abrahemelgazaly2:abrahem88@cluster0.vsqqvab.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  originalPrice: { type: Number, required: true },
  salePrice: { type: Number, required: true },
  category: { type: String, required: true, enum: ['t-shirt', 'pants', 'cap', 'zip-up', 'hoodies', 'polo shirts'] },
  sizes: [{ type: String }],
  colors: [{ type: String }],
  images: [{ type: String, required: true }],
  isAvailable: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

// Sample products data
const sampleProducts = [
  {
    name: 'Premium Cotton T-Shirt',
    description: 'High-quality cotton t-shirt perfect for everyday wear. Soft, comfortable, and durable.',
    originalPrice: 299,
    salePrice: 199,
    category: 't-shirt',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['White', 'Black', 'Gray', 'Navy Blue'],
    images: ['/hero.webp'],
    isAvailable: true
  },
  {
    name: 'Classic Denim Jeans',
    description: 'Comfortable denim jeans with a classic fit. Perfect for casual and semi-formal occasions.',
    originalPrice: 599,
    salePrice: 449,
    category: 'pants',
    sizes: ['28', '30', '32', '34', '36', '38'],
    colors: ['Blue', 'Black', 'Dark Blue'],
    images: ['/hero.webp'],
    isAvailable: true
  },
  {
    name: 'Baseball Cap',
    description: 'Stylish baseball cap with adjustable strap. Perfect for outdoor activities and casual wear.',
    originalPrice: 149,
    salePrice: 99,
    category: 'cap',
    sizes: ['One Size'],
    colors: ['Black', 'White', 'Red', 'Blue'],
    images: ['/hero.webp'],
    isAvailable: true
  },
  {
    name: 'Zip-up Hoodie',
    description: 'Warm and comfortable zip-up hoodie. Perfect for cool weather and layering.',
    originalPrice: 799,
    salePrice: 599,
    category: 'zip-up',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Gray', 'Black', 'Navy', 'Maroon'],
    images: ['/hero.webp'],
    isAvailable: true
  },
  {
    name: 'Cozy Pullover Hoodie',
    description: 'Super soft pullover hoodie with kangaroo pocket. Perfect for lounging and casual outings.',
    originalPrice: 699,
    salePrice: 499,
    category: 'hoodies',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Gray', 'Black', 'White', 'Green'],
    images: ['/hero.webp'],
    isAvailable: true
  },
  {
    name: 'Classic Polo Shirt',
    description: 'Elegant polo shirt perfect for business casual and smart casual occasions.',
    originalPrice: 399,
    salePrice: 299,
    category: 'polo shirts',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['White', 'Navy', 'Black', 'Light Blue'],
    images: ['/hero.webp'],
    isAvailable: true
  }
];

async function seedProducts() {
  try {
    console.log('Connected to MongoDB');
    
    // Clear existing products
    await Product.deleteMany({});
    console.log('Cleared existing products');
    
    // Insert sample products
    const products = await Product.insertMany(sampleProducts);
    console.log(`Added ${products.length} sample products to database`);
    
    console.log('Products seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding products:', error);
    process.exit(1);
  }
}

seedProducts();
