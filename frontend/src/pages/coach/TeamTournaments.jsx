import React, { useState, useEffect } from 'react';
import { tournamentService } from '../../services/tournamentService';
import { teamService } from '../../services/teamService';
import { registrationService } from '../../services/registrationService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import Layout from '../../components/Layout';
import { motion } from 'framer-motion';
import {
  FiAward,
  FiCalendar,
  FiMapPin,
  FiUsers,
  FiDollarSign,
  FiSearch,
  FiFilter,
  FiClock,
  FiCheckCircle,
  FiXCircle
} from 'react-icons/fi';

const TeamTournaments = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    filterTournaments();
  }, [tournaments, selectedTeam, filterStatus, searchTerm]);

  const loadData = async () => {
    if (!user?._id) return;

    setLoading(true);
    try {
      const [teamsRes, tournamentsRes, registrationsRes] = await Promise.all([
        teamService.getTeams(),
        tournamentService.getTournaments(),
        registrationService.getRegistrations({ registration_type: 'Team' }),
      ]);

      setTeams(teamsRes.data || []);
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
    // This would filter based on team registrations
    // For now, showing all tournaments
  };

  const getTournamentStatus = (tournament) => {
    const now = new Date();
    const startDate = new Date(tournament.start_date);
    const endDate = new Date(tournament.end_date);
    const deadline = new Date(tournament.registration_deadline);

    if (endDate < now) return { status: 'Completed', color: 'gray' };
    if (deadline < now) return { status: 'Registration Closed', color: 'red' };
    if (startDate <= now && endDate >= now) return { status: 'In Progress', color: 'blue' };
    if (startDate > now) return { status: 'Upcoming', color: 'green' };
    return { status: 'Open', color: 'blue' };
  };

  const isTeamRegistered = (tournamentId, teamId) => {
    return registrations.some(
      reg => reg.tournament_id === tournamentId && reg.team_id === teamId
    );
  };

  const filteredTournaments = tournaments.filter(tournament => {
    const matchesSearch = tournament.tournament_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tournament.venue?.toLowerCase().includes(searchTerm.toLowerCase());
    const status = getTournamentStatus(tournament);
    const matchesStatus = filterStatus === 'all' || status.status.toLowerCase().includes(filterStatus.toLowerCase());
    return matchesSearch && matchesStatus;
  });

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
              Team Tournaments
            </h1>
            <p className="text-gray-600">View and manage tournament registrations for your teams</p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Team</label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Teams</option>
                  {teams.map(team => (
                    <option key={team._id} value={team._id}>{team.team_name}</option>
                  ))}
                </select>
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
                  onClick={() => setFilterStatus('upcoming')}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                    filterStatus === 'upcoming' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Upcoming
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
              const status = getTournamentStatus(tournament);
              const teamRegistrations = registrations.filter(
                reg => reg.tournament_id === tournament._id
              );

              return (
                <motion.div
                  key={tournament._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300"
                >
                  <div className={`h-2 ${
                    status.status === 'Upcoming' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                    status.status === 'In Progress' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                    'bg-gradient-to-r from-gray-500 to-gray-600'
                  }`}></div>
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{tournament.tournament_name}</h3>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            status.status === 'Upcoming' ? 'bg-green-100 text-green-700' :
                            status.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {status.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center text-gray-600 mb-1">
                          <FiCalendar className="w-5 h-5 mr-2" />
                          <span className="font-semibold">
                            {format(new Date(tournament.start_date), 'MMM dd, yyyy')} - {format(new Date(tournament.end_date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <FiMapPin className="w-5 h-5 mr-2" />
                          <span className="font-semibold">{tournament.venue}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center text-gray-600">
                        <FiDollarSign className="w-5 h-5 mr-2 text-blue-500" />
                        <span>Team Fee: Rs {tournament.entry_fee_team || 0}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <FiClock className="w-5 h-5 mr-2 text-blue-500" />
                        <span>Deadline: {format(new Date(tournament.registration_deadline), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <FiUsers className="w-5 h-5 mr-2 text-blue-500" />
                        <span>{teamRegistrations.length} Team(s) Registered</span>
                      </div>
                    </div>

                    {teamRegistrations.length > 0 && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-semibold text-blue-800 mb-2">Registered Teams:</p>
                        <div className="flex flex-wrap gap-2">
                          {teamRegistrations.map(reg => {
                            const team = teams.find(t => t._id === reg.team_id);
                            return team ? (
                              <span key={reg._id} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                {team.team_name} ({reg.approval_status})
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">{tournament.description}</p>
                      <button
                        onClick={() => {
                          toast.info('Team registration feature coming soon!');
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition duration-200"
                      >
                        Register Team
                      </button>
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
        </div>
      </div>
    </Layout>
  );
};

export default TeamTournaments;

