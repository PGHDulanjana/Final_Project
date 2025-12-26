import { useState, useEffect } from 'react';
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
      initializePayment();
    }
  }, [isOpen, registration, tournament]);

  const initializePayment = async () => {
    try {
      setLoading(true);
      const amount = registration.registration_type === 'Individual' 
        ? tournament.entry_fee_individual 
        : tournament.entry_fee_team;

      const response = await paymentService.createPayment({
        registration_id: registration._id,
        amount: amount,
        transaction_method: 'PayHere'
      });

      if (response.data?.payhere) {
        setPaymentData(response.data);
      }
    } catch (error) {
      console.error('Error initializing payment:', error);
      toast.error('Failed to initialize payment. Please try again.');
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
      newErrors.expiry = 'Please select expiry date';
    } else {
      const expiryDate = new Date(parseInt(cardDetails.expiryYear), parseInt(cardDetails.expiryMonth) - 1);
      if (expiryDate < new Date()) {
        newErrors.expiry = 'Card has expired';
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

    const amount = registration.registration_type === 'Individual' 
      ? tournament.entry_fee_individual 
      : tournament.entry_fee_team;

    // Extract customer information from registration
    const customerInfo = extractCustomerInfo(registration);

    // Process payment using utility function
    const success = processPayHerePayment(
      { data: paymentData },
      {
        items: `Tournament Entry Fee - ${tournament.tournament_name}`,
        customerInfo,
        method: 'form' // Use form submission for better compatibility
      }
    );

    if (!success) {
      toast.error('Failed to redirect to payment gateway. Please try again.');
    }
  };

  const handleCardPayment = async (e) => {
    e.preventDefault();
    
    if (!validateCardDetails()) {
      toast.error('Please correct the errors in the form.');
      return;
    }

    setLoading(true);
    try {
      // In a real implementation, you would send card details to your backend
      // which would then process through PayHere's secure API
      // For now, we'll redirect to PayHere checkout
      toast.info('Processing payment through PayHere secure gateway...');
      setTimeout(() => {
        handlePayHereRedirect();
      }, 500);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const amount = registration?.registration_type === 'Individual' 
    ? tournament?.entry_fee_individual 
    : tournament?.entry_fee_team;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 rounded-t-xl flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold">Complete Payment</h3>
            <p className="text-sm text-blue-100 mt-1">Secure payment via PayHere</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Payment Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Tournament:</span>
              <span className="font-semibold text-gray-800">{tournament?.tournament_name}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Registration Type:</span>
              <span className="font-semibold text-gray-800">{registration?.registration_type}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <span className="text-lg font-semibold text-gray-800">Total Amount:</span>
              <span className="text-2xl font-bold text-blue-600">LKR {amount?.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Selection (optional card mode) */}
          {enableCardOption && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setUsePayHereGateway(true)}
                  className={`p-4 border-2 rounded-lg transition ${
                    usePayHereGateway
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center">
                    <FiLock className="w-5 h-5 mr-2 text-blue-600" />
                    <div className="text-left">
                      <div className="font-semibold text-gray-800">PayHere Gateway</div>
                      <div className="text-xs text-gray-600">Secure payment processing</div>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setUsePayHereGateway(false)}
                  className={`p-4 border-2 rounded-lg transition ${
                    !usePayHereGateway
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center">
                    <FiCreditCard className="w-5 h-5 mr-2 text-blue-600" />
                    <div className="text-left">
                      <div className="font-semibold text-gray-800">Card Details</div>
                      <div className="text-xs text-gray-600">Enter card information</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {usePayHereGateway || !enableCardOption ? (
            /* PayHere Gateway Option */
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <FiLock className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800 mb-1">Secure Payment Processing</p>
                    <p className="text-xs text-blue-700">
                      You will be redirected to PayHere's secure payment page to complete your transaction.
                      PayHere supports all major credit/debit cards and mobile payment methods.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePayHereRedirect}
                disabled={loading || !paymentData}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <FiLock className="w-5 h-5 mr-2" />
                    Proceed to PayHere Payment
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Card Details Form */
            <form onSubmit={handleCardPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={cardDetails.cardNumber}
                  onChange={handleCardNumberChange}
                  placeholder="1234 5678 9012 3456"
                  maxLength="19"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.cardNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.cardNumber && (
                  <p className="text-red-500 text-xs mt-1">{errors.cardNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cardholder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={cardDetails.cardName}
                  onChange={(e) => {
                    setCardDetails({ ...cardDetails, cardName: e.target.value });
                    if (errors.cardName) setErrors({ ...errors, cardName: '' });
                  }}
                  placeholder="John Doe"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.cardName ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.cardName && (
                  <p className="text-red-500 text-xs mt-1">{errors.cardName}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={cardDetails.expiryMonth}
                      onChange={(e) => {
                        setCardDetails({ ...cardDetails, expiryMonth: e.target.value });
                        if (errors.expiry) setErrors({ ...errors, expiry: '' });
                      }}
                      className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.expiry ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Month</option>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                          {String(i + 1).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    <select
                      value={cardDetails.expiryYear}
                      onChange={(e) => {
                        setCardDetails({ ...cardDetails, expiryYear: e.target.value });
                        if (errors.expiry) setErrors({ ...errors, expiry: '' });
                      }}
                      className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.expiry ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Year</option>
                      {Array.from({ length: 15 }, (_, i) => {
                        const year = new Date().getFullYear() + i;
                        return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  {errors.expiry && (
                    <p className="text-red-500 text-xs mt-1">{errors.expiry}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CVV <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={cardDetails.cvv}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setCardDetails({ ...cardDetails, cvv: value });
                      if (errors.cvv) setErrors({ ...errors, cvv: '' });
                    }}
                    placeholder="123"
                    maxLength="4"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.cvv ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.cvv && (
                    <p className="text-red-500 text-xs mt-1">{errors.cvv}</p>
                  )}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start">
                  <FiAlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                  <p className="text-xs text-yellow-800">
                    <strong>Note:</strong> Card details are processed securely through PayHere payment gateway.
                    We do not store your card information.
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <FiCheckCircle className="w-5 h-5 mr-2" />
                      Pay LKR {amount?.toFixed(2)}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-center text-xs text-gray-500">
              <FiLock className="w-4 h-4 mr-1" />
              <span>Your payment is secured by PayHere</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayHerePaymentModal;

