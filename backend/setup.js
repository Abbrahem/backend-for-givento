const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
require('dotenv').config();

const setupDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/givento', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Create default admin user
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (!existingAdmin) {
      const admin = new User({
        username: 'admin',
        password: 'admin123', // This will be hashed automatically
        role: 'admin'
      });
      await admin.save();
      console.log('Default admin user created: username=admin, password=admin123');
    } else {
      console.log('Admin user already exists');
    }

    // Create sample categories
    const categories = [
      { name: 'T-Shirts', image: '/hero.webp', description: 'تيشيرتات عصرية وأنيقة' },
      { name: 'Hoodies', image: '/hero.webp', description: 'هوديز مريحة ودافئة' },
      { name: 'Pants', image: '/hero.webp', description: 'بناطيل عملية وأنيقة' },
      { name: 'Polo Shirts', image: '/hero.webp', description: 'قمصان بولو كلاسيكية' },
      { name: 'Caps', image: '/hero.webp', description: 'قبعات عصرية' },
      { name: 'Zip-up', image: '/hero.webp', description: 'جاكيتات بسحاب أنيقة' }
    ];

    for (const categoryData of categories) {
      const existingCategory = await Category.findOne({ name: categoryData.name });
      if (!existingCategory) {
        const category = new Category(categoryData);
        await category.save();
        console.log(`Category created: ${categoryData.name}`);
      }
    }

    console.log('Database setup completed successfully!');
    console.log('\nYou can now:');
    console.log('1. Access the admin dashboard at: http://localhost:3000/admin/login');
    console.log('2. Login with username: admin, password: admin123');
    console.log('3. Start adding products and managing your store');

  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    mongoose.connection.close();
  }
};

setupDatabase();
