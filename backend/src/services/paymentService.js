const Payment = require("../models/Payment");
const Registration = require("../models/Registration");
const Tournament = require("../models/Tournament");
const User = require("../models/User");
const Player = require("../models/Player");
const {
  generateHash,
  verifyNotificationHash,
  createPaymentRequest,
  singelLineAddress,
} = require("../utils/payhere");
const { sendEmail } = require("../utils/emailService");
const TournamentCategory = require("../models/TournamentCategory");

/**
 * Generate PayHere payment hash (uses payhere.js utility)
 * Wrapper function to maintain backward compatibility
 */
const generatePayHereHash = (orderId, amount) => {
  // Convert amount to string if it's a number (payhere.js accepts string)
  const amountString = typeof amount === "number" ? amount.toString() : amount;
  return generateHash(orderId, amountString);
};

/**
 * Verify PayHere callback (uses payhere.js utility)
 * Wrapper function to map snake_case parameters to camelCase
 */
const verifyPayHereCallback = (data) => {
  const {
    merchant_id,
    order_id,
    payhere_amount,
    payhere_currency,
    status_code,
    md5sig,
  } = data;

  // Map snake_case to camelCase for payhere.js function
  return verifyNotificationHash({
    merchantId: merchant_id,
    orderId: order_id,
    payhereAmount: payhere_amount,
    payhereCurrency: payhere_currency,
    statusCode: status_code,
    md5sig: md5sig,
  });
};

/**
 * Creates a payment record and generates a PayHere payment request object
 * @param {Object} data - Payment data including registration_id or tournament/category/player info
 * @returns {Promise<{success: boolean, payment?: any, requestObject?: any, error?: string}>}
 */
