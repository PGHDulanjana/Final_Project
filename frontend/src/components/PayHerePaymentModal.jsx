import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FiCreditCard } from "react-icons/fi";
import { toast } from "react-toastify";
import { paymentService } from "../services/paymentService";

// PayHere checkout URLs
const PAYHERE_SANDBOX_URL = "https://sandbox.payhere.lk/pay/checkout";
const PAYHERE_LIVE_URL = "https://www.payhere.lk/pay/checkout";

// PayHere helpers moved inline (frontend utils removed)
const extractCustomerInfoLocal = (data) => {
  const customerInfo = {};
  if (data?.player_id?.user_id) {
    const user = data.player_id.user_id;
    customerInfo.first_name = user.first_name || "";
    customerInfo.last_name = user.last_name || "";
    customerInfo.email = user.email || "";
    customerInfo.phone = user.phone || "";
  } else if (data?.user_id) {
    const user = data.user_id;
    customerInfo.first_name = user.first_name || "";
    customerInfo.last_name = user.last_name || "";
    customerInfo.email = user.email || "";
    customerInfo.phone = user.phone || "";
  } else if (data?.first_name) {
    customerInfo.first_name = data.first_name || "";
    customerInfo.last_name = data.last_name || "";
    customerInfo.email = data.email || "";
    customerInfo.phone = data.phone || "";
  }
  if (!customerInfo.country) customerInfo.country = "Sri Lanka";
  return customerInfo;
};

const submitPayHereFormLocal = (payhereData, options = {}) => {
  if (!payhereData) return false;
  const {
    merchant_id,
    order_id,
    amount,
    currency = "LKR",
    hash,
    return_url,
    cancel_url,
    notify_url,
  } = payhereData;
  const {
    items = "Tournament Registration",
    customerInfo = {},
    returnUrl,
    cancelUrl,
  } = options;
  const frontendBaseUrl = window.location.origin;
  const finalReturnUrl =
    return_url ||
    returnUrl ||
    `${frontendBaseUrl}/payment/success?payment_id=${order_id}`;
  const finalCancelUrl =
    cancel_url ||
    cancelUrl ||
    `${frontendBaseUrl}/payment/cancel?payment_id=${order_id}`;
  const finalNotifyUrl =
    notify_url ||
    `${process.env.REACT_APP_API_URL || ""}/api/payments/payhere-callback`;
  if (!merchant_id || !order_id || !amount || !hash) {
    console.error("PayHere: Missing required fields", {
      merchant_id,
      order_id,
      amount,
      hash,
    });
    return false;
  }
  const formattedAmount = parseFloat(amount).toFixed(2);
  const form = document.createElement("form");
  form.method = "POST";
  form.action =
    process.env.REACT_APP_PAYHERE_ENV === "production"
      ? "https://www.payhere.lk/pay/checkout"
      : "https://sandbox.payhere.lk/pay/checkout";
  const formData = {
    merchant_id,
    return_url: finalReturnUrl,
    cancel_url: finalCancelUrl,
    notify_url: finalNotifyUrl,
    order_id,
    items: items || "Tournament Registration",
    amount: formattedAmount,
    currency: currency || "LKR",
    hash,
  };
  if (customerInfo.first_name) formData.first_name = customerInfo.first_name;
  if (customerInfo.last_name) formData.last_name = customerInfo.last_name;
  if (customerInfo.email) formData.email = customerInfo.email;
  if (customerInfo.phone) formData.phone = customerInfo.phone;
  if (customerInfo.address) formData.address = customerInfo.address;
  if (customerInfo.city) formData.city = customerInfo.city;
  if (customerInfo.country) formData.country = customerInfo.country;
  Object.entries(formData).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = String(value);
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
  return true;
};

