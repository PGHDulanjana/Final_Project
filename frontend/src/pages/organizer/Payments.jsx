import React, { useState, useEffect } from 'react';
import { registrationService } from '../../services/registrationService';
import { tournamentService } from '../../services/tournamentService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import Layout from '../../components/Layout';
import { motion } from 'framer-motion';
import {
  FiDollarSign,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiSearch,
  FiFilter,
  FiTrendingUp,
  FiBarChart2
} from 'react-icons/fi';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const OrganizerPayments = () => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [loading, setLoading] = useState(true);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    filterRegistrations();
  }, [registrations, selectedTournament, filterPayment]);

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
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const filterRegistrations = () => {
    let filtered = registrations;

    if (selectedTournament !== 'all') {
      filtered = filtered.filter(r => r.tournament_id === selectedTournament);
    }

    if (filterPayment !== 'all') {
      filtered = filtered.filter(r => r.payment_status.toLowerCase() === filterPayment.toLowerCase());
    }

    setFilteredRegistrations(filtered);
  };

  const calculateRevenue = () => {
    return filteredRegistrations
      .filter(r => r.payment_status === 'Paid')
      .reduce((sum, r) => {
        const tournament = tournaments.find(t => t._id === r.tournament_id);
        if (tournament) {
          return sum + (r.registration_type === 'Team' ? tournament.entry_fee_team : tournament.entry_fee_individual);
        }
        return sum;
      }, 0);
  };

  const getPaymentDataByTournament = () => {
    const tournamentPayments = {};
    filteredRegistrations
      .filter(r => r.payment_status === 'Paid')
      .forEach(r => {
        const tournament = tournaments.find(t => t._id === r.tournament_id);
        if (tournament) {
          if (!tournamentPayments[tournament.tournament_name]) {
            tournamentPayments[tournament.tournament_name] = 0;
          }
          tournamentPayments[tournament.tournament_name] +=
            r.registration_type === 'Team' ? tournament.entry_fee_team : tournament.entry_fee_individual;
        }
      });

    return Object.keys(tournamentPayments).map(name => ({
      name,
      revenue: tournamentPayments[name],
    }));
  };

  const getPaymentStatusDistribution = () => {
    const paid = filteredRegistrations.filter(r => r.payment_status === 'Paid').length;
    const pending = filteredRegistrations.filter(r => r.payment_status === 'Pending').length;
    return [
      { name: 'Paid', value: paid },
      { name: 'Pending', value: pending },
    ];
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

  const totalRevenue = calculateRevenue();
  const paidCount = filteredRegistrations.filter(r => r.payment_status === 'Paid').length;
  const pendingCount = filteredRegistrations.filter(r => r.payment_status === 'Pending').length;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
              Payments & Revenue
            </h1>
            <p className="text-gray-600">Track payments and revenue from tournament registrations</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">${totalRevenue.toFixed(2)}</p>
                </div>
                <FiDollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Paid Registrations</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{paidCount}</p>
                </div>
                <FiCheckCircle className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Pending Payments</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{pendingCount}</p>
                </div>
                <FiClock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Registrations</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{filteredRegistrations.length}</p>
                </div>
                <FiBarChart2 className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Revenue by Tournament</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getPaymentDataByTournament()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="#8884d8" name="Revenue ($)" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Payment Status Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getPaymentStatusDistribution()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getPaymentStatusDistribution().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Tournament</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Payment Status</label>
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

          {/* Payments Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Tournament</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Participant</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Type</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Payment Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRegistrations.map((registration) => {
                    const tournament = tournaments.find(t => t._id === registration.tournament_id);
                    const participantName = registration.player_id?.user_id?.username ||
                                          registration.player_id?.user_id?.first_name ||
                                          registration.team_id?.team_name ||
                                          'N/A';
                    const amount = tournament
                      ? (registration.registration_type === 'Team' ? tournament.entry_fee_team : tournament.entry_fee_individual)
                      : 0;

                    return (
                      <tr key={registration._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-semibold text-gray-800">
                          {tournament?.tournament_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-gray-700">{participantName}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            {registration.registration_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-800">${amount.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            registration.payment_status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {registration.payment_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {format(new Date(registration.registration_date), 'MMM dd, yyyy')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredRegistrations.length === 0 && (
              <div className="p-12 text-center">
                <FiDollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Payments Found</h3>
                <p className="text-gray-600">No payments match your current filter criteria.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default OrganizerPayments;

