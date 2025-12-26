import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentService } from '../services/paymentService';
import { FiCheckCircle, FiDownload } from 'react-icons/fi';
import { toast } from 'react-toastify';
import Layout from '../components/Layout';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const paymentId = searchParams.get('payment_id');

  useEffect(() => {
    if (paymentId) {
      loadPaymentDetails();
    } else {
      setLoading(false);
    }
  }, [paymentId]);

  const loadPaymentDetails = async () => {
    try {
      const response = await paymentService.getPayment(paymentId);
      setPayment(response.data);
    } catch (error) {
      console.error('Error loading payment:', error);
      toast.error('Failed to load payment details');
    } finally {
      setLoading(false);
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
                  <span className="font-semibold text-gray-800">{payment.transaction_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold text-green-600">LKR {payment.amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-semibold text-green-600">{payment.payment_status}</span>
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

          <div className="space-y-3">
            <button
              onClick={() => navigate('/player/matches')}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition font-semibold"
            >
              Go to My Matches
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PaymentSuccess;

