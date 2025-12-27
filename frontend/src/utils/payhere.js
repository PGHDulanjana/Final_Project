import { BASE_URL } from '../config/api';

/**
 * PayHere payment gateway utility functions for frontend
 * Centralizes PayHere integration logic to match backend implementation
 */

/**
 * PayHere checkout URLs
 */
const PAYHERE_SANDBOX_URL = 'https://sandbox.payhere.lk/pay/checkout';
const PAYHERE_PRODUCTION_URL = 'https://www.payhere.lk/pay/checkout';

/**
 * Get the appropriate PayHere checkout URL based on environment
 * @returns {string} PayHere checkout URL
 */
const getPayHereCheckoutUrl = () => {
  // Check if we're in production or using sandbox
  // You can set this via environment variable or detect from merchant ID
  const isProduction = import.meta.env.VITE_PAYHERE_ENV === 'production' || 
                       !import.meta.env.DEV;
  
  return isProduction ? PAYHERE_PRODUCTION_URL : PAYHERE_SANDBOX_URL;
};

/**
 * Build PayHere checkout URL with all required parameters
 * @param {Object} params - PayHere payment parameters
 * @param {string} params.merchant_id - Merchant ID
 * @param {string} params.order_id - Order ID
 * @param {string} params.amount - Payment amount
 * @param {string} params.currency - Currency code (default: LKR)
 * @param {string} params.hash - Payment hash
 * @param {string} params.items - Item description
 * @param {string} [params.return_url] - Return URL after payment
 * @param {string} [params.cancel_url] - Cancel URL
 * @param {string} [params.notify_url] - Notification URL
 * @param {Object} [params.customerInfo] - Customer information
 * @returns {string} Complete PayHere checkout URL
 */
export const buildPayHereCheckoutUrl = (params) => {
  const {
    merchant_id,
    order_id,
    amount,
    currency = 'LKR',
    hash,
    items,
    return_url,
    cancel_url,
    notify_url,
    customerInfo = {}
  } = params;

  const checkoutUrl = new URL(getPayHereCheckoutUrl());
  
  // Required parameters
  checkoutUrl.searchParams.append('merchant_id', merchant_id);
  checkoutUrl.searchParams.append('order_id', order_id);
  checkoutUrl.searchParams.append('items', items || 'Tournament Registration');
  checkoutUrl.searchParams.append('amount', amount);
  checkoutUrl.searchParams.append('currency', currency);
  checkoutUrl.searchParams.append('hash', hash);

  // Optional URLs
  if (return_url) {
    checkoutUrl.searchParams.append('return_url', return_url);
  }
  if (cancel_url) {
    checkoutUrl.searchParams.append('cancel_url', cancel_url);
  }
  if (notify_url) {
    checkoutUrl.searchParams.append('notify_url', notify_url);
  }

  // Customer information (optional but recommended)
  if (customerInfo.first_name) {
    checkoutUrl.searchParams.append('first_name', customerInfo.first_name);
  }
  if (customerInfo.last_name) {
    checkoutUrl.searchParams.append('last_name', customerInfo.last_name);
  }
  if (customerInfo.email) {
    checkoutUrl.searchParams.append('email', customerInfo.email);
  }
  if (customerInfo.phone) {
    checkoutUrl.searchParams.append('phone', customerInfo.phone);
  }
  if (customerInfo.address) {
    checkoutUrl.searchParams.append('address', customerInfo.address);
  }
  if (customerInfo.city) {
    checkoutUrl.searchParams.append('city', customerInfo.city);
  }
  if (customerInfo.country) {
    checkoutUrl.searchParams.append('country', customerInfo.country);
  }

  return checkoutUrl.toString();
};

/**
 * Create and submit a PayHere payment form
 * This method creates a hidden form and submits it to PayHere
 * @param {Object} payhereData - PayHere payment data from backend
 * @param {Object} options - Additional options
 * @param {string} [options.items] - Item description
 * @param {Object} [options.customerInfo] - Customer information
 * @param {string} [options.returnUrl] - Custom return URL
 * @param {string} [options.cancelUrl] - Custom cancel URL
 */