const createPayment = async (data) => {
  try {
    const {
      registration_id,
      tournament_id,
      category_id,
      player_id,
      coach_id,
      amount,
      transaction_method,
      returnUrl,
      cancelUrl,
    } = data;

    let registration = null;
    let tournament = null;
    let category = null;
    let eventFee = 0;

    // If registration_id is provided, use existing registration flow
    if (registration_id) {
      registration = await Registration.findById(registration_id)
        .populate("tournament_id")
        .populate("player_id")
        .populate("category_id");

      if (!registration) {
        return { success: false, error: "Registration not found" };
      }

      tournament = registration.tournament_id;
      category = registration.category_id;

      // Determine fee based on participation type
      if (category) {
        if (registration.registration_type === "Individual") {
          eventFee = category.individual_player_fee || 0;
        } else if (registration.registration_type === "Team") {
          eventFee = category.team_event_fee || 0;
        }
      }

      // Check for existing pending payment for this registration to prevent duplicates
      const existingPayment = await Payment.findOne({
        registration_id: registration_id,
        payment_status: "Pending",
      }).sort({ createdAt: -1 }); // Get the most recent pending payment

      if (existingPayment) {
        console.log(
          `Found existing pending payment ${existingPayment._id} for registration ${registration_id}, reusing it`
        );
        // Reuse existing payment and regenerate PayHere request object
        const playerId =
          player_id || registration.player_id?._id || registration.player_id;
        const player = await Player.findById(playerId).populate("user_id");
        if (!player || !player.user_id) {
          return {
            success: false,
            error:
              "User information not found. Please ensure the player is properly linked to a user.",
          };
        }

        const firstName = player.user_id.first_name || "User";
        const lastName = player.user_id.last_name || "Name";
        const email = player.user_id.email || "customer@example.com";
        const phone = player.user_id.phone || "0000000000";

        const frontendBaseUrl =
          process.env.FRONTEND_URL || "http://localhost:3000";
        const returnUrlWithPaymentId =
          returnUrl ||
          `${frontendBaseUrl}/payment/success?payment_id=${existingPayment._id}`;
        const cancelUrlWithPaymentId =
          cancelUrl ||
          `${frontendBaseUrl}/payment/cancel?payment_id=${existingPayment._id}`;

        // Validate notify URL - must be publicly accessible (not localhost)
        let notifyUrl = process.env.PAYHERE_NOTIFY;

        let requestObject;
        try {
          requestObject = createPaymentRequest({
            orderId: existingPayment._id.toString(),
            amount: existingPayment.amount,
            currency: "LKR",
            description: `Tournament Registration - ${tournament.tournament_name}`,
            customerInfo: {
              firstName: firstName,
              lastName: lastName,
              email: email,
              phone: phone,
              address: "Address not provided",
              city: "Colombo",
              country: "Sri Lanka",
            },
            returnUrl: returnUrlWithPaymentId,
            cancelUrl: cancelUrlWithPaymentId,
            notifyUrl: notifyUrl,
          });
          console.log("PayHere request object:", requestObject);
        } catch (error) {
          console.error("Error creating PayHere request:", error);
          return {
            success: false,
            error: `Failed to create payment request: ${error.message}`,
          };
        }

        return { success: true, payment: existingPayment, requestObject };
      }
      // If no existing payment found, continue to create new payment below
      console.log(
        `No existing pending payment found for registration ${registration_id}, creating new payment`
      );
    } else {
      // New flow: Payment first, then registration
      if (!tournament_id || !category_id || !player_id) {
        return {
          success: false,
          error:
            "tournament_id, category_id, and player_id are required when registration_id is not provided",
        };
      }

      tournament = await Tournament.findById(tournament_id);
      if (!tournament) {
        return { success: false, error: "Tournament not found" };
      }

      category = await TournamentCategory.findById(category_id);
      if (!category) {
        return { success: false, error: "Event (category) not found" };
      }

      // Verify category belongs to tournament
      const catTournamentId =
        category.tournament_id?._id || category.tournament_id;
      if (
        catTournamentId &&
        catTournamentId.toString() !== tournament_id.toString()
      ) {
        return {
          success: false,
          error: "Event does not belong to the selected tournament",
        };
      }

      // Get fee based on participation type
      if (category.participation_type === "Individual") {
        eventFee = category.individual_player_fee || 0;
      } else {
        eventFee = category.team_event_fee || 0;
      }
    }

    // Generate unique transaction ID
    const transaction_id = `TXN${Date.now()}${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;

    // Create payment record
    const paymentData = {
      registration_id: registration?._id || null,
      tournament_id: tournament._id,
      category_id: category._id,
      player_id:
        player_id ||
        registration?.player_id?._id ||
        registration?.player_id ||
        null,
      coach_id: coach_id || null,
      amount: amount || eventFee,
      transaction_method: transaction_method || "PayHere",
      transaction_id,
      payment_gateway: "PayHere",
      payment_status: "Pending",
    };

    console.log("Creating payment record with data:", {
      registration_id: paymentData.registration_id,
      tournament_id: paymentData.tournament_id,
      category_id: paymentData.category_id,
      player_id: paymentData.player_id,
      amount: paymentData.amount,
    });

    const payment = await Payment.create(paymentData);
    if (!payment) {
      console.error("Payment.create() returned null/undefined");
      return { success: false, error: "Failed to create payment" };
    }

    console.log(`Payment record created successfully: ${payment._id}`);

    // Get user information for PayHere request
    let user = null;
    if (player_id || registration?.player_id) {
      const playerId =
        player_id || registration.player_id?._id || registration.player_id;
      const player = await Player.findById(playerId).populate("user_id");
      if (player && player.user_id) {
        user = player.user_id;
      }
    }

    if (!user) {
      return {
        success: false,
        error:
          "User information not found. Please ensure the player is properly linked to a user.",
      };
    }

    // Prepare customer info for PayHere
    const firstName = user.first_name || "User";
    const lastName = user.last_name || "Name";
    const email = user.email || "customer@example.com";
    const phone = user.phone || "0000000000";

    // Get frontend base URL from environment or use default
    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    // IMPORTANT: Return and Cancel URLs must be publicly accessible frontend URLs
    // PayHere will redirect users to these URLs after payment
    // For localhost development, you need to use ngrok or similar tool
    const returnUrlWithPaymentId =
      returnUrl ||
      `${frontendBaseUrl}/payment/success?payment_id=${payment._id}`;
    const cancelUrlWithPaymentId =
      cancelUrl ||
      `${frontendBaseUrl}/payment/cancel?payment_id=${payment._id}`;

    // Notify URL must be a publicly accessible backend URL for webhook
    // PayHere will POST payment status to this URL
    let notifyUrl = process.env.PAYHERE_NOTIFY;

    // Validate notify URL - must be publicly accessible (not localhost)
    if (
      !notifyUrl ||
      notifyUrl.includes("localhost") ||
      notifyUrl.includes("127.0.0.1")
    ) {
      console.warn("⚠️  WARNING: PAYHERE_NOTIFY is not set or uses localhost!");
      console.warn(
        "⚠️  PayHere cannot reach localhost URLs. Webhooks will NOT work!"
      );
      console.warn("⚠️  For local development, use ngrok: ngrok http 5000");
      console.warn(
        "⚠️  Then set PAYHERE_NOTIFY=https://your-ngrok-url.ngrok.io/api/payments/payment-notify"
      );
      console.warn("⚠️  Current notifyUrl:", notifyUrl || "NOT SET");

      // For development, still set a URL (even though it won't work)
      // This allows the payment to be created, but webhooks won't work
      if (!notifyUrl) {
        const backendUrl =
          process.env.BACKEND_URL ||
          process.env.FRONTEND_URL?.replace(":3000", ":5000") ||
          "http://localhost:5000";
        notifyUrl = `${backendUrl}/api/payments/payment-notify`;
        console.warn("⚠️  Using fallback notifyUrl:", notifyUrl);
        console.warn(
          "⚠️  This will NOT work with PayHere - you MUST use a public URL!"
        );
      }
    } else {
      console.log("✅ PayHere notify URL configured:", notifyUrl);
    }

    // Create PayHere payment request object
    let requestObject;
    try {
      requestObject = createPaymentRequest({
        orderId: payment._id.toString(),
        amount: payment.amount,
        currency: "LKR",
        description: `Tournament Registration - ${tournament.tournament_name}`,
        customerInfo: {
          firstName: firstName,
          lastName: lastName,
          email: email,
          phone: phone,
          address: "Address not provided", // User model doesn't have address field
          city: "Colombo",
          country: "Sri Lanka",
        },
        returnUrl: returnUrlWithPaymentId,
        cancelUrl: cancelUrlWithPaymentId,
        notifyUrl: notifyUrl,
      });
    } catch (error) {
      console.error("Error creating PayHere request:", error);
      return {
        success: false,
        error: `Failed to create payment request: ${error.message}`,
      };
    }

    if (!requestObject) {
      return { success: false, error: "Failed to create payment request" };
    }

    return { success: true, payment, requestObject };
  } catch (err) {
    console.error("Error creating payment:", err);
    return {
      success: false,
      error: "Failed to create payment: " + err.message,
    };
  }
};

/**
 * Validates a payment notification received from PayHere's server
 * Updates payment status and registration status accordingly
 * @param {Object} data - Notification data from PayHere
 * @returns {Promise<{success: boolean, payment?: any, error?: string}>}
 */
const validatePayment = async (data) => {
  try {
    const {
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      method,
    } = data;

    console.log("Payment webhook received:", {
      merchant_id,
      order_id,
      payment_id,
      status_code,
      method,
    });

    // Verify the integrity of the notification hash (skip for manual cancellations)
    if (md5sig) {
      const valid = verifyNotificationHash({
        merchantId: merchant_id,
        orderId: order_id,
        payhereAmount: payhere_amount,
        payhereCurrency: payhere_currency,
        statusCode: status_code,
        md5sig: md5sig,
      });

      if (!valid) {
        console.error("Invalid payment hash verification");
        return { success: false, error: "Invalid payment hash" };
      }
    } else {
      console.log("Skipping hash verification for manual cancellation");
    }

    // Find the payment record
    const payment = await Payment.findById(order_id);
    if (!payment) {
      console.error(`Payment not found for order_id: ${order_id}`);
      return { success: false, error: "Payment not found" };
    }

    console.log(
      `Payment found: ${payment._id}, current status: ${payment.payment_status}`
    );

    if (status_code === "2") {
      // Payment completed
      payment.payment_status = "Completed";
      payment.payment_date = new Date();
      if (method) {
        // Map PayHere method to Payment model enum values
        const methodMap = {
          visa: "Card",
          master: "Card",
          amex: "Card",
          card: "Card",
          bank: "Bank Transfer",
          cash: "Cash",
        };
        payment.transaction_method = methodMap[method.toLowerCase()] || "Card";
      }
      if (payment_id && payment_id !== payment.transaction_id) {
        // Only update if different to avoid unnecessary saves
        // Note: If payment_id already exists as another payment's transaction_id,
        // this will fail due to unique constraint - which is expected behavior
        payment.transaction_id = payment_id;
      }
      await payment.save();

      console.log(`Payment ${payment._id} updated to COMPLETED`);

      // Update or create registration
      let registration = null;

      if (payment.registration_id) {
        // Update existing registration
        registration = await Registration.findById(payment.registration_id);
        if (registration) {
          registration.payment_status = "Paid";
          await registration.save();
          console.log(
            `Registration ${registration._id} payment_status updated to Paid`
          );
        }
      } else {
        // Create new registration after successful payment
        if (payment.category_id && payment.player_id) {
          const TournamentCategory = require("../models/TournamentCategory");
          const category = await TournamentCategory.findById(
            payment.category_id
          );

          if (category) {
            registration = await Registration.create({
              tournament_id: payment.tournament_id,
              category_id: payment.category_id,
              player_id: payment.player_id,
              coach_id: payment.coach_id || null,
              registration_type: category.participation_type,
              payment_status: "Paid",
              approval_status: "Pending",
            });

            // Update payment with registration_id
            payment.registration_id = registration._id;
            await payment.save();

            console.log(
              `New registration ${registration._id} created for payment ${payment._id}`
            );
          }
        }
      }

      // Send email notifications
      try {
        const tournament = await Tournament.findById(payment.tournament_id);
        const player = await Player.findById(payment.player_id).populate(
          "user_id"
        );

        if (player && player.user_id && player.user_id.email) {
          const userEmailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Payment Successful - Tournament Registration</h2>
              <p>Dear ${player.user_id.first_name} ${
            player.user_id.last_name
          },</p>
              <p>Thank you for your payment! Your tournament registration payment has been successfully processed.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Payment Details</h3>
                <p><strong>Payment ID:</strong> ${
                  payment_id || payment.transaction_id
                }</p>
                <p><strong>Tournament:</strong> ${
                  tournament.tournament_name
                }</p>
                <p><strong>Amount Paid:</strong> LKR ${payment.amount.toLocaleString()}</p>
                <p><strong>Payment Method:</strong> ${method || "Card"}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              
              <p>Your registration is now being processed. You will receive a confirmation once your registration is approved.</p>
              
              <p>If you have any questions, please contact us.</p>
              <p>Best regards,<br/>XpertKarate Team</p>
            </div>
          `;

          await sendEmail(
            player.user_id.email,
            "Payment Successful - Tournament Registration",
            `Your payment of LKR ${payment.amount.toLocaleString()} has been successfully processed. Payment ID: ${
              payment_id || payment.transaction_id
            }`,
            userEmailHtml
          );

          console.log(
            `Payment confirmation email sent to: ${player.user_id.email}`
          );
        }
      } catch (emailError) {
        console.error("Error sending email notifications:", emailError);
        // Don't fail the payment if email sending fails
      }

      return { success: true, payment };
    } else if (status_code === "-2") {
      // Payment failed
      payment.payment_status = "Failed";
      if (method) {
        // Map PayHere method to Payment model enum values
        const methodMap = {
          visa: "Card",
          master: "Card",
          amex: "Card",
          card: "Card",
          bank: "Bank Transfer",
          cash: "Cash",
        };
        payment.transaction_method = methodMap[method.toLowerCase()] || "Card";
      }
      if (payment_id && payment_id !== payment.transaction_id) {
        // Only update if different to avoid unnecessary saves
        // Note: If payment_id already exists as another payment's transaction_id,
        // this will fail due to unique constraint - which is expected behavior
        payment.transaction_id = payment_id;
      }
      await payment.save();

      console.log(`Payment ${payment._id} updated to FAILED`);

      // Update registration payment status if exists
      if (payment.registration_id) {
        const registration = await Registration.findById(
          payment.registration_id
        );
        if (registration) {
          registration.payment_status = "Failed";
          await registration.save();
          console.log(
            `Registration ${registration._id} payment_status updated to Failed`
          );
        }
      }

      return { success: true, payment };
    } else if (status_code === "-1") {
      // Payment cancelled
      payment.payment_status = "Cancelled";
      // Only set payment_method if it's a valid payment method (not manual_cancel)
      if (method && method !== "manual_cancel") {
        // Map PayHere method to Payment model enum values
        const methodMap = {
          visa: "Card",
          master: "Card",
          amex: "Card",
          card: "Card",
          bank: "Bank Transfer",
          cash: "Cash",
        };
        payment.transaction_method = methodMap[method.toLowerCase()] || "Card";
      }
      if (payment_id && payment_id !== payment.transaction_id) {
        // Only update if different to avoid unnecessary saves
        // Note: If payment_id already exists as another payment's transaction_id,
        // this will fail due to unique constraint - which is expected behavior
        payment.transaction_id = payment_id;
      }
      await payment.save();

      console.log(`Payment ${payment._id} updated to CANCELLED`);

      // Update registration payment status if exists
      if (payment.registration_id) {
        const registration = await Registration.findById(
          payment.registration_id
        );
        if (registration) {
          registration.payment_status = "Failed";
          registration.approval_status = "Cancelled";
          await registration.save();
          console.log(`Registration ${registration._id} updated to Cancelled`);
        }
      }

      return { success: true, payment };
    } else {
      console.log(`Unknown status_code: ${status_code}, not updating payment`);
      return { success: false, error: `Unknown status code: ${status_code}` };
    }
  } catch (err) {
    console.error("Error validating payment:", err);
    return {
      success: false,
      error: "Failed to validate payment: " + err.message,
    };
  }
};

