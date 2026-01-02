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
 * @desc    Handle payment return from PayHere
 * @route   GET /api/payments/return
 * @access  Public
 */
// const handlePaymentReturn = async (req, res, next) => {
//   try {
//     const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

//     // Sanitize query params to handle arrays (take first/last or unique)
//     const getQueryParam = (param) => {
//       if (Array.isArray(param)) {
//         return param[0];
//       }
//       return param;
//     };

//     const payment_id = getQueryParam(req.query.payment_id);
//     const order_id = getQueryParam(req.query.order_id) || payment_id;
//     const status_code = getQueryParam(req.query.status_code);

//     console.log("=== PAYMENT RETURN HANDLER ===");
//     console.log("Query params (raw):", req.query);
//     console.log("Query params (sanitized):", {
//       order_id,
//       payment_id,
//       status_code,
//     });

//     // If we have status_code, process standard webhook logic
//     if (status_code && order_id) {
//       console.log("Processing payment notification (standard)...");
//       const webhookData = {
//         merchant_id: getQueryParam(req.query.merchant_id),
//         order_id: order_id,
//         payment_id: getQueryParam(req.query.payment_id),
//         payhere_amount: getQueryParam(req.query.payhere_amount),
//         payhere_currency: getQueryParam(req.query.payhere_currency),
//         status_code: status_code,
//         md5sig: getQueryParam(req.query.md5sig),
//         method: getQueryParam(req.query.method),
//       };

//       // Try validating normally
//       const validationResult = await paymentService.validatePayment(
//         webhookData
//       );

//       // If validation failed due to invalid hash, retry without md5 (fallback)
//       if (
//         !validationResult.success &&
//         validationResult.error &&
//         validationResult.error.toLowerCase().includes("invalid payment hash")
//       ) {
//         console.warn(
//           "Hash verification failed on return; retrying validation without md5 (manual return fallback)."
//         );
//         const fallbackData = {
//           ...webhookData,
//         };
//         const fallbackResult = await paymentService.validatePayment(
//           fallbackData
//         );
//         console.log("Fallback validation result:", fallbackResult);
//       }
//     } else if (order_id && !status_code) {
//       console.log(
//         "Processing payment return without status_code (Dev/Fallback flow)..."
//       );
//       const paymentCheck = await paymentService.getPaymentById(order_id);

//       if (paymentCheck.success && paymentCheck.payment) {
//         if (paymentCheck.payment.payment_status === "Pending") {
//           console.log(
//             "Payment is PENDING, assuming success from Return URL visit. Forcing validation..."
//           );
//           const mockSuccessData = {
//             merchant_id: process.env.PAYHERE_MERCHANT_ID || "",
//             order_id: order_id,
//             payment_id:
//               payment_id ||
//               paymentCheck.payment.transaction_id ||
//               "manual_verify",
//             payhere_amount: paymentCheck.payment.amount.toString(),
//             payhere_currency: "LKR",
//             status_code: "2", // Success
//             md5sig: "", // No hash check for manual
//             method: "visa",
//           };
//           await paymentService.validatePayment(mockSuccessData);
//         }
//       }
//     }

//     if (!order_id) {
//       console.error("No order_id/payment_id found in return URL");
//       res.redirect(`${frontendUrl}/payment/error`);
//       return res;
//     }

//     // Get the payment to check its status
//     const paymentResult = await paymentService.getPaymentById(order_id);

//     if (!paymentResult.success || !paymentResult.payment) {
//       console.log("Payment not found, redirecting to failed page");
//       res.redirect(`${frontendUrl}/payment/failed?payment_id=${order_id}`);
//       return res;
//     }

//     const payment = paymentResult.payment;
//     console.log("Payment status:", payment.payment_status);

