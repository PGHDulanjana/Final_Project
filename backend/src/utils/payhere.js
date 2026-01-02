const md5 = require("crypto-js/md5");

/**
 * The PayHere Merchant ID, retrieved from environment variables.
 * This is a public identifier for your merchant account.
 */
const merchantId = process.env.PAYHERE_MERCHANT_ID;
/**
 * The PayHere Merchant Secret, retrieved from environment variables.
 * This is a private key used for generating and verifying security hashes.
 * It should never be exposed on the client-side.
 */
const merchantSecret = process.env.PAYHERE_SECRET;

// A startup check to ensure that essential environment variables are configured.
// Logs an error if the merchant ID or secret is missing.
if (!merchantId || !merchantSecret) {
  console.error(
    "PayHere merchant ID or secret is not defined in environment variables."
  );
  console.log("ids",merchantId, merchantSecret);
}

/**
 * Generates the security hash required for a PayHere payment request.
 * The hash is created by concatenating several pieces of data with the merchant secret
 * and then applying an MD5 hash.
 *
 * @param {string} orderId - The unique ID for the order in your system.
 * @param {string} amount - The payment amount as a string.
 * @returns {string} The uppercase MD5 hash string.
 */
const generateHash = (orderId, amount) => {
  let hashedSecret = md5(merchantSecret).toString().toUpperCase();
  let amountFormated = parseFloat(amount)
    .toLocaleString("en-us", { minimumFractionDigits: 2 })
    .replaceAll(",", "");
  let currency = "LKR";
  let hash = md5(
    merchantId + orderId + amountFormated + currency + hashedSecret
  )
    .toString()
    .toUpperCase();

  return hash;
};

/**
 * Verifies the integrity of a notification received from PayHere's server.
 * This is a critical security step to ensure the notification is authentic and has not been tampered with.
 * It recalculates the hash using the received data and compares it to the `md5sig` from PayHere.
 *
 * @param {Object} params - An object containing all the required fields from the PayHere notification.
 * @param {string} params.merchantId - The merchant ID from PayHere
 * @param {string} params.orderId - The order ID
 * @param {string} params.payhereAmount - The payment amount
 * @param {string} params.payhereCurrency - The currency
 * @param {string} params.statusCode - The status code
 * @param {string} params.md5sig - The MD5 signature from PayHere
 * @returns {boolean} `true` if the calculated hash matches the received `md5sig`, otherwise `false`.
 */
const verifyNotificationHash = (params) => {
  const {
    merchantId: receivedMerchantId,
    orderId,
    payhereAmount,
    payhereCurrency,
    statusCode,
    md5sig,
  } = params;

  // Hash the merchant secret.
  const hashedSecret = md5(merchantSecret).toString().toUpperCase();

  // Concatenate the notification fields in the exact order specified by PayHere documentation.
  const stringToHash = `${receivedMerchantId}${orderId}${payhereAmount}${payhereCurrency}${statusCode}${hashedSecret}`;

  // Calculate the MD5 hash of the concatenated string.
  const calculatedHash = md5(stringToHash).toString().toUpperCase();

  // Compare the calculated hash with the signature received from PayHere.
  return md5sig === calculatedHash;
};

/**
 * A simple utility function to format a number to a string with two decimal places.
 *
 * @param {number} amount - The number to format.
 * @returns {string} The formatted amount as a string (e.g., 123.45).
 */
const formatAmount = (amount) => {
  return amount.toFixed(2);
};

/**
 * Creates the complete payment request object to be sent to the PayHere gateway.
 * This function assembles all required data, generates the security hash, and returns an object
 * that can be used to initiate a payment.
 *
 * @param {Object} paymentData - An object containing all the necessary details for the payment.
 * @param {string} paymentData.orderId - The order ID
 * @param {number} paymentData.amount - The payment amount
 * @param {string} paymentData.currency - The currency code
 * @param {string} paymentData.description - Payment description
 * @param {Object} paymentData.customerInfo - Customer information object
 * @param {string} paymentData.customerInfo.firstName - Customer first name
 * @param {string} paymentData.customerInfo.lastName - Customer last name
 * @param {string} paymentData.customerInfo.email - Customer email
 * @param {string} paymentData.customerInfo.phone - Customer phone
 * @param {string} paymentData.customerInfo.address - Customer address
 * @param {string} paymentData.customerInfo.city - Customer city
 * @param {string} [paymentData.customerInfo.country] - Customer country (optional)
 * @param {string} paymentData.returnUrl - Return URL after payment
 * @param {string} paymentData.cancelUrl - Cancel URL
 * @param {string} paymentData.notifyUrl - Notification URL
 * @returns {Object} A plain JavaScript object representing the full payment request.
 */
const createPaymentRequest = (paymentData) => {
  const {
    orderId,
    amount,
    currency,
    description,
    customerInfo,
    returnUrl,
    cancelUrl,
    notifyUrl,
  } = paymentData;

  // Validate required fields
  if (!orderId) {
    throw new Error("Order ID is required");
  }
  if (!amount || amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }
  if (!returnUrl || !cancelUrl || !notifyUrl) {
    throw new Error("Return URL, Cancel URL, and Notify URL are required");
  }

  // Validate URLs are absolute URLs
  try {
    new URL(returnUrl);
    new URL(cancelUrl);
    new URL(notifyUrl);
  } catch (urlError) {
    throw new Error(
      "Return URL, Cancel URL, and Notify URL must be valid absolute URLs"
    );
  }

  // Format the amount and generate the security hash.
  const formattedAmount = formatAmount(amount);
  const hash = generateHash(orderId, formattedAmount);
  // Validate customer info
  if (
    !customerInfo ||
    !customerInfo.firstName ||
    !customerInfo.lastName ||
    !customerInfo.email
  ) {
    throw new Error(
      "Customer information (first name, last name, email) is required"
    );
  }

  // Assemble the final request object with all required fields.
  // The keys must match the names expected by the PayHere API.
  const requestObject = {
    merchant_id: merchantId,
    return_url: returnUrl,
    cancel_url: cancelUrl,
    notify_url: notifyUrl,
    order_id: String(orderId),
    items: description, // Max 100 chars
    amount: formattedAmount,
    currency: (currency || "LKR").toUpperCase(),
    hash: hash,
    first_name: customerInfo.firstName, // Max 50 chars
    last_name: customerInfo.lastName, // Max 50 chars
    email: customerInfo.email, // Max 100 chars
    phone: customerInfo.phone, // Max 20 chars
    address: customerInfo.address, // Max 100 chars
    city: customerInfo.city, // Max 50 chars
    country: customerInfo.country || "Sri Lanka", // Max 50 chars
  };

  return requestObject;
};

/**
 * A utility function to convert a structured address object into a single-line string.
 * This is useful for passing address information to payment gateways that expect a single address field.
 *
 * @param {Object} address - An object containing structured address parts.
 * @param {string} [address.street] - Street address
 * @param {string} [address.city] - City
 * @param {string} [address.state] - State
 * @returns {string} A comma-separated string of the address parts.
 */
const singelLineAddress = (address) => {
  const parts = [address.street, address.city, address.state];
  return parts.filter(Boolean).join(", ");
};

module.exports = {
  verifyNotificationHash,
  createPaymentRequest,
  singelLineAddress,
  generateHash,
  formatAmount,
};