/**
 * Retrieves a payment by its unique ID
 * @param {string} id - The ID of the payment to find
 * @returns {Promise<{success: boolean, payment?: any, error?: string}>}
 */
const getPaymentById = async (id) => {
  try {
    const payment = await Payment.findById(id)
      .populate("registration_id")
      .populate("tournament_id")
      .populate("category_id")
      .populate("player_id");

    if (!payment) {
      return { success: false, error: "Payment not found" };
    }

    return { success: true, payment };
  } catch (err) {
    console.error("Error fetching payment:", err);
    return { success: false, error: "Failed to fetch payment: " + err.message };
  }
};

/**
 * Retrieves a payment by transaction ID
 * @param {string} transactionId - The transaction ID
 * @returns {Promise<{success: boolean, payment?: any, error?: string}>}
 */
const getPaymentByTransactionId = async (transactionId) => {
  try {
    const payment = await Payment.findOne({ transaction_id: transactionId })
      .populate("registration_id")
      .populate("tournament_id")
      .populate("category_id")
      .populate("player_id");

    if (!payment) {
      return { success: false, error: "Payment not found" };
    }

    return { success: true, payment };
  } catch (err) {
    console.error("Error fetching payment:", err);
    return { success: false, error: "Failed to fetch payment: " + err.message };
  }
};

