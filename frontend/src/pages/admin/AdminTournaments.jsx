import React, { useState, useEffect } from 'react';
import { tournamentService } from '../../services/tournamentService';
import { registrationService } from '../../services/registrationService';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import Layout from '../../components/Layout';
import { motion } from 'framer-motion';
import {
  FiAward,
  FiSearch,
  FiFilter,
  FiEdit,
  FiTrash2,
  FiUsers,
  FiCalendar,
  FiMapPin,
  FiDollarSign,
  FiX,
  FiCheckCircle,
  FiXCircle
} from 'react-icons/fi';

const AdminTournaments = () => {
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [filteredTournaments, setFilteredTournaments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [editForm, setEditForm] = useState({
    tournament_name: '',
    description: '',
    status: 'Draft',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterTournaments();
  }, [tournaments, searchTerm, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tournamentsRes, registrationsRes] = await Promise.all([
        tournamentService.getTournaments(),
        registrationService.getRegistrations(),
      ]);

      setTournaments(tournamentsRes.data || []);
      setRegistrations(registrationsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const filterTournaments = () => {
    let filtered = tournaments;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status.toLowerCase() === filterStatus.toLowerCase());
    }

    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.tournament_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.venue?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTournaments(filtered);
  };

  const handleDeleteTournament = async (tournamentId) => {
    if (!window.confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) return;

    try {
      await tournamentService.deleteTournament(tournamentId);
      toast.success('Tournament deleted successfully');
      loadData();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete tournament');
    }
  };

  const openEditModal = (tournament) => {
    setSelectedTournament(tournament);
    setEditForm({
      tournament_name: tournament.tournament_name || '',
      description: tournament.description || '',
      status: tournament.status || 'Draft',
    });
    setShowEditModal(true);
  };

  const handleUpdateTournament = async (e) => {
    e.preventDefault();
    if (!selectedTournament) return;

    setSubmitting(true);
    try {
      await tournamentService.updateTournament(selectedTournament._id, editForm);
      toast.success('Tournament updated successfully');
      setShowEditModal(false);
      setSelectedTournament(null);
      loadData();
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update tournament');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open':
        return 'bg-green-100 text-green-700';
      case 'Ongoing':
        return 'bg-blue-100 text-blue-700';
      case 'Completed':
        return 'bg-gray-100 text-gray-700';
      case 'Closed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
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
              Tournament Management
            </h1>
            <p className="text-gray-600">Manage all tournaments in the system</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Tournaments</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{tournaments.length}</p>
                </div>
                <FiAward className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Active</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {tournaments.filter(t => t.status === 'Open' || t.status === 'Ongoing').length}
                  </p>
                </div>
                <FiCheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Registrations</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{registrations.length}</p>
                </div>
                <FiUsers className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Completed</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {tournaments.filter(t => t.status === 'Completed').length}
                  </p>
                </div>
                <FiCheckCircle className="w-8 h-8 text-yellow-600" />
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
                  placeholder="Search tournaments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                    filterStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterStatus('open')}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                    filterStatus === 'open' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Open
                </button>
                <button
                  onClick={() => setFilterStatus('ongoing')}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                    filterStatus === 'ongoing' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Ongoing
                </button>
                <button
                  onClick={() => setFilterStatus('completed')}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                    filterStatus === 'completed' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Completed
                </button>
              </div>
            </div>
          </div>

          {/* Tournaments List */}
          <div className="space-y-4">
            {filteredTournaments.map((tournament) => {
              const tournamentRegistrations = registrations.filter(r => r.tournament_id === tournament._id);
              return (
                <motion.div
                  key={tournament._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300"
                >
                  <div className={`h-2 ${
                    tournament.status === 'Open' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                    tournament.status === 'Ongoing' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                    'bg-gradient-to-r from-gray-500 to-gray-600'
                  }`}></div>
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{tournament.tournament_name}</h3>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(tournament.status)}`}>
                            {tournament.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openEditModal(tournament)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Tournament"
                        >
                          <FiEdit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTournament(tournament._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete Tournament"
                        >
                          <FiTrash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center text-gray-600">
                        <FiCalendar className="w-5 h-5 mr-2 text-blue-500" />
                        <span>
                          {format(new Date(tournament.start_date), 'MMM dd, yyyy')} - {format(new Date(tournament.end_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <FiMapPin className="w-5 h-5 mr-2 text-blue-500" />
                        <span>{tournament.venue}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <FiUsers className="w-5 h-5 mr-2 text-blue-500" />
                        <span>{tournamentRegistrations.length} Registrations</span>
                      </div>
                    </div>

                    {tournament.description && (
                      <p className="text-gray-600 mb-4 line-clamp-2">{tournament.description}</p>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex items-center text-gray-600">
                        <FiDollarSign className="w-5 h-5 mr-2" />
                        <span>Individual: ${tournament.entry_fee_individual} / Team: ${tournament.entry_fee_team}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filteredTournaments.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <FiAward className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Tournaments Found</h3>
              <p className="text-gray-600">No tournaments match your current filter criteria.</p>
            </div>
          )}

          {/* Edit Tournament Modal */}
          {showEditModal && selectedTournament && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">Edit Tournament</h2>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedTournament(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleUpdateTournament} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tournament Name</label>
                    <input
                      type="text"
                      value={editForm.tournament_name}
                      onChange={(e) => setEditForm({ ...editForm, tournament_name: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                      <option value="Ongoing">Ongoing</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setSelectedTournament(null);
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
                      {submitting ? 'Updating...' : 'Update Tournament'}
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

export default AdminTournaments;

