import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentService } from '../services/paymentService';
import { FiXCircle, FiArrowLeft, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import Layout from '../components/Layout';

const PaymentFailed = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Handle both payment_id and order_id (PayHere uses order_id)
  const paymentId = searchParams.get('payment_id') || searchParams.get('order_id');
  const transactionId = searchParams.get('transaction_id');
  const statusCode = searchParams.get('status_code');

  useEffect(() => {
    if (paymentId) {
      loadPaymentDetails();
    } else {
      setLoading(false);
      toast.error('Payment ID not found in URL');
    }
  }, [paymentId]);

  const loadPaymentDetails = async () => {
    try {
      const response = await paymentService.getPayment(paymentId);
      
      // Response structure: { success: true, data: {...} }
      if (response?.success && response?.data) {
        setPayment(response.data);
      } else if (response?.data) {
        // Fallback for old response structure
        setPayment(response.data);
      } else {
        toast.error('Payment not found');
      }
    } catch (error) {
      console.error('Error loading payment:', error);
      toast.error(
        error.response?.data?.message || 'Failed to load payment details'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-pink-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiXCircle className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Payment Failed
            </h1>
            <p className="text-gray-600">
              Your payment could not be processed. Please try again.
            </p>
          </div>

          {payment && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment ID:</span>
                  <span className="font-semibold text-gray-800">
                    {payment._id}
                  </span>
                </div>
                {transactionId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-semibold text-gray-800">
                      {transactionId}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold text-red-600">
                    LKR {payment.amount?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-semibold text-red-600">
                    {payment.payment_status || 'Failed'}
                  </span>
                </div>
                {payment.tournament_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tournament:</span>
                    <span className="font-semibold text-gray-800">
                      {payment.tournament_id.tournament_name || 'N/A'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {statusCode && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>PayHere Status:</strong>{' '}
                {statusCode === '0'
                  ? 'Payment Failed'
                  : `Status Code: ${statusCode}`}
              </p>
            </div>
          )}

          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> No charges were made to your account. If
              you see a charge, please contact support.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/player/tournaments')}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition font-semibold flex items-center justify-center"
            >
              <FiRefreshCw className="w-5 h-5 mr-2" />
              Try Payment Again
            </button>
            <button
              onClick={() => navigate('/player/matches')}
              className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
            >
              Go to My Matches
            </button>
            <p className="text-sm text-gray-600">
              If the problem persists, please contact our support team.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PaymentFailed;