export const submitPayHereForm = (payhereData, options = {}) => {
  const {
    merchant_id,
    order_id,
    amount,
    currency = 'LKR',
    hash,
    return_url, // From backend response
    cancel_url, // From backend response
    notify_url // From backend response
  } = payhereData;

  const {
    items = 'Tournament Registration',
    customerInfo = {},
    returnUrl,
    cancelUrl
  } = options;

  // Get frontend base URL for return/cancel URLs
  const frontendBaseUrl = window.location.origin;
  // Use return_url from backend if provided, otherwise use options, otherwise default
  const finalReturnUrl = return_url || returnUrl || `${frontendBaseUrl}/payment/success?order_id=${order_id}&payment_id=${order_id}`;
  const finalCancelUrl = cancel_url || cancelUrl || `${frontendBaseUrl}/payment/cancel?order_id=${order_id}&payment_id=${order_id}`;
  const finalNotifyUrl = notify_url || `${BASE_URL}/api/payments/payhere-callback`;

  // Validate required fields before creating form
  if (!merchant_id || !order_id || !amount || !hash) {
    console.error('PayHere: Missing required fields', {
      hasMerchantId: !!merchant_id,
      hasOrderId: !!order_id,
      hasAmount: !!amount,
      hasHash: !!hash,
      merchant_id,
      order_id,
      amount,
      hash: hash ? hash.substring(0, 10) + '...' : null
    });
    alert('Payment initialization error. Missing required payment parameters. Please contact support.');
    return;
  }

  // Ensure amount is formatted correctly (2 decimal places, no commas)
  // PayHere requires format: "1000.00"
  const formattedAmount = parseFloat(amount).toFixed(2);

  console.log('Submitting PayHere form:', {
    merchant_id,
    order_id,
    amount: formattedAmount,
    currency: currency || 'LKR',
    return_url: finalReturnUrl,
    cancel_url: finalCancelUrl,
    notify_url: finalNotifyUrl,
    items: items || 'Tournament Registration',
    hash: hash.substring(0, 10) + '...'
  });

  // Create form
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = getPayHereCheckoutUrl();

  // Required fields - PayHere expects these exact field names
  const formData = {
    merchant_id,
    return_url: finalReturnUrl,
    cancel_url: finalCancelUrl,
    notify_url: finalNotifyUrl,
    order_id,
    items: items || 'Tournament Registration',
    amount: formattedAmount,
    currency: currency || 'LKR',
    hash
  };

  // Add customer information if available
  if (customerInfo.first_name) formData.first_name = customerInfo.first_name;
  if (customerInfo.last_name) formData.last_name = customerInfo.last_name;
  if (customerInfo.email) formData.email = customerInfo.email;
  if (customerInfo.phone) formData.phone = customerInfo.phone;
  if (customerInfo.address) formData.address = customerInfo.address;
  if (customerInfo.city) formData.city = customerInfo.city;
  if (customerInfo.country) formData.country = customerInfo.country || 'Sri Lanka';

  // Create hidden inputs and log for debugging
  console.log('PayHere Form Data:', formData);
  
  Object.entries(formData).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = String(value); // Ensure value is a string
      form.appendChild(input);
      console.log(`Added form field: ${key} = ${value}`);
    }
  });

  // Submit form
  document.body.appendChild(form);
  console.log('Submitting PayHere form to:', getPayHereCheckoutUrl());
  form.submit();
};

/**
 * Redirect to PayHere checkout using URL method
 * This method builds a URL and redirects the browser
 * @param {Object} payhereData - PayHere payment data from backend
 * @param {Object} options - Additional options
 * @param {string} [options.items] - Item description
 * @param {Object} [options.customerInfo] - Customer information
 * @param {string} [options.returnUrl] - Custom return URL
 * @param {string} [options.cancelUrl] - Custom cancel URL
 */
