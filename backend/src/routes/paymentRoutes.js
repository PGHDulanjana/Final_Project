const express = require('express');
const router = express.Router();
const {
  getPayments,
  getPayment,
  createPayment,
  payhereCallback,
  updatePayment,
  completeFakePayment
} = require('../controllers/paymentController');
const authenticate = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.get('/', authenticate, getPayments);
router.get('/:id', authenticate, getPayment);
router.post('/', authenticate, createPayment);
router.post('/payhere-callback', payhereCallback); // Public endpoint for PayHere
router.put('/:id', authenticate, roleMiddleware('Admin'), updatePayment);

// TEMPORARY: Fake payment completion endpoint (for testing)
router.post('/:id/complete-fake', authenticate, completeFakePayment);

module.exports = router;

