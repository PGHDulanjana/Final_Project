import React, { useState, useEffect } from 'react';
import { matchService } from '../../services/matchService';
import { scoreService } from '../../services/scoreService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import Layout from '../../components/Layout';
import { motion } from 'framer-motion';
import {
  FiCheckCircle,
  FiSearch,
  FiFilter,
  FiEdit,
  FiAward,
  FiTrendingUp,
  FiBarChart2,
  FiCalendar
} from 'react-icons/fi';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const ScoredMatches = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [scores, setScores] = useState([]);
  const [filteredScores, setFilteredScores] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMatch, setFilterMatch] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    filterScores();
  }, [scores, searchTerm, filterMatch]);

  const loadData = async () => {
    if (!user?._id) return;

    setLoading(true);
    try {
      const [matchesRes, scoresRes] = await Promise.all([
        matchService.getMatches({ status: 'Completed' }),
        scoreService.getScores({ judge_id: user?.judge_id || user?._id }),
      ]);

      setMatches(matchesRes.data || []);
      setScores(scoresRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load scored matches');
    } finally {
      setLoading(false);
    }
  };

  const filterScores = () => {
    let filtered = scores;

    if (filterMatch !== 'all') {
      filtered = filtered.filter(s => s.match_id === filterMatch);
    }

    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.match_id?.match_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.participant_id?.player_id?.user_id?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.participant_id?.team_id?.team_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredScores(filtered);
  };

  const getScoreStatistics = () => {
    const avgTechnical = filteredScores.length > 0
      ? filteredScores.reduce((sum, s) => sum + s.technical_score, 0) / filteredScores.length
      : 0;
    const avgPerformance = filteredScores.length > 0
      ? filteredScores.reduce((sum, s) => sum + s.performance_score, 0) / filteredScores.length
      : 0;
    const avgFinal = filteredScores.length > 0
      ? filteredScores.reduce((sum, s) => sum + s.final_score, 0) / filteredScores.length
      : 0;

    return { avgTechnical, avgPerformance, avgFinal };
  };

  const getScoresByMatch = () => {
    const matchScores = {};
    filteredScores.forEach(score => {
      const matchName = score.match_id?.match_name || 'Unknown Match';
      if (!matchScores[matchName]) {
        matchScores[matchName] = [];
      }
      matchScores[matchName].push(score.final_score);
    });

    return Object.keys(matchScores).map(matchName => ({
      name: matchName.length > 15 ? matchName.substring(0, 15) + '...' : matchName,
      averageScore: matchScores[matchName].reduce((sum, s) => sum + s, 0) / matchScores[matchName].length,
      count: matchScores[matchName].length,
    }));
  };

  const getScoresByDate = () => {
    const dateScores = {};
    filteredScores.forEach(score => {
      const date = format(new Date(score.scored_at || score.createdAt || new Date()), 'MMM dd');
      if (!dateScores[date]) {
        dateScores[date] = [];
      }
      dateScores[date].push(score.final_score);
    });

    return Object.keys(dateScores)
      .sort((a, b) => new Date(a) - new Date(b))
      .map(date => ({
        date,
        averageScore: dateScores[date].reduce((sum, s) => sum + s, 0) / dateScores[date].length,
        count: dateScores[date].length,
      }));
  };

  const stats = getScoreStatistics();

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
              Scored Matches
            </h1>
            <p className="text-gray-600">View and manage all matches you have scored</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Scores</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{filteredScores.length}</p>
                </div>
                <FiAward className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Avg Technical</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{stats.avgTechnical.toFixed(1)}</p>
                </div>
                <FiBarChart2 className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Avg Performance</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{stats.avgPerformance.toFixed(1)}</p>
                </div>
                <FiTrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Avg Final Score</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{stats.avgFinal.toFixed(1)}</p>
                </div>
                <FiCheckCircle className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Average Scores by Match</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getScoresByMatch()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="averageScore" fill="#8884d8" name="Average Score" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Scoring Trend</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getScoresByDate()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="averageScore" stroke="#8884d8" strokeWidth={2} name="Average Score" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <FiSearch className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search scores..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Match</label>
                <select
                  value={filterMatch}
                  onChange={(e) => setFilterMatch(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Matches</option>
                  {matches.map(m => (
                    <option key={m._id} value={m._id}>{m.match_name || 'Match'}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Scores Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Match</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Participant</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Technical</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Performance</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Final Score</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Scored Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredScores.map((score) => {
                    const participantName = score.participant_id?.player_id?.user_id?.username ||
                                          score.participant_id?.team_id?.team_name ||
                                          'N/A';

                    return (
                      <tr key={score._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-800">{score.match_id?.match_name || 'Match'}</div>
                          <div className="text-sm text-gray-500">{score.match_id?.category_id?.category_name || 'Category'}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{participantName}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                            {score.technical_score}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                            {score.performance_score}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">
                            {score.final_score}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {format(new Date(score.scored_at || score.createdAt || new Date()), 'MMM dd, yyyy HH:mm')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredScores.length === 0 && (
              <div className="p-12 text-center">
                <FiCheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Scores Found</h3>
                <p className="text-gray-600">No scores match your current filter criteria.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ScoredMatches;