/**
 * Retrieves all payments based on query parameters
 * @param {Object} query - Query parameters for filtering
 * @returns {Promise<{success: boolean, payments?: any[], error?: string}>}
 */
const getAllPayments = async (query) => {
  try {
    const payments = await Payment.find(query)
      .populate("registration_id")
      .populate("tournament_id", "tournament_name")
      .populate("category_id")
      .populate("player_id")
      .sort({ createdAt: -1 });

    return { success: true, payments };
  } catch (err) {
    console.error("Error fetching payments:", err);
    return {
      success: false,
      error: "Failed to retrieve payments: " + err.message,
    };
  }
};

/**
 * Updates an existing payment record
 * @param {string} id - The ID of the payment to update
 * @param {Object} data - The data to update the payment with
 * @returns {Promise<{success: boolean, payment?: any, error?: string}>}
 */
const updatePayment = async (id, data) => {
  try {
    const payment = await Payment.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    })
      .populate("registration_id")
      .populate("tournament_id")
      .populate("category_id")
      .populate("player_id");

    if (!payment) {
      return { success: false, error: "Payment not found" };
    }

    return { success: true, payment };
  } catch (err) {
    console.error("Error updating payment:", err);
    return {
      success: false,
      error: "Failed to update payment: " + err.message,
    };
  }
};

