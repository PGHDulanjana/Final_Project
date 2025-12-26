import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import { teamService } from '../../services/teamService';
import { matchService } from '../../services/matchService';
import { scoreService } from '../../services/scoreService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import { motion } from 'framer-motion';
import {
  FiBarChart2,
  FiTrendingUp,
  FiAward,
  FiUsers,
  FiTarget,
  FiCheckCircle,
  FiXCircle,
  FiActivity
} from 'react-icons/fi';

const TeamStats = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [scores, setScores] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [loading, setLoading] = useState(true);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (selectedTeam !== 'all') {
      loadTeamStats();
    }
  }, [selectedTeam]);

  const loadData = async () => {
    if (!user?._id) return;

    setLoading(true);
    try {
      const [teamsRes, matchesRes, scoresRes] = await Promise.all([
        teamService.getTeams(),
        matchService.getMatches(),
        scoreService.getScores(),
      ]);

      setTeams(teamsRes.data || []);
      setMatches(matchesRes.data || []);
      setScores(scoresRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const loadTeamStats = async () => {
    // Load detailed stats for selected team
  };

  const calculateTeamStats = (teamId) => {
    const teamMatches = matches.filter(m =>
      m.participants?.some(p => p.team_id === teamId) || m.winner_id === teamId
    );
    const completedMatches = teamMatches.filter(m => m.status === 'Completed');
    const wins = completedMatches.filter(m => m.winner_id === teamId).length;
    const losses = completedMatches.length - wins;
    const draws = completedMatches.filter(m => !m.winner_id).length;

    // Calculate average scores
    const teamScores = scores.filter(s => {
      const match = matches.find(m => m._id === s.match_id);
      return match && match.participants?.some(p => p.team_id === teamId && p._id === s.participant_id);
    });
    const avgScore = teamScores.length > 0
      ? teamScores.reduce((sum, s) => sum + s.final_score, 0) / teamScores.length
      : 0;

    return {
      totalMatches: teamMatches.length,
      completedMatches: completedMatches.length,
      wins,
      losses,
      draws,
      winRate: completedMatches.length > 0 ? (wins / completedMatches.length) * 100 : 0,
      avgScore: avgScore.toFixed(1),
    };
  };

  const getAllTeamsStats = () => {
    return teams.map(team => ({
      name: team.team_name,
      ...calculateTeamStats(team._id),
    }));
  };

  const getPerformanceByMonth = (teamId) => {
    const teamMatches = matches.filter(m =>
      (m.participants?.some(p => p.team_id === teamId) || m.winner_id === teamId) &&
      m.status === 'Completed'
    );

    const monthlyData = {};
    teamMatches.forEach(match => {
      const month = new Date(match.scheduled_time).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!monthlyData[month]) {
        monthlyData[month] = { wins: 0, losses: 0, total: 0 };
      }
      monthlyData[month].total++;
      if (match.winner_id === teamId) {
        monthlyData[month].wins++;
      } else {
        monthlyData[month].losses++;
      }
    });

    return Object.keys(monthlyData).map(month => ({
      month,
      wins: monthlyData[month].wins,
      losses: monthlyData[month].losses,
    })).sort((a, b) => new Date(a.month) - new Date(b.month));
  };

  const getCategoryDistribution = (teamId) => {
    const teamMatches = matches.filter(m =>
      m.participants?.some(p => p.team_id === teamId)
    );

    const categoryCounts = {};
    teamMatches.forEach(match => {
      const category = match.category_id?.category_name || 'Unknown';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    return Object.keys(categoryCounts).map(category => ({
      name: category,
      value: categoryCounts[category],
    }));
  };

  const allTeamsStats = getAllTeamsStats();
  const selectedTeamData = teams.find(t => t._id === selectedTeam);
  const selectedTeamStats = selectedTeamData ? calculateTeamStats(selectedTeam) : null;
  const performanceData = selectedTeamData ? getPerformanceByMonth(selectedTeam) : [];
  const categoryData = selectedTeamData ? getCategoryDistribution(selectedTeam) : [];

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
              Team Statistics
            </h1>
            <p className="text-gray-600">Analyze your teams' performance and statistics</p>
          </div>

          {/* Team Selector */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Team
            </label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full md:w-1/3 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Teams Overview</option>
              {teams.map(team => (
                <option key={team._id} value={team._id}>{team.team_name}</option>
              ))}
            </select>
          </div>

          {selectedTeam === 'all' ? (
            /* All Teams Overview */
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Total Teams</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{teams.length}</p>
                    </div>
                    <FiUsers className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Total Matches</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">
                        {allTeamsStats.reduce((sum, s) => sum + s.totalMatches, 0)}
                      </p>
                    </div>
                    <FiActivity className="w-8 h-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Total Wins</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">
                        {allTeamsStats.reduce((sum, s) => sum + s.wins, 0)}
                      </p>
                    </div>
                    <FiAward className="w-8 h-8 text-yellow-600" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Avg Win Rate</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">
                        {allTeamsStats.length > 0
                          ? Math.round(allTeamsStats.reduce((sum, s) => sum + s.winRate, 0) / allTeamsStats.length)
                          : 0}%
                      </p>
                    </div>
                    <FiTrendingUp className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Teams Performance Chart */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Teams Performance Comparison</h2>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={allTeamsStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="wins" fill="#00C49F" name="Wins" />
                    <Bar dataKey="losses" fill="#FF8042" name="Losses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : selectedTeamStats ? (
            /* Selected Team Stats */
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Total Matches</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{selectedTeamStats.totalMatches}</p>
                    </div>
                    <FiActivity className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Wins</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{selectedTeamStats.wins}</p>
                    </div>
                    <FiCheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Losses</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{selectedTeamStats.losses}</p>
                    </div>
                    <FiXCircle className="w-8 h-8 text-red-600" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Win Rate</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{selectedTeamStats.winRate.toFixed(1)}%</p>
                    </div>
                    <FiTrendingUp className="w-8 h-8 text-yellow-600" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Avg Score</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{selectedTeamStats.avgScore}</p>
                    </div>
                    <FiTarget className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Performance Over Time */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Performance Over Time</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="wins" stroke="#00C49F" strokeWidth={2} name="Wins" />
                      <Line type="monotone" dataKey="losses" stroke="#FF8042" strokeWidth={2} name="Losses" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Category Distribution */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Category Distribution</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <FiBarChart2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Select a team to view detailed statistics</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default TeamStats;

