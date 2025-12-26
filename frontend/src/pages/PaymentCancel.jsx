import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiXCircle, FiArrowLeft } from 'react-icons/fi';
import Layout from '../components/Layout';

const PaymentCancel = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = searchParams.get('payment_id');

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

          {paymentId && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600">
                Payment ID: <span className="font-semibold">{paymentId}</span>
              </p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => navigate('/player/matches')}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition font-semibold flex items-center justify-center"
            >
              <FiArrowLeft className="w-5 h-5 mr-2" />
              Return to My Matches
            </button>
            <p className="text-sm text-gray-600">
              Your coach will handle payment for tournament registrations.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PaymentCancel;

