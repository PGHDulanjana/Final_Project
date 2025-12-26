import React, { useState, useEffect } from 'react';
import { registrationService } from '../../services/registrationService';
import { tournamentService } from '../../services/tournamentService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import Layout from '../../components/Layout';
import { motion } from 'framer-motion';
import {
  FiUsers,
  FiSearch,
  FiFilter,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiDollarSign,
  FiUser,
  FiAward,
  FiDownload
} from 'react-icons/fi';

const Participants = () => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    filterRegistrations();
  }, [registrations, selectedTournament, filterStatus, filterPayment, searchTerm]);

  const loadData = async () => {
    if (!user?._id) return;

    setLoading(true);
    try {
      const [registrationsRes, tournamentsRes] = await Promise.all([
        registrationService.getRegistrations(),
        tournamentService.getTournaments({ organizer_id: user?.organizer_id || user?._id }),
      ]);

      setRegistrations(registrationsRes.data || []);
      setTournaments(tournamentsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load participants');
    } finally {
      setLoading(false);
    }
  };

  const filterRegistrations = () => {
    let filtered = registrations;

    // Filter by tournament
    if (selectedTournament !== 'all') {
      filtered = filtered.filter(r => r.tournament_id === selectedTournament);
    }

    // Filter by approval status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.approval_status.toLowerCase() === filterStatus.toLowerCase());
    }

    // Filter by payment status
    if (filterPayment !== 'all') {
      filtered = filtered.filter(r => r.payment_status.toLowerCase() === filterPayment.toLowerCase());
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(r => {
        const tournament = tournaments.find(t => t._id === r.tournament_id);
        const playerName = r.player_id?.user_id?.username || r.player_id?.user_id?.first_name || '';
        const teamName = r.team_id?.team_name || '';
        return (
          tournament?.tournament_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          teamName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    setFilteredRegistrations(filtered);
  };

  const handleApproveRegistration = async (registrationId) => {
    try {
      await registrationService.updateRegistration(registrationId, {
        approval_status: 'Approved',
      });
      toast.success('Registration approved!');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve registration');
    }
  };

  const handleRejectRegistration = async (registrationId) => {
    if (!window.confirm('Are you sure you want to reject this registration?')) return;

    try {
      await registrationService.updateRegistration(registrationId, {
        approval_status: 'Rejected',
      });
      toast.success('Registration rejected!');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject registration');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved':
        return <FiCheckCircle className="w-5 h-5 text-green-600" />;
      case 'Rejected':
        return <FiXCircle className="w-5 h-5 text-red-600" />;
      default:
        return <FiClock className="w-5 h-5 text-yellow-600" />;
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
              Participants Management
            </h1>
            <p className="text-gray-600">Manage tournament registrations and participants</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Registrations</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{registrations.length}</p>
                </div>
                <FiUsers className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Pending</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {registrations.filter(r => r.approval_status === 'Pending').length}
                  </p>
                </div>
                <FiClock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Approved</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {registrations.filter(r => r.approval_status === 'Approved').length}
                  </p>
                </div>
                <FiCheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Paid</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {registrations.filter(r => r.payment_status === 'Paid').length}
                  </p>
                </div>
                <FiDollarSign className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <FiSearch className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search participants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tournament</label>
                <select
                  value={selectedTournament}
                  onChange={(e) => setSelectedTournament(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Tournaments</option>
                  {tournaments.map(t => (
                    <option key={t._id} value={t._id}>{t.tournament_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Approval Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                <select
                  value={filterPayment}
                  onChange={(e) => setFilterPayment(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Payments</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Registrations Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Tournament</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Participant</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Type</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Registration Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Approval Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Payment Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRegistrations.map((registration) => {
                    const tournament = tournaments.find(t => t._id === registration.tournament_id);
                    const participantName = registration.player_id?.user_id?.username ||
                                          registration.player_id?.user_id?.first_name ||
                                          registration.team_id?.team_name ||
                                          'N/A';

                    return (
                      <tr key={registration._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-800">{tournament?.tournament_name || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <FiUser className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="text-gray-800">{participantName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            {registration.registration_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {format(new Date(registration.registration_date), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {getStatusIcon(registration.approval_status)}
                            <span className={`ml-2 px-3 py-1 rounded-full text-xs font-medium ${
                              registration.approval_status === 'Approved' ? 'bg-green-100 text-green-700' :
                              registration.approval_status === 'Rejected' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {registration.approval_status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            registration.payment_status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {registration.payment_status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            {registration.approval_status === 'Pending' && (
                              <>
                                <button
                                  onClick={() => handleApproveRegistration(registration._id)}
                                  className="text-green-600 hover:text-green-700 font-medium text-sm"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectRegistration(registration._id)}
                                  className="text-red-600 hover:text-red-700 font-medium text-sm"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredRegistrations.length === 0 && (
              <div className="p-12 text-center">
                <FiUsers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Participants Found</h3>
                <p className="text-gray-600">No registrations match your current filter criteria.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Participants;