//     // If payment still pending, attempt a safe forced validation (manual return) as a last resort
//     if (payment.payment_status === "Pending") {
//       try {
//         console.log(
//           "Payment still pending on return; attempting forced validation (manual_return_force)"
//         );
//         const forceResult = await paymentService.validatePayment({
//           merchant_id: process.env.PAYHERE_MERCHANT_ID || "",
//           order_id: order_id,
//           payment_id: payment.transaction_id || "",
//           payhere_amount: payment.amount.toString(),
//           payhere_currency: "LKR",
//           status_code: "2", // Force success
//           md5sig: "", // Skip hash
//           method: "manual_force",
//         });
//         console.log("Forced validation result:", forceResult);

//         // Re-fetch payment status after forced validation
//         const refreshed = await paymentService.getPaymentById(order_id);
//         if (refreshed.success && refreshed.payment) {
//           paymentResult = refreshed; // update local reference
//           payment.payment_status = refreshed.payment.payment_status;
//           payment.transaction_id =
//             refreshed.payment.transaction_id || payment.transaction_id;
//           console.log(
//             "Payment status after forced validation:",
//             payment.payment_status
//           );
//         }
//       } catch (forceErr) {
//         console.error("Error during forced validation attempt:", forceErr);
//       }
//     }

//     // Redirect based on payment status
//     if (payment.payment_status === "Completed" || status_code === "2") {
//       console.log("Redirecting to success page");
//       res.redirect(
//         `${frontendUrl}/payment/success?payment_id=${order_id}&transaction_id=${
//           payment.transaction_id || ""
//         }`
//       );
//     } else if (payment.payment_status === "Failed" || status_code === "-2") {
//       console.log("Redirecting to failed page");
//       res.redirect(`${frontendUrl}/payment/failed?payment_id=${order_id}`);
//     } else if (payment.payment_status === "Cancelled" || status_code === "-1") {
//       console.log("Redirecting to cancel page");
//       res.redirect(`${frontendUrl}/payment/cancel?payment_id=${order_id}`);
//     } else {
//       console.log("Payment status unclear, redirecting to pending page");
//       res.redirect(`${frontendUrl}/payment/pending?payment_id=${order_id}`);
//     }

//     return res;
//   } catch (err) {
//     console.error("Error in handlePaymentReturn:", err);
//     const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
//     res.redirect(`${frontendUrl}/payment/error`);
//     return res;
//   }
// };

/**
 * @desc    Handle payment cancellation from PayHere
 * @route   GET /api/payments/cancel
 * @access  Public
 */
// const handlePaymentCancel = async (req, res, next) => {
//   try {
//     const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
//     const { payment_id, order_id } = req.query;
//     const paymentId = order_id || payment_id;

//     console.log("=== PAYMENT CANCEL HANDLER ===");
//     console.log("Payment ID:", paymentId);

//     // Update payment and registration status to cancelled
//     if (paymentId) {
//       try {
//         console.log(
//           "Attempting to update payment/registration status to CANCELLED..."
//         );

//         // Simulate webhook cancellation by calling validatePayment with status_code -1
//         const result = await paymentService.validatePayment({
//           merchant_id: process.env.PAYHERE_MERCHANT_ID || "",
//           order_id: paymentId,
//           payment_id: "",
//           payhere_amount: "0",
//           payhere_currency: "LKR",
//           status_code: "-1", // -1 indicates cancelled
//           md5sig: "", // Not validating hash for manual cancellation
//           method: "manual_cancel",
//         });

//         console.log("Validation result:", result);

//         if (result.success) {
//           console.log(
//             `✓ Payment and Registration for payment_id ${paymentId} updated to CANCELLED`
//           );
//         } else {
//           console.error(`✗ Failed to update status: ${result.error}`);
//         }
//       } catch (error) {
//         console.error("Error updating payment/registration status:", error);
//         // Continue to redirect even if update fails
//       }
//     } else {
//       console.log("No payment_id provided in query");
//     }

//     console.log("Redirecting to cancel page...");
//     res.redirect(`${frontendUrl}/payment/cancel?payment_id=${paymentId || ""}`);
//     return res;
//   } catch (err) {
//     console.error("Error in handlePaymentCancel:", err);
//     const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
//     res.redirect(`${frontendUrl}/payment/error`);
//     return res;
//   }
// };

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
