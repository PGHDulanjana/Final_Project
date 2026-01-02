import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { paymentService } from "../services/paymentService";
import { FiCheckCircle, FiDownload, FiRefreshCw } from "react-icons/fi";
import { toast } from "react-toastify";
import Layout from "../components/Layout";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [notifiedPending, setNotifiedPending] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Handle both payment_id and order_id (PayHere uses order_id)
  const paymentId =
    searchParams.get("payment_id") || searchParams.get("order_id");
  const transactionId = searchParams.get("transaction_id");
  const statusCode = searchParams.get("status_code");

  useEffect(() => {
    if (paymentId) {
      loadPaymentDetails();
    } else {
      setLoading(false);
      toast.error("Payment ID not found in URL");
    }
  }, [paymentId]);

  const loadPaymentDetails = async () => {
    try {
      const response = await paymentService.getPayment(paymentId);

      // Response structure: { success: true, data: {...} }
      if (response?.success && response?.data) {
        setPayment(response.data);

        // If payment is still pending, verify status
        if (response.data.payment_status === "Pending") {
          setTimeout(() => {
            verifyPaymentStatus(paymentId);
          }, 2000);
        }
      } else if (response?.data) {
        // Fallback for old response structure
        setPayment(response.data);
      } else {
        toast.error("Payment not found");
      }
    } catch (error) {
      console.error("Error loading payment:", error);
      toast.error(
        error.response?.data?.message || "Failed to load payment details"
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyPaymentStatus = async (id) => {
    setVerifying(true);
    try {
      const response = await paymentService.checkPaymentStatus(id);

      // Response structure: { success: true, data: {...} }
      const paymentData = response?.data || response;

      if (paymentData) {
        setPayment(paymentData);

        if (paymentData.payment_status === "Completed") {
          // Clear any pending notification state
          setNotifiedPending(false);
          setRetryCount(0);
          // Dismiss pending toast if present
          toast.dismiss("payment-pending");
          toast.success("Payment verified successfully!");
        } else if (paymentData.payment_status === "Pending") {
          // Show the 'processing' toast only once, and limit retries
          if (!notifiedPending) {
            toast.info("Payment is being processed. Please wait a moment...", {
              toastId: "payment-pending",
            });
            setNotifiedPending(true);
          }

          // Retry with a maximum number of attempts (10 by default)
          const MAX_RETRIES = 10;
          if (retryCount < MAX_RETRIES) {
            setRetryCount((r) => r + 1);
            setTimeout(() => verifyPaymentStatus(id), 3000);
          } else {
            toast.dismiss("payment-pending");
            toast.warning(
              "Payment still pending after several checks. Please contact support if it does not complete.",
              { toastId: "payment-pending-warning" }
            );
          }
        }
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
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
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Payment Successful!
            </h1>
            <p className="text-gray-600">
              Your payment has been processed successfully.
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
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-semibold text-gray-800">
                    {transactionId || payment.transaction_id || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold text-green-600">
                    LKR {payment.amount?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`font-semibold ${
                      payment.payment_status === "Completed"
                        ? "text-green-600"
                        : payment.payment_status === "Pending"
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {payment.payment_status}
                    {verifying && (
                      <FiRefreshCw className="inline-block ml-2 animate-spin" />
                    )}
                  </span>
                </div>
                {payment.tournament_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tournament:</span>
                    <span className="font-semibold text-gray-800">
                      {payment.tournament_id.tournament_name || "N/A"}
                    </span>
                  </div>
                )}
                {payment.registration_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Registration:</span>
                    <span className="font-semibold text-gray-800">
                      {payment.registration_id.registration_type || "N/A"}
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
                <strong>PayHere Status:</strong>{" "}
                {statusCode === "2"
                  ? "Payment Successful"
                  : `Status Code: ${statusCode}`}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => navigate("/player/tournaments")}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition font-semibold"
            >
              Go to Tournaments
            </button>
            <button
              onClick={() => navigate("/player/matches")}
              className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
            >
              View My Matches
            </button>
            {payment && payment.registration_id && (
              <p className="text-sm text-gray-600 text-center mt-2">
                Your registration has been confirmed. You will receive a
                confirmation email shortly.
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PaymentSuccess;
