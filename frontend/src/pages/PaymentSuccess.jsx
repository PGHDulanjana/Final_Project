import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentService } from '../services/paymentService';
import { FiCheckCircle, FiDownload, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import Layout from '../components/Layout';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  
  // Handle both payment_id and order_id (PayHere uses order_id)
  const paymentId = searchParams.get('payment_id') || searchParams.get('order_id');
  const orderId = searchParams.get('order_id');
  const statusCode = searchParams.get('status_code');

  useEffect(() => {
    if (paymentId || orderId) {
      loadPaymentDetails();
    } else {
      setLoading(false);
    }
  }, [paymentId, orderId]);

  const loadPaymentDetails = async () => {
    try {
      const idToUse = paymentId || orderId;
      const response = await paymentService.getPayment(idToUse);
      setPayment(response.data);
      
      // If PayHere returned with status_code, verify payment status
      if (statusCode && statusCode === '2') {
        // Payment was successful according to PayHere
        // The callback should have already updated the payment status
        // But we can refresh to ensure we have the latest status
        setTimeout(() => {
          verifyPaymentStatus(idToUse);
        }, 2000);
      }
    } catch (error) {
      console.error('Error loading payment:', error);
      toast.error('Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const verifyPaymentStatus = async (id) => {
    setVerifying(true);
    try {
      const response = await paymentService.getPayment(id);
      setPayment(response.data);
      
      if (response.data.payment_status === 'Completed') {
        toast.success('Payment verified successfully!');
      } else if (response.data.payment_status === 'Pending') {
        toast.info('Payment is being processed. Please wait a moment...');
        // Retry after 3 seconds
        setTimeout(() => verifyPaymentStatus(id), 3000);
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiCheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Payment Successful!</h1>
            <p className="text-gray-600">Your payment has been processed successfully.</p>
          </div>

          {payment && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-semibold text-gray-800">{payment.transaction_id || payment._id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-semibold text-gray-800">{payment._id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold text-green-600">LKR {payment.amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-semibold ${
                    payment.payment_status === 'Completed' ? 'text-green-600' :
                    payment.payment_status === 'Pending' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {payment.payment_status}
                    {verifying && <FiRefreshCw className="inline-block ml-2 animate-spin" />}
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
                {payment.registration_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Registration:</span>
                    <span className="font-semibold text-gray-800">
                      {payment.registration_id.registration_type || 'N/A'}
                    </span>
                  </div>
                )}
                {payment.payment_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Date:</span>
                    <span className="font-semibold text-gray-800">
                      {new Date(payment.payment_date).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {statusCode && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>PayHere Status:</strong> {statusCode === '2' ? 'Payment Successful' : `Status Code: ${statusCode}`}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => navigate('/player/tournaments')}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition font-semibold"
            >
              Go to Tournaments
            </button>
            <button
              onClick={() => navigate('/player/matches')}
              className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
            >
              View My Matches
            </button>
            {payment && payment.registration_id && (
              <p className="text-sm text-gray-600 text-center mt-2">
                Your registration has been confirmed. You will receive a confirmation email shortly.
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PaymentSuccess;


