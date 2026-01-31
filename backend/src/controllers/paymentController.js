const paymentService = require("../services/paymentService");

/**
 * @desc    Get all payments
 * @route   GET /api/payments
 * @access  Private
 */
const getPayments = async (req, res, next) => {
  try {
    const { tournament_id, registration_id, payment_status } = req.query;
    const query = {};

    if (tournament_id) query.tournament_id = tournament_id;
    if (registration_id) query.registration_id = registration_id;
    if (payment_status) query.payment_status = payment_status;

    const result = await paymentService.getAllPayments(query);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error || "No payments found",
      });
    }

    res.status(200).json({
      success: true,
      count: result.payments.length,
      data: result.payments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single payment
 * @route   GET /api/payments/:id
 * @access  Private
 */
const getPayment = async (req, res, next) => {
  try {
    const result = await paymentService.getPaymentById(req.params.id);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error || "Payment not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result.payment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create payment (PayHere integration)
 * @route   POST /api/payments
 * @access  Private
 */
const createPayment = async (req, res, next) => {
  try {
    const result = await paymentService.createPayment(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || "Failed to create payment",
      });
    }

    res.status(201).json({
      success: true,
      message: "Payment initiated",
      data: {
        payment: result.payment,
        payhere: result.requestObject,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    PayHere callback handler (webhook)
 * @route   POST /api/payments/payhere-callback
 * @access  Public
 */
const payhereCallback = async (req, res, next) => {
  try {
    console.log("=== PayHere Webhook Received ===");
    console.log("Request method:", req.method);
    console.log("Request body:", req.body);
    console.log("Request headers:", req.headers);

    // PayHere sends data as form-urlencoded, so we need to use req.body
    const result = await paymentService.validatePayment(req.body);

    // PayHere expects a simple response
    if (result.success) {
      console.log("✅ Payment validation successful, status updated");
      return res.status(200).send("OK");
    }

    // If validation failed, still return OK to PayHere (to avoid retries)
    // but log the error
    console.error("❌ Payment validation failed:", result.error);
    return res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Error in payhereCallback:", error);
    console.error("Error stack:", error.stack);
    // Still return OK to PayHere to avoid retries
    return res.status(200).send("OK");
  }
};


/**
 * @desc    Update payment
 * @route   PUT /api/payments/:id
 * @access  Private/Admin
 */
const updatePayment = async (req, res, next) => {
  try {
    const result = await paymentService.updatePayment(req.params.id, req.body);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error || "Payment not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment updated successfully",
      data: result.payment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check payment status
 * @route   GET /api/payments/:id/status
 * @access  Private
 */
const checkPaymentStatus = async (req, res, next) => {
  try {
    const result = await paymentService.checkPaymentStatus(req.params.id);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error || "Payment not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result.payment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete payment
 * @route   DELETE /api/payments/:id
 * @access  Private/Admin
 */
const deletePayment = async (req, res, next) => {
  try {
    const result = await paymentService.deletePayment(req.params.id);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error || "Payment not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Complete fake payment (TEMPORARY - for testing)
 * @route   POST /api/payments/:id/complete-fake
 * @access  Private
 */
const completeFakePayment = async (req, res, next) => {
  try {
    const payment = await paymentService.getPaymentById(req.params.id);

    if (!payment.success || !payment.payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Mark payment as completed using validatePayment
    const result = await paymentService.validatePayment({
      merchant_id: process.env.PAYHERE_MERCHANT_ID || "",
      order_id: req.params.id,
      payment_id: `FAKE_${Date.now()}`,
      payhere_amount: payment.payment.amount.toString(),
      payhere_currency: "LKR",
      status_code: "2", // Success
      md5sig: "", // No hash check for fake payment
      method: "card",
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || "Failed to complete payment",
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment completed successfully (FAKE - Testing Mode)",
      data: {
        payment: result.payment,
      },
    });
  } catch (error) {
    console.error("Error completing fake payment:", error);
    next(error);
  }
};

module.exports = {
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
};
