const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password_hash: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  first_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  last_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[0-9]{10,15}$/, 'Please enter a valid phone number']
  },
  date_of_birth: {
    type: Date
  },
  gender: {
    type: String,
    enum: {
      values: ['Male', 'Female', 'Other'],
      message: 'Gender must be Male, Female, or Other'
    },
    default: undefined, // Use undefined instead of null to avoid enum validation
    required: false,
    sparse: true // Allows multiple documents to have undefined gender
  },
  profile_picture: {
    type: String,
    default: null
  },
  user_type: {
    type: String,
    required: true,
    enum: ['Admin', 'Player', 'Judge', 'Coach', 'Organizer'],
    default: 'Player'
  },
  is_active: {
    type: Boolean,
    default: true
  },
  resetPasswordOTP: {
    type: String,
    select: false
  },
  resetPasswordOTPExpire: {
    type: Date,
    select: false
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password_hash')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password_hash = await bcrypt.hash(this.password_hash, salt);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password_hash);
};

module.exports = mongoose.model('User', userSchema);