/**
 * Deletes a payment record
 * @param {string} id - The ID of the payment to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const deletePayment = async (id) => {
  try {
    const payment = await Payment.findByIdAndDelete(id);
    if (!payment) {
      return { success: false, error: "Payment not found" };
    }

    return { success: true };
  } catch (err) {
    console.error("Error deleting payment:", err);
    return {
      success: false,
      error: "Failed to delete payment: " + err.message,
    };
  }
};

/**
 * Checks the status of a payment
 * @param {string} id - The ID of the payment to check
 * @returns {Promise<{success: boolean, payment?: any, error?: string}>}
 */
const checkPaymentStatus = async (id) => {
  try {
    const payment = await Payment.findById(id)
      .populate("registration_id")
      .populate("tournament_id")
      .populate("category_id")
      .populate("player_id");

    if (!payment) {
      return { success: false, error: "Payment not found" };
    }

    return { success: true, payment };
  } catch (err) {
    console.error("Error checking payment status:", err);
    return {
      success: false,
      error: "Failed to check payment status: " + err.message,
    };
  }
};

// Process payment callback (backward compatibility)
const processPaymentCallback = async (paymentData) => {
  return await validatePayment(paymentData);
};

// Get payment statistics
const getPaymentStats = async (tournamentId) => {
  try {
    const totalPayments = await Payment.countDocuments({
      tournament_id: tournamentId,
    });
    const completedPayments = await Payment.countDocuments({
      tournament_id: tournamentId,
      payment_status: "Completed",
    });
    const totalAmount = await Payment.aggregate([
      { $match: { tournament_id: tournamentId, payment_status: "Completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    return {
      totalPayments,
      completedPayments,
      pendingPayments: totalPayments - completedPayments,
      totalAmount: totalAmount.length > 0 ? totalAmount[0].total : 0,
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  generatePayHereHash,
  verifyPayHereCallback,
  processPaymentCallback,
  getPaymentStats,
  createPayment,
  validatePayment,
  getPaymentById,
  getPaymentByTransactionId,
  getAllPayments,
  updatePayment,
  deletePayment,
  checkPaymentStatus,
};
