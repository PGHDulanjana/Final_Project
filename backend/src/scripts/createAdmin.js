const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@gmail.com' });
    
    if (existingAdmin) {
      // Update existing admin password
      existingAdmin.password_hash = 'Admin@123';
      existingAdmin.user_type = 'Admin';
      existingAdmin.first_name = 'Admin';
      existingAdmin.last_name = 'User';
      existingAdmin.username = 'admin';
      existingAdmin.is_active = true;
      await existingAdmin.save();
      console.log('Admin account updated successfully!');
      console.log('Email: admin@gmail.com');
      console.log('Password: Admin@123');
    } else {
      // Create new admin user
      const admin = await User.create({
        username: 'admin',
        email: 'admin@gmail.com',
        password_hash: 'Admin@123',
        first_name: 'Admin',
        last_name: 'User',
        user_type: 'Admin',
        is_active: true
      });
      console.log('Admin account created successfully!');
      console.log('Email: admin@gmail.com');
      console.log('Password: Admin@123');
    }

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

createAdmin();

