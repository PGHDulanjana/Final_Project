const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  logout,
  forgotPassword,
  verifyOTP,
  resetPassword,
  registerAdmin
} = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../validations/userValidation');
const validateRequest = require('../middlewares/validateRequest');
const authenticate = require('../middlewares/authMiddleware');

router.post('/register', registerValidation, validateRequest, register);
router.post('/register-admin', registerValidation, validateRequest, registerAdmin);
router.post('/login', loginValidation, validateRequest, login);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

module.exports = router;

