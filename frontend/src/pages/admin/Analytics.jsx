import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
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
import { userService } from '../../services/userService';
import { tournamentService } from '../../services/tournamentService';
import { registrationService } from '../../services/registrationService';
import { matchService } from '../../services/matchService';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import { motion } from 'framer-motion';
import {
  FiBarChart2,
  FiTrendingUp,
  FiUsers,
  FiAward,
  FiActivity,
  FiDollarSign,
  FiFilter,
  FiDownload
} from 'react-icons/fi';
import { format } from 'date-fns';

const Analytics = () => {
  const [users, setUsers] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('all');

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, tournamentsRes, registrationsRes, matchesRes] = await Promise.all([
        userService.getUsers(),
        tournamentService.getTournaments(),
        registrationService.getRegistrations(),
        matchService.getMatches(),
      ]);

      setUsers(usersRes.data || []);
      setTournaments(tournamentsRes.data || []);
      setRegistrations(registrationsRes.data || []);
      setMatches(matchesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getUserGrowthData = () => {
    const monthlyData = {};
    users.forEach(user => {
      const month = new Date(user.createdAt || new Date()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    });

    return Object.keys(monthlyData)
      .sort((a, b) => new Date(a) - new Date(b))
      .map(month => ({
        month,
        users: monthlyData[month],
      }));
  };

  const getUserRoleDistribution = () => {
    const roleCounts = {
      Player: users.filter(u => u.user_type === 'Player').length,
      Judge: users.filter(u => u.user_type === 'Judge').length,
      Coach: users.filter(u => u.user_type === 'Coach').length,
      Organizer: users.filter(u => u.user_type === 'Organizer').length,
      Admin: users.filter(u => u.user_type === 'Admin').length,
    };

    return Object.keys(roleCounts).map(role => ({
      name: role,
      value: roleCounts[role],
    }));
  };

  const getTournamentStatusDistribution = () => {
    const statusCounts = {
      Open: tournaments.filter(t => t.status === 'Open').length,
      Ongoing: tournaments.filter(t => t.status === 'Ongoing').length,
      Completed: tournaments.filter(t => t.status === 'Completed').length,
      Closed: tournaments.filter(t => t.status === 'Closed').length,
    };

    return Object.keys(statusCounts).map(status => ({
      name: status,
      value: statusCounts[status],
    }));
  };

  const getRegistrationTrend = () => {
    const monthlyData = {};
    registrations.forEach(reg => {
      const month = new Date(reg.registration_date || new Date()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    });

    return Object.keys(monthlyData)
      .sort((a, b) => new Date(a) - new Date(b))
      .map(month => ({
        month,
        registrations: monthlyData[month],
      }));
  };

  const getRevenueByMonth = () => {
    const monthlyRevenue = {};
    registrations
      .filter(r => r.payment_status === 'Paid')
      .forEach(reg => {
        const tournament = tournaments.find(t => t._id === reg.tournament_id);
        if (tournament) {
          const month = new Date(reg.registration_date || new Date()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          const amount = reg.registration_type === 'Team' ? tournament.entry_fee_team : tournament.entry_fee_individual;
          monthlyRevenue[month] = (monthlyRevenue[month] || 0) + amount;
        }
      });

    return Object.keys(monthlyRevenue)
      .sort((a, b) => new Date(a) - new Date(b))
      .map(month => ({
        month,
        revenue: monthlyRevenue[month],
      }));
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
              Analytics Dashboard
            </h1>
            <p className="text-gray-600">Comprehensive system analytics and insights</p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Users</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{users.length}</p>
                </div>
                <FiUsers className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Tournaments</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{tournaments.length}</p>
                </div>
                <FiAward className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Registrations</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{registrations.length}</p>
                </div>
                <FiActivity className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Matches</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{matches.length}</p>
                </div>
                <FiBarChart2 className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* User Growth */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">User Growth</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getUserGrowthData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} name="New Users" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* User Role Distribution */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">User Role Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getUserRoleDistribution()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getUserRoleDistribution().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Registration Trend */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Registration Trend</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getRegistrationTrend()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="registrations" fill="#8884d8" name="Registrations" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tournament Status */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Tournament Status Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getTournamentStatusDistribution()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getTournamentStatusDistribution().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Revenue Trend</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={getRevenueByMonth()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#00C49F" strokeWidth={2} name="Revenue ($)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Analytics;

