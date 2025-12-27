import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiCreditCard, FiLock, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { paymentService } from '../services/paymentService';
import { processPayHerePayment, extractCustomerInfo } from '../utils/payhere';

const PayHerePaymentModal = ({
  isOpen,
  onClose,
  registration,
  tournament,
  onSuccess,
  enableCardOption = true
}) => {
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: ''
  });
  const [errors, setErrors] = useState({});
  const [usePayHereGateway, setUsePayHereGateway] = useState(true);

  useEffect(() => {
    if (isOpen && registration && tournament) {
      console.log('PayHerePaymentModal: Initializing payment', {
        registrationId: registration._id,
        tournamentId: tournament._id
      });
      initializePayment();
    } else {
      console.log('PayHerePaymentModal: useEffect conditions not met', {
        isOpen,
        hasRegistration: !!registration,
        hasTournament: !!tournament
      });
    }
  }, [isOpen, registration, tournament]);

  // TEMPORARY: Removed auto-redirect to PayHere (using fake payment instead)

  const initializePayment = async () => {
    try {
      setLoading(true);
      // Use category_fee from registration if available (for event-specific fees)
      // Otherwise fall back to tournament entry fees
      const amount = registration?.category_fee !== undefined && registration?.category_fee !== null
        ? registration.category_fee
        : (registration?.registration_type === 'Individual' 
          ? (tournament?.entry_fee_individual || 0)
          : (tournament?.entry_fee_team || 0));

      const response = await paymentService.createPayment({
        registration_id: registration._id,
        amount: amount,
        transaction_method: 'Card' // Use Card for fake payment
      });

      // For fake payment, we just need the payment object
      // Response structure: { success: true, data: { payment: {...}, payhere: {...} } }
      if (response?.data?.payment) {
        // Set payment data (we don't need payhere data for fake payment)
        setPaymentData({
          payment: response.data.payment,
          payhere: null // No PayHere data needed for fake payment
        });
      } else if (response?.payment) {
        setPaymentData({
          payment: response.payment,
          payhere: null
        });
      } else {
        console.error('Payment data not found in response:', response);
        toast.error('Payment initialization failed. Please try again.');
      }
    } catch (error) {
      console.error('Error initializing payment:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });
      toast.error(error.response?.data?.message || 'Failed to initialize payment. Please try again.');
      // Don't prevent modal from showing even if initialization fails
      // User can still see the form and retry
    } finally {
      setLoading(false);
    }
  };

  const validateCardDetails = () => {
    const newErrors = {};
    
    if (!cardDetails.cardNumber || cardDetails.cardNumber.replace(/\s/g, '').length < 13) {
      newErrors.cardNumber = 'Please enter a valid card number';
    }
    
    if (!cardDetails.cardName || cardDetails.cardName.length < 3) {
      newErrors.cardName = 'Please enter cardholder name';
    }
    
    if (!cardDetails.expiryMonth || !cardDetails.expiryYear) {
      newErrors.expiry = 'Please enter expiry date';
    } else {
      const month = parseInt(cardDetails.expiryMonth);
      const year = parseInt(cardDetails.expiryYear);
      if (month < 1 || month > 12) {
        newErrors.expiry = 'Invalid month';
      } else {
        const expiryDate = new Date(year, month - 1);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expiryDate < today) {
          newErrors.expiry = 'Card has expired';
        }
      }
    }
    
    if (!cardDetails.cvv || cardDetails.cvv.length < 3) {
      newErrors.cvv = 'Please enter CVV';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    setCardDetails({ ...cardDetails, cardNumber: formatted });
    if (errors.cardNumber) {
      setErrors({ ...errors, cardNumber: '' });
    }
  };

  const handlePayHereRedirect = () => {
    if (!paymentData?.payhere) {
      toast.error('Payment data not available. Please try again.');
      return;
    }

    // Use category_fee from registration if available (for event-specific fees)
    // Otherwise fall back to tournament entry fees
    const amount = registration?.category_fee !== undefined && registration?.category_fee !== null
      ? registration.category_fee
      : (registration?.registration_type === 'Individual' 
        ? (tournament?.entry_fee_individual || 0)
        : (tournament?.entry_fee_team || 0));

    // Extract customer information from registration
    // Try multiple ways to extract customer info
    let customerInfo = extractCustomerInfo(registration);
    
    // If customer info is empty, try to extract from registration directly
    if (!customerInfo.first_name && !customerInfo.email) {
      // Try to get from registration.player_id if it's an object with user_id
      if (registration.player_id?.user_id) {
        const user = registration.player_id.user_id;
        customerInfo = {
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          email: user.email || '',
          phone: user.phone || '',
          country: 'Sri Lanka'
        };
      } else if (registration.player_id && typeof registration.player_id === 'object') {
        // If player_id is an object but not populated, try direct access
        customerInfo = {
          first_name: registration.player_id.first_name || '',
          last_name: registration.player_id.last_name || '',
          email: registration.player_id.email || '',
          phone: registration.player_id.phone || '',
          country: 'Sri Lanka'
        };
      }
    }

    // Build item description - include event name if available
    const eventName = registration.category_id?.category_name || 
                     registration.category_name || 
                     'Tournament Event';
    const itemsDescription = registration.registration_type === 'Individual'
      ? `Event Registration - ${eventName}`
      : `Tournament Entry Fee - ${tournament?.tournament_name || 'Tournament'}`;

    // Process payment using utility function
    // paymentData structure: { payhere: {...}, payment: {...} }
    // processPayHerePayment expects { data: { payhere: {...} } }
    // So we wrap paymentData in { data: paymentData }
    const paymentResponse = { data: paymentData };
    const success = processPayHerePayment(
      paymentResponse,
      {
        items: itemsDescription,
        customerInfo,
        method: 'form' // Use form submission for better compatibility
      }
    );

    if (!success) {
      toast.error('Failed to redirect to payment gateway. Please try again.');
    }
  };

  const handleFakePayment = async (e) => {
    e.preventDefault();
    
    if (!paymentData?.payment?._id) {
      toast.error('Payment data not available. Please try again.');
      return;
    }

    setLoading(true);
    try {
      // TEMPORARY: Fake payment completion for testing
      toast.info('Processing payment... (FAKE - Testing Mode)');
      
      // Call fake payment completion endpoint
      const response = await paymentService.completeFakePayment(paymentData.payment._id);
      
      if (response.success) {
        toast.success('Payment completed successfully! (FAKE - Testing Mode)');
        
        // Close modal and call success callback
        if (onSuccess) {
          onSuccess();
        }
        
        // Redirect to success page
        const frontendBaseUrl = window.location.origin;
        const orderId = paymentData.payment._id;
        window.location.href = `${frontendBaseUrl}/payment/success?order_id=${orderId}&payment_id=${orderId}`;
      } else {
        toast.error('Payment failed. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Fake payment error:', error);
      toast.error(error.response?.data?.message || 'Payment failed. Please try again.');
      setLoading(false);
    }
  };

  const handleCardPayment = async (e) => {
    e.preventDefault();
    
    // TEMPORARY: Use fake payment instead of PayHere (no validation needed)
    await handleFakePayment(e);
  };

  if (!isOpen) return null;

  // Use category_fee from registration if available (for event-specific fees)
  // Otherwise fall back to tournament entry fees
  const amount = registration?.category_fee !== undefined && registration?.category_fee !== null
    ? registration.category_fee
    : (registration?.registration_type === 'Individual' 
      ? (tournament?.entry_fee_individual || 0)
      : (tournament?.entry_fee_team || 0));

  // Debug logging
  console.log('PayHerePaymentModal render:', {
    isOpen,
    hasRegistration: !!registration,
    hasTournament: !!tournament,
    registrationId: registration?._id,
    tournamentId: tournament?._id,
    amount,
    categoryFee: registration?.category_fee,
    paymentData: !!paymentData,
    loading
  });

  // Ensure modal renders even if payment initialization is still in progress or failed
  if (!registration || !tournament) {
    console.error('PayHerePaymentModal: Missing required props', {
      hasRegistration: !!registration,
      hasTournament: !!tournament
    });
    return null;
  }

  // Use React Portal to render modal at document body level (above all other modals)
  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full max-h-[95vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header - Mobile Style */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center">
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 mr-3 p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="text-lg font-bold text-gray-900 flex-1 text-center">
            {loading ? 'Processing Payment' : 'Complete Payment (Testing Mode)'}
          </h3>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>

        <div className="p-4">
          {loading ? (
            /* Loading State - Processing Payment */
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Processing Payment</h3>
              <p className="text-gray-600 mb-6">Please wait while we process your payment...</p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <FiAlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                  <span className="text-sm text-yellow-600 font-medium">Testing Mode</span>
                </div>
                <p className="text-xs text-gray-600 text-center">
                  This is a temporary fake payment system for testing purposes.
                </p>
              </div>
            </div>
          ) : (
            /* Error State or Fallback Card Form */
            <div>
              {/* Payment Protection Banner */}
              <div className="flex items-center mb-4">
                <FiCheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-sm text-green-600 font-medium">Covered by Payment Protection</span>
              </div>

              {/* Card Type Logos */}
              <div className="flex items-center justify-end gap-3 mb-6">
                <span className="text-blue-600 font-semibold text-sm">VISA</span>
                <div className="w-10 h-6 bg-gradient-to-r from-red-500 to-orange-500 rounded flex items-center justify-center">
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  </div>
                </div>
                <div className="w-8 h-5 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">AE</span>
                </div>
              </div>

              {/* Payment Form - Simplified for Fake Payment */}
              <form onSubmit={handleCardPayment} className="space-y-4">
            {/* Card Number (Optional for fake payment) */}
            <div>
              <input
                type="text"
                value={cardDetails.cardNumber}
                onChange={handleCardNumberChange}
                placeholder="Card number (optional - for testing)"
                maxLength="19"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>

            {/* Expiry and CVV Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <input
                  type="text"
                  value={(() => {
                    if (!cardDetails.expiryMonth && !cardDetails.expiryYear) return '';
                    const month = cardDetails.expiryMonth.padStart(2, '0');
                    const year = cardDetails.expiryYear ? cardDetails.expiryYear.slice(-2) : '';
                    return year ? `${month}/${year}` : month;
                  })()}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    // Auto-format with slash
                    if (value.length >= 2 && !value.includes('/')) {
                      value = value.slice(0, 2) + '/' + value.slice(2, 4);
                    }
                    // Remove slash for processing
                    const cleanValue = value.replace(/\//g, '');
                    if (cleanValue.length <= 4) {
                      const month = cleanValue.slice(0, 2);
                      const year = cleanValue.slice(2, 4);
                      setCardDetails({ 
                        ...cardDetails, 
                        expiryMonth: month || '',
                        expiryYear: year ? `20${year}` : ''
                      });
                      if (errors.expiry) setErrors({ ...errors, expiry: '' });
                    }
                  }}
                  placeholder="Expiry (MM/YY) - optional"
                  maxLength="5"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Expiry date format: MM/YY"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={cardDetails.cvv}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setCardDetails({ ...cardDetails, cvv: value });
                    if (errors.cvv) setErrors({ ...errors, cvv: '' });
                  }}
                  placeholder="CVV - optional"
                  maxLength="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="CVV is the 3-4 digit code on the back of your card"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Name on Card */}
            <div>
              <input
                type="text"
                value={cardDetails.cardName}
                onChange={(e) => {
                  setCardDetails({ ...cardDetails, cardName: e.target.value });
                  if (errors.cardName) setErrors({ ...errors, cardName: '' });
                }}
                placeholder="Name on card (optional)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>

            {/* Testing Mode Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex items-center mb-1">
                <FiAlertCircle className="w-4 h-4 text-yellow-600 mr-2" />
                <span className="text-xs text-yellow-800 font-semibold">Testing Mode - Fake Payment</span>
              </div>
              <p className="text-xs text-yellow-700">
                Card details are optional. Payment will be automatically marked as successful for testing purposes.
              </p>
            </div>

            {/* Payment Summary */}
            <div className="border-t border-gray-200 pt-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900 font-semibold">Rs. {amount?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-900 font-semibold">Total Amount</span>
                <span className="text-orange-600 font-bold text-lg">Rs. {amount?.toFixed(2) || '0.00'}</span>
              </div>
            </div>

            {/* Pay Now Button */}
            <button
              type="submit"
              disabled={loading || !paymentData?.payment?._id}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <FiCheckCircle className="w-5 h-5 mr-2" />
                  Complete Payment (Testing)
                </>
              )}
            </button>
          </form>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PayHerePaymentModal;

