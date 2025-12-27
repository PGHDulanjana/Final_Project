import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentService } from '../services/paymentService';
import { FiXCircle, FiArrowLeft } from 'react-icons/fi';
import { toast } from 'react-toastify';
import Layout from '../components/Layout';

const PaymentCancel = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Handle both payment_id and order_id (PayHere uses order_id)
  const paymentId = searchParams.get('payment_id') || searchParams.get('order_id');
  const orderId = searchParams.get('order_id');
  const statusCode = searchParams.get('status_code');

  useEffect(() => {
    if (paymentId || orderId) {
      loadPaymentDetails();
    }
  }, [paymentId, orderId]);

  const loadPaymentDetails = async () => {
    setLoading(true);
    try {
      const idToUse = paymentId || orderId;
      const response = await paymentService.getPayment(idToUse);
      setPayment(response.data);
    } catch (error) {
      console.error('Error loading payment:', error);
      // Don't show error toast for cancelled payments
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiXCircle className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Payment Cancelled</h1>
            <p className="text-gray-600">Your payment was cancelled. No charges were made.</p>
          </div>

          {(paymentId || orderId) && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">
                {paymentId ? 'Payment ID' : 'Order ID'}: <span className="font-semibold">{paymentId || orderId}</span>
              </p>
              {payment && (
                <div className="mt-3 pt-3 border-t border-gray-200 text-left space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold">LKR {payment.amount?.toFixed(2)}</span>
                  </div>
                  {payment.tournament_id && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tournament:</span>
                      <span className="font-semibold">{payment.tournament_id.tournament_name || 'N/A'}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {statusCode && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>PayHere Status:</strong> Payment was cancelled (Status Code: {statusCode})
              </p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => navigate('/player/tournaments')}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition font-semibold flex items-center justify-center"
            >
              <FiArrowLeft className="w-5 h-5 mr-2" />
              Return to Tournaments
            </button>
            <button
              onClick={() => navigate('/player/matches')}
              className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
            >
              Go to My Matches
            </button>
            <p className="text-sm text-gray-600">
              You can try the payment again from the tournament page.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PaymentCancel;

