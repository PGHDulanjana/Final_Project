import React, { useState, useEffect } from 'react';
import { matchService } from '../../services/matchService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import Layout from '../../components/Layout';
import { motion } from 'framer-motion';
import {
  FiZap,
  FiSearch,
  FiFilter,
  FiClock,
  FiUsers,
  FiAward,
  FiCalendar,
  FiMapPin,
  FiRefreshCw,
  FiActivity
} from 'react-icons/fi';

const ActiveMatches = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, [user]);

  useEffect(() => {
    filterMatches();
  }, [matches, searchTerm, filterStatus]);

  const loadMatches = async () => {
    if (!user?._id) return;

    setLoading(true);
    try {
      const matchesRes = await matchService.getMatches();
      setMatches(matchesRes.data || []);
    } catch (error) {
      console.error('Error loading matches:', error);
      toast.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const filterMatches = () => {
    let filtered = matches;

    // Filter by status
    if (filterStatus === 'active') {
      filtered = filtered.filter(m => m.status === 'In Progress' || m.status === 'Scheduled');
    } else if (filterStatus === 'completed') {
      filtered = filtered.filter(m => m.status === 'Completed');
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(m =>
        m.match_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.category_id?.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.tournament_id?.tournament_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredMatches(filtered);
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
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                  Active Matches
                </h1>
                <p className="text-gray-600">View and manage matches assigned to you</p>
              </div>
              <button
                onClick={loadMatches}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center"
              >
                <FiRefreshCw className="mr-2" />
                Refresh
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Active Matches</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {matches.filter(m => m.status === 'In Progress' || m.status === 'Scheduled').length}
                  </p>
                </div>
                <FiZap className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">In Progress</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {matches.filter(m => m.status === 'In Progress').length}
                  </p>
                </div>
                <FiActivity className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Scheduled</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {matches.filter(m => m.status === 'Scheduled').length}
                  </p>
                </div>
                <FiClock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <FiSearch className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search matches..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilterStatus('active')}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                    filterStatus === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setFilterStatus('completed')}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                    filterStatus === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Completed
                </button>
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                    filterStatus === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
              </div>
            </div>
          </div>

          {/* Matches List */}
          <div className="space-y-4">
            {filteredMatches.map((match) => (
              <motion.div
                key={match._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300"
              >
                <div className={`h-2 ${
                  match.status === 'In Progress' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                  match.status === 'Scheduled' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                  'bg-gradient-to-r from-gray-500 to-gray-600'
                }`}></div>
                <div className="p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{match.match_name || 'Match'}</h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                          {match.category_id?.category_name || 'Category'}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          match.status === 'In Progress' ? 'bg-green-100 text-green-700' :
                          match.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {match.status}
                        </span>
                        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                          {match.match_type}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-gray-600 mb-1">
                        <FiCalendar className="w-5 h-5 mr-2" />
                        <span className="font-semibold">{format(new Date(match.scheduled_time), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <FiClock className="w-5 h-5 mr-2" />
                        <span className="font-semibold">{format(new Date(match.scheduled_time), 'HH:mm')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center text-gray-600">
                      <FiAward className="w-5 h-5 mr-2 text-blue-500" />
                      <span>{match.tournament_id?.tournament_name || 'Tournament'}</span>
                    </div>
                    {match.tournament_id?.venue && (
                      <div className="flex items-center text-gray-600">
                        <FiMapPin className="w-5 h-5 mr-2 text-blue-500" />
                        <span>{match.tournament_id.venue}</span>
                      </div>
                    )}
                    <div className="flex items-center text-gray-600">
                      <FiUsers className="w-5 h-5 mr-2 text-blue-500" />
                      <span>{match.participants?.length || 0} Participants</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      {match.match_level || 'Match Level'}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredMatches.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <FiZap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Matches Found</h3>
              <p className="text-gray-600">No matches match your current filter criteria.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ActiveMatches;