export const redirectToPayHere = (payhereData, options = {}) => {
  const {
    merchant_id,
    order_id,
    amount,
    currency = 'LKR',
    hash,
    return_url, // From backend response
    cancel_url, // From backend response
    notify_url // From backend response
  } = payhereData;

  const {
    items = 'Tournament Registration',
    customerInfo = {},
    returnUrl,
    cancelUrl
  } = options;

  // Get frontend base URL for return/cancel URLs
  const frontendBaseUrl = window.location.origin;
  // Use return_url from backend if provided, otherwise use options, otherwise default
  const finalReturnUrl = return_url || returnUrl || `${frontendBaseUrl}/payment/success?order_id=${order_id}&payment_id=${order_id}`;
  const finalCancelUrl = cancel_url || cancelUrl || `${frontendBaseUrl}/payment/cancel?order_id=${order_id}&payment_id=${order_id}`;
  const finalNotifyUrl = notify_url || `${BASE_URL}/api/payments/payhere-callback`;

  const checkoutUrl = buildPayHereCheckoutUrl({
    merchant_id,
    order_id,
    amount,
    currency,
    hash,
    items,
    return_url: finalReturnUrl,
    cancel_url: finalCancelUrl,
    notify_url: finalNotifyUrl,
    customerInfo
  });

  // Redirect to PayHere
  window.location.href = checkoutUrl;
};

/**
 * Process payment response from backend and redirect to PayHere
 * This is a convenience function that handles the complete payment flow
 * @param {Object} paymentResponse - Response from paymentService.createPayment()
 * @param {Object} options - Additional options
 * @param {string} [options.items] - Item description
 * @param {Object} [options.customerInfo] - Customer information
 * @param {string} [options.method] - Redirect method: 'url' or 'form' (default: 'form')
 * @returns {boolean} True if redirect was successful, false otherwise
 */
export const processPayHerePayment = (paymentResponse, options = {}) => {
  const { method = 'form' } = options;

  // Check if payment response has PayHere data
  if (!paymentResponse?.data?.payhere) {
    console.error('PayHere data not found in payment response');
    return false;
  }

  const payhereData = paymentResponse.data.payhere;

  // Validate required fields
  if (!payhereData.merchant_id || !payhereData.order_id || !payhereData.amount || !payhereData.hash) {
    console.error('Invalid PayHere data: missing required fields');
    return false;
  }

  // Use form submission (recommended) or URL redirect
  if (method === 'url') {
    redirectToPayHere(payhereData, options);
  } else {
    submitPayHereForm(payhereData, options);
  }

  return true;
};

/**
 * Extract customer information from registration or user object
 * Helper function to build customerInfo object for PayHere
 * @param {Object} data - Registration or user data
 * @returns {Object} Customer information object
 */
export const extractCustomerInfo = (data) => {
  const customerInfo = {};

  // Handle different data structures
  if (data?.player_id?.user_id) {
    // From registration with populated player
    const user = data.player_id.user_id;
    customerInfo.first_name = user.first_name || '';
    customerInfo.last_name = user.last_name || '';
    customerInfo.email = user.email || '';
    customerInfo.phone = user.phone || '';
  } else if (data?.user_id) {
    // From player with populated user
    const user = data.user_id;
    customerInfo.first_name = user.first_name || '';
    customerInfo.last_name = user.last_name || '';
    customerInfo.email = user.email || '';
    customerInfo.phone = user.phone || '';
  } else if (data?.first_name) {
    // Direct user object
    customerInfo.first_name = data.first_name || '';
    customerInfo.last_name = data.last_name || '';
    customerInfo.email = data.email || '';
    customerInfo.phone = data.phone || '';
  }

  // Set default country if not provided
  if (!customerInfo.country) {
    customerInfo.country = 'Sri Lanka';
  }

  return customerInfo;
};

