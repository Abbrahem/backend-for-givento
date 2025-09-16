const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/givento', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', async () => {
  console.log('Connected to MongoDB');
  
  try {
    // Clear existing products for testing
    await Product.deleteMany({});
    console.log('Cleared existing products');
    
    // Add sample products with placeholder images
    const sampleProducts = [
      {
        name: 'تيشيرت قطني أبيض',
        description: 'تيشيرت قطني عالي الجودة باللون الأبيض، مريح ومناسب لجميع المناسبات',
        originalPrice: 200,
        salePrice: 150,
        category: 'تيشيرتات',
        sizes: ['S', 'M', 'L', 'XL'],
        colors: ['أبيض', 'أسود', 'أزرق'],
        images: ['/uploads/placeholder-tshirt-1.jpg'],
        isAvailable: true
      },
      {
        name: 'هودي شتوي رمادي',
        description: 'هودي دافئ ومريح مناسب للطقس البارد، مصنوع من أجود الخامات',
        originalPrice: 350,
        salePrice: 280,
        category: 'هوديز',
        sizes: ['M', 'L', 'XL', 'XXL'],
        colors: ['رمادي', 'أسود', 'أزرق داكن'],
        images: ['/uploads/placeholder-hoodie-1.jpg'],
        isAvailable: true
      },
      {
        name: 'كاب رياضي أسود',
        description: 'كاب رياضي عملي وأنيق، مناسب للأنشطة الرياضية والاستخدام اليومي',
        originalPrice: 80,
        salePrice: 60,
        category: 'إكسسوارات',
        sizes: ['One Size'],
        colors: ['أسود', 'أبيض', 'أحمر'],
        images: ['/uploads/placeholder-cap-1.jpg'],
        isAvailable: true
      }
    ];
    
    for (const productData of sampleProducts) {
      const product = new Product(productData);
      await product.save();
      console.log(`Added product: ${product.name}`);
    }
    
    console.log('Sample products added successfully!');
    
    // Test fetching products
    const products = await Product.find();
    console.log(`\nTotal products in database: ${products.length}`);
    
    products.forEach(product => {
      console.log(`- ${product.name}: ${product.images.length} images`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
});
