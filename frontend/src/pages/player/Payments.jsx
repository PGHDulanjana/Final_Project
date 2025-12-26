import React, { useState, useEffect } from 'react';
import { registrationService } from '../../services/registrationService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import { motion } from 'framer-motion';
import { FiDollarSign, FiCreditCard, FiDownload, FiCheckCircle, FiClock, FiXCircle } from 'react-icons/fi';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import PayHerePaymentModal from '../../components/PayHerePaymentModal';

const Payments = () => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRegistrations();
  }, [user]);

  const loadRegistrations = async () => {
    if (!user?._id) return;

    setLoading(true);
    try {
      const registrationsRes = await registrationService.getRegistrations({
        player_id: user.player_id,
      });
      setRegistrations(registrationsRes.data || []);
    } catch (error) {
      console.error('Error loading registrations:', error);
      toast.error('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayment = (registration) => {
    if (!registration?.tournament_id) {
      toast.error('Tournament information not available for this registration.');
      return;
    }
    setSelectedRegistration(registration);
    setShowPaymentModal(true);
  };

  const generateInvoicePDF = (registration) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('XpertKarate Tournament', 105, 20, { align: 'center' });
    doc.setFontSize(16);
    doc.text('INVOICE', 105, 30, { align: 'center' });

    // Invoice details
    doc.setFontSize(12);
    doc.text(`Invoice #: ${registration._id.slice(-8)}`, 20, 50);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 60);
    doc.text(`Tournament: ${registration.tournament_id?.tournament_name || 'N/A'}`, 20, 70);

    // Table
    doc.autoTable({
      startY: 80,
      head: [['Description', 'Quantity', 'Unit Price', 'Total']],
      body: [
        [
          `Tournament Registration - ${registration.registration_type}`,
          '1',
          `$${registration.tournament_id?.entry_fee_individual || 0}`,
          `$${registration.tournament_id?.entry_fee_individual || 0}`,
        ],
      ],
    });

    // Total
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Total: $${registration.tournament_id?.entry_fee_individual || 0}`, 150, finalY, { align: 'right' });

    // Payment status
    doc.setFontSize(10);
    if (registration.payment_status === 'Paid') {
      doc.setTextColor(0, 128, 0); // Green
    } else {
      doc.setTextColor(255, 0, 0); // Red
    }
    doc.text(
      `Payment Status: ${registration.payment_status}`,
      105,
      finalY + 20,
      { align: 'center' }
    );

    // Save PDF
    doc.save(`invoice-${registration._id.slice(-8)}.pdf`);
  };

  const getPaymentStatusIcon = (status) => {
    switch (status) {
      case 'Paid':
        return <FiCheckCircle className="w-5 h-5 text-green-600" />;
      case 'Pending':
        return <FiClock className="w-5 h-5 text-yellow-600" />;
      default:
        return <FiXCircle className="w-5 h-5 text-red-600" />;
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Payments & Invoices</h1>
          <p className="text-gray-600">Manage your tournament payments and invoices</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {registrations.map((registration) => (
              <motion.div
                key={registration._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      {registration.tournament_id?.tournament_name || 'Tournament'}
                    </h3>
                    <p className="text-gray-600">
                      Registration Type: {registration.registration_type}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getPaymentStatusIcon(registration.payment_status)}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      registration.payment_status === 'Paid'
                        ? 'bg-green-100 text-green-800'
                        : registration.payment_status === 'Pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {registration.payment_status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Entry Fee</p>
                    <p className="text-lg font-bold text-gray-800">
                      ${registration.tournament_id?.entry_fee_individual || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Approval Status</p>
                    <p className={`text-lg font-bold ${
                      registration.approval_status === 'Approved'
                        ? 'text-green-600'
                        : registration.approval_status === 'Pending'
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}>
                      {registration.approval_status}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Registration Date</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {new Date(registration.registration_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => generateInvoicePDF(registration)}
                    className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <FiDownload className="mr-2" />
                    Download Invoice
                  </button>
                  {registration.payment_status !== 'Paid' && (
                    <button
                      onClick={() => handleOpenPayment(registration)}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <FiCreditCard className="mr-2" />
                      Pay Now
                    </button>
                  )}
                </div>
              </motion.div>
            ))}

            {registrations.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg shadow-md">
                <FiDollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No payment records found</p>
              </div>
            )}
          </div>
        )}

        {/* PayHere Payment Modal */}
        {showPaymentModal && selectedRegistration && (
          <PayHerePaymentModal
            isOpen={showPaymentModal}
            onClose={() => {
              setShowPaymentModal(false);
              setSelectedRegistration(null);
            }}
            registration={selectedRegistration}
            tournament={selectedRegistration.tournament_id}
            enableCardOption={false}
            onSuccess={() => {
              setShowPaymentModal(false);
              setSelectedRegistration(null);
              loadRegistrations();
            }}
          />
        )}
      </div>
    </Layout>
  );
};

export default Payments;

