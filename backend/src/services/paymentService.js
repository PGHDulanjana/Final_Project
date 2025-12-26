const Payment = require('../models/Payment');
const Registration = require('../models/Registration');
const Tournament = require('../models/Tournament');
const { generateHash, verifyNotificationHash } = require('../utils/payhere');

// Generate PayHere payment hash (uses payhere.js utility)
// Wrapper function to maintain backward compatibility
const generatePayHereHash = (orderId, amount) => {
  // Convert amount to string if it's a number (payhere.js accepts string)
  const amountString = typeof amount === 'number' ? amount.toString() : amount;
  return generateHash(orderId, amountString);
};

// Verify PayHere callback (uses payhere.js utility)
// Wrapper function to map snake_case parameters to camelCase
const verifyPayHereCallback = (data) => {
  const {
    merchant_id,
    order_id,
    payhere_amount,
    payhere_currency,
    status_code,
    md5sig
  } = data;

  // Map snake_case to camelCase for payhere.js function
  return verifyNotificationHash({
    merchantId: merchant_id,
    orderId: order_id,
    payhereAmount: payhere_amount,
    payhereCurrency: payhere_currency,
    statusCode: status_code,
    md5sig: md5sig
  });
};

// Process payment callback
const processPaymentCallback = async (paymentData) => {
  try {
    if (!verifyPayHereCallback(paymentData)) {
      throw new Error('Invalid payment signature');
    }

    const payment = await Payment.findById(paymentData.order_id);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (paymentData.status_code === '2') {
      payment.payment_status = 'Completed';
      payment.payment_date = new Date();
      await payment.save();

      // Update registration
      const registration = await Registration.findById(payment.registration_id);
      if (registration) {
        registration.payment_status = 'Paid';
        await registration.save();
      }

      return { success: true, payment };
    } else {
      payment.payment_status = 'Failed';
      await payment.save();
      return { success: false, payment };
    }
  } catch (error) {
    throw error;
  }
};

// Get payment statistics
const getPaymentStats = async (tournamentId) => {
  try {
    const totalPayments = await Payment.countDocuments({ tournament_id: tournamentId });
    const completedPayments = await Payment.countDocuments({
      tournament_id: tournamentId,
      payment_status: 'Completed'
    });
    const totalAmount = await Payment.aggregate([
      { $match: { tournament_id: tournamentId, payment_status: 'Completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    return {
      totalPayments,
      completedPayments,
      pendingPayments: totalPayments - completedPayments,
      totalAmount: totalAmount.length > 0 ? totalAmount[0].total : 0
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  generatePayHereHash,
  verifyPayHereCallback,
  processPaymentCallback,
  getPaymentStats
};