const PayHerePaymentModal = ({
  isOpen,
  onClose,
  registration,
  tournament,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    if (isOpen && registration && tournament) {
      console.log("PayHerePaymentModal: Modal opened", {
        registrationId: registration._id,
        tournamentId: tournament._id,
      });
      // Don't create payment automatically - wait for user to click payment button
      setPaymentData(null);
    } else {
      console.log("PayHerePaymentModal: useEffect conditions not met", {
        isOpen,
        hasRegistration: !!registration,
        hasTournament: !!tournament,
      });
    }
  }, [isOpen, registration, tournament]);

  const handleCheckout = async () => {
    setLoading(true);

    try {
      // Calculate amount
      const paymentAmount =
        registration?.category_fee !== undefined &&
        registration?.category_fee !== null
          ? registration.category_fee
          : registration?.registration_type === "Individual"
          ? tournament?.entry_fee_individual || 0
          : tournament?.entry_fee_team || 0;

      // Prefer existing initialized PayHere object if present
      let requestObject = paymentData?.payhere;
      let paymentRecord = paymentData?.payment;

      // If not present, create a new payment session on backend
      if (!requestObject || !paymentRecord) {
        const response = await paymentService.createPayment({
          registration_id: registration._id,
          amount: paymentAmount,
          transaction_method: "PayHere",
          returnUrl: `${window.location.origin}/payment/success`,
          cancelUrl: `${window.location.origin}/payment/cancel`,
        });

        console.log("Payment creation response:", response);

        // Check if request failed
        if (!response?.success) {
          throw new Error(
            response?.message || response?.error || "Failed to create payment"
          );
        }

        // Extract payment record and payhere object from response
        // Backend returns: { success: true, data: { payment: ..., payhere: ... } }
        paymentRecord = response?.data?.payment;
        requestObject = response?.data?.payhere;

        if (!paymentRecord) {
          console.error("Payment response structure:", response);
          throw new Error(
            "Payment record was not created. Response: " +
              JSON.stringify(response)
          );
        }

        if (!requestObject) {
          console.error("PayHere response structure:", response);
          throw new Error(
            "PayHere request object was not generated. Response: " +
              JSON.stringify(response)
          );
        }

        // Update paymentData state to prevent duplicate creation
        setPaymentData({
          payment: paymentRecord,
          payhere: requestObject,
        });
      }

      if (!requestObject || typeof requestObject !== "object") {
        console.error("Payment response:", requestObject);
        throw new Error(
          (requestObject && requestObject.error) ||
            "Failed to create payment session"
        );
      }

      const payHereUrl =
        import.meta.env.VITE_PAYHERE_MODE === "live"
          ? PAYHERE_LIVE_URL
          : PAYHERE_SANDBOX_URL;

      const form = document.createElement("form");
      form.method = "POST";
      form.action = payHereUrl;
      form.style.display = "none";

      Object.entries(requestObject).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(value ?? "");
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to process checkout"
      );
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Use category_fee from registration if available (for event-specific fees)
  // Otherwise fall back to tournament entry fees
  const amount =
    registration?.category_fee !== undefined &&
    registration?.category_fee !== null
      ? registration.category_fee
      : registration?.registration_type === "Individual"
      ? tournament?.entry_fee_individual || 0
      : tournament?.entry_fee_team || 0;

  // Debug logging
  console.log("PayHerePaymentModal render:", {
    isOpen,
    hasRegistration: !!registration,
    hasTournament: !!tournament,
    registrationId: registration?._id,
    tournamentId: tournament?._id,
    amount,
    categoryFee: registration?.category_fee,
    paymentData: !!paymentData,
    loading,
  });

  // Ensure modal renders even if payment initialization is still in progress or failed
  if (!registration || !tournament) {
    console.error("PayHerePaymentModal: Missing required props", {
      hasRegistration: !!registration,
      hasTournament: !!tournament,
    });
    return null;
  }

  // Use React Portal to render modal at document body level (above all other modals)
  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-md w-full max-h-[95vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Mobile Style */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center">
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 mr-3 p-1"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h3 className="text-lg font-bold text-gray-900 flex-1 text-center">
            {loading ? "Initializing Payment" : "Complete Payment"}
          </h3>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>

        <div className="p-4">
          {loading ? (
            /* Loading State - Processing Payment */
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Initializing Payment
              </h3>
              <p className="text-gray-600 mb-6">
                Please wait while we prepare your payment...
              </p>
            </div>
          ) : (
            /* PayHere Gateway Option */
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Payment Gateway
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    You will be redirected to PayHere secure payment gateway to
                    complete your payment.
                  </p>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold py-4 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiCreditCard className="w-5 h-5 mr-2" />
                  {loading ? "Processing..." : "Pay with PayHere"}
                </button>
              </div>

              {/* Payment Summary */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900 font-semibold">
                    Rs. {amount?.toFixed(2) || "0.00"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-900 font-semibold">
                    Total Amount
                  </span>
                  <span className="text-orange-600 font-bold text-lg">
                    Rs. {amount?.toFixed(2) || "0.00"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PayHerePaymentModal;
