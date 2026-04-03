const mongoose = require('mongoose');

const connectDB = async () => {
  // MONGODB_URI is required
  if (!process.env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI is not set in environment variables');
    console.error('Please create a .env file with MONGODB_URI');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
