import React, { useState, useEffect } from 'react';
import { teamService } from '../../services/teamService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import { motion } from 'framer-motion';
import {
  FiUsers,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiUserPlus,
  FiAward,
  FiBarChart2,
  FiX,
  FiSearch,
  FiFilter
} from 'react-icons/fi';

const MyTeams = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [teamForm, setTeamForm] = useState({
    team_name: '',
    team_type: 'Kata',
    description: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTeams();
  }, [user]);

  useEffect(() => {
    filterTeams();
  }, [teams, searchTerm, filterType]);

  const loadTeams = async () => {
    if (!user?._id) return;

    setLoading(true);
    try {
      const teamsRes = await teamService.getTeams();
      setTeams(teamsRes.data || []);
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const filterTeams = () => {
    let filtered = teams;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(team =>
        team.team_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(team => team.team_type === filterType);
    }

    setFilteredTeams(filtered);
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await teamService.createTeam({
        ...teamForm,
        coach_id: user?.coach_id || user?._id,
      });
      toast.success('Team created successfully!');
      setShowCreateTeam(false);
      setTeamForm({ team_name: '', team_type: 'Kata', description: '' });
      loadTeams();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create team');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    if (!selectedTeam) return;

    setSubmitting(true);
    try {
      await teamService.updateTeam(selectedTeam._id, teamForm);
      toast.success('Team updated successfully!');
      setShowTeamModal(false);
      setSelectedTeam(null);
      loadTeams();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update team');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('Are you sure you want to delete this team? This action cannot be undone.')) return;

    try {
      await teamService.deleteTeam(teamId);
      toast.success('Team deleted successfully!');
      loadTeams();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete team');
    }
  };

  const openEditModal = (team) => {
    setSelectedTeam(team);
    setTeamForm({
      team_name: team.team_name || '',
      team_type: team.team_type || 'Kata',
      description: team.description || '',
    });
    setShowTeamModal(true);
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
                  My Teams
                </h1>
                <p className="text-gray-600">Manage and organize your karate teams</p>
              </div>
              <button
                onClick={() => setShowCreateTeam(true)}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition duration-200 flex items-center shadow-lg"
              >
                <FiPlus className="w-5 h-5 mr-2" />
                Create Team
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <FiSearch className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search teams..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                    filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType('Kata')}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                    filterType === 'Kata' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Kata
                </button>
                <button
                  onClick={() => setFilterType('Kumite')}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                    filterType === 'Kumite' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Kumite
                </button>
                <button
                  onClick={() => setFilterType('Team Kata')}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                    filterType === 'Team Kata' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Team Kata
                </button>
              </div>
            </div>
          </div>

          {/* Teams Grid */}
          {filteredTeams.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <FiUsers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Teams Found</h3>
              <p className="text-gray-600 mb-6">
                {teams.length === 0
                  ? 'Create your first team to get started!'
                  : 'No teams match your search criteria.'}
              </p>
              {teams.length === 0 && (
                <button
                  onClick={() => setShowCreateTeam(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                >
                  Create Team
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTeams.map((team) => (
                <motion.div
                  key={team._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all border-2 border-gray-100"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-xl text-gray-800 mb-2">{team.team_name}</h3>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        {team.team_type}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(team)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit Team"
                      >
                        <FiEdit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete Team"
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {team.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{team.description}</p>
                  )}

                  <div className="flex items-center text-gray-600 mb-4">
                    <FiUserPlus className="w-5 h-5 mr-2" />
                    <span className="font-semibold">{team.members?.length || 0} Members</span>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        // Navigate to team detail or open team management
                        toast.info('Team management feature coming soon!');
                      }}
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition duration-200 flex items-center justify-center"
                    >
                      <FiUsers className="w-5 h-5 mr-2" />
                      Manage Team
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Create Team Modal */}
          {showCreateTeam && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">Create New Team</h2>
                  <button
                    onClick={() => {
                      setShowCreateTeam(false);
                      setTeamForm({ team_name: '', team_type: 'Kata', description: '' });
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleCreateTeam} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={teamForm.team_name}
                      onChange={(e) => setTeamForm({ ...teamForm, team_name: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter team name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={teamForm.team_type}
                      onChange={(e) => setTeamForm({ ...teamForm, team_type: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Kata">Kata</option>
                      <option value="Kumite">Kumite</option>
                      <option value="Team Kata">Team Kata</option>
                      <option value="Team Kumite">Team Kumite</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={teamForm.description}
                      onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Team description (optional)"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateTeam(false);
                        setTeamForm({ team_name: '', team_type: 'Kata', description: '' });
                      }}
                      className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Creating...' : 'Create Team'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {/* Edit Team Modal */}
          {showTeamModal && selectedTeam && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">Edit Team</h2>
                  <button
                    onClick={() => {
                      setShowTeamModal(false);
                      setSelectedTeam(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleUpdateTeam} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={teamForm.team_name}
                      onChange={(e) => setTeamForm({ ...teamForm, team_name: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={teamForm.team_type}
                      onChange={(e) => setTeamForm({ ...teamForm, team_type: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Kata">Kata</option>
                      <option value="Kumite">Kumite</option>
                      <option value="Team Kata">Team Kata</option>
                      <option value="Team Kumite">Team Kumite</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={teamForm.description}
                      onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTeamModal(false);
                        setSelectedTeam(null);
                      }}
                      className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Updating...' : 'Update Team'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default MyTeams;

