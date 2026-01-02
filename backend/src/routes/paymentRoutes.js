const express = require("express");
const router = express.Router();
const {
  getPayments,
  getPayment,
  createPayment,
  payhereCallback,
  // handlePaymentReturn,
  // handlePaymentCancel,
  updatePayment,
  checkPaymentStatus,
  deletePayment,
  completeFakePayment,
} = require("../controllers/paymentController");
const authenticate = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

// Public routes (for PayHere callbacks and redirects)
router.post("/payment-notify", payhereCallback); // Webhook endpoint for PayHere
// router.get('/return', handlePaymentReturn); // Return URL handler
// router.get('/cancel', handlePaymentCancel); // Cancel URL handler

// Protected routes
router.get("/", authenticate, getPayments);
router.get("/:id", authenticate, getPayment);
router.get("/:id/status", authenticate, checkPaymentStatus);
router.post("/", authenticate, createPayment);
router.put("/:id", authenticate, roleMiddleware("Admin"), updatePayment);
router.delete("/:id", authenticate, roleMiddleware("Admin"), deletePayment);

// TEMPORARY: Fake payment completion endpoint (for testing)
router.post("/:id/complete-fake", authenticate, completeFakePayment);

module.exports = router;
