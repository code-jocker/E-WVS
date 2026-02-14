const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const seedUser = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for seeding...');

    const adminExists = await User.findOne({ email: 'admin@ewvs.com' });
    if (adminExists) {
      adminExists.password = 'admin123';
      await adminExists.save();
      console.log('Admin user password reset successfully');
    } else {
      await User.create({
        name: 'Super Admin',
        email: 'admin@ewvs.com',
        password: 'admin123',
        role: 'super-admin',
        phone: '1234567890'
      });
      console.log('Admin user created successfully');
    }

    console.log('Admin user created successfully');
    console.log('Email: admin@ewvs.com');
    console.log('Password: admin123');
    
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedUser();
