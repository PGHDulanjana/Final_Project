import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { matchService } from '../../services/matchService';
import { teamService } from '../../services/teamService';
import { tournamentService } from '../../services/tournamentService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import Layout from '../../components/Layout';
import { motion } from 'framer-motion';
import {
  FiCalendar,
  FiClock,
  FiMapPin,
  FiUsers,
  FiAward,
  FiFilter,
  FiRefreshCw
} from 'react-icons/fi';

const localizer = momentLocalizer(moment);

const Schedule = () => {
  const { user } = useAuth();
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    filterMatches();
  }, [matches, selectedTeam, filterStatus]);

  const loadData = async () => {
    if (!user?._id) return;

    setLoading(true);
    try {
      const [teamsRes, matchesRes, tournamentsRes] = await Promise.all([
        teamService.getTeams(),
        matchService.getMatches(),
        tournamentService.getTournaments(),
      ]);

      setTeams(teamsRes.data || []);
      setMatches(matchesRes.data || []);
      setTournaments(tournamentsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const filterMatches = () => {
    // Filter logic would go here
  };

  const getTeamMatches = () => {
    if (selectedTeam === 'all') {
      return matches.filter(m =>
        m.participants?.some(p => teams.some(t => t._id === p.team_id))
      );
    }
    return matches.filter(m =>
      m.participants?.some(p => p.team_id === selectedTeam) || m.winner_id === selectedTeam
    );
  };

  const getCalendarEvents = () => {
    const teamMatches = getTeamMatches();
    const filteredMatches = filterStatus === 'all'
      ? teamMatches
      : teamMatches.filter(m => m.status.toLowerCase() === filterStatus.toLowerCase());

    return filteredMatches.map(match => ({
      id: match._id,
      title: match.match_name || 'Match',
      start: new Date(match.scheduled_time),
      end: new Date(new Date(match.scheduled_time).getTime() + 30 * 60000), // 30 min duration
      resource: match,
    }));
  };

  const eventStyleGetter = (event) => {
    const match = event.resource;
    let backgroundColor = '#3174ad';

    if (match.status === 'Completed') {
      backgroundColor = '#7cb342';
    } else if (match.status === 'In Progress') {
      backgroundColor = '#f57c00';
    } else if (match.status === 'Scheduled') {
      backgroundColor = '#1976d2';
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  const handleSelectEvent = (event) => {
    const match = event.resource;
    toast.info(`${match.match_name} - ${match.status}`, {
      autoClose: 3000,
    });
  };

  const upcomingMatches = getTeamMatches()
    .filter(m => m.status === 'Scheduled' || m.status === 'In Progress')
    .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time))
    .slice(0, 5);

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
                  Team Schedule
                </h1>
                <p className="text-gray-600">View and manage your teams' match schedules</p>
              </div>
              <button
                onClick={loadData}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center"
              >
                <FiRefreshCw className="mr-2" />
                Refresh
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex items-end space-x-2">
                <button
                  onClick={() => setView('month')}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                    view === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setView('week')}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                    view === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setView('day')}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                    view === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Day
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar View */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Calendar View</h2>
              <Calendar
                localizer={localizer}
                events={getCalendarEvents()}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 600 }}
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventStyleGetter}
              />
            </div>

            {/* Upcoming Matches */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Upcoming Matches</h2>
              {upcomingMatches.length === 0 ? (
                <div className="text-center py-8">
                  <FiCalendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No upcoming matches</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingMatches.map((match) => {
                    const team = teams.find(t =>
                      match.participants?.some(p => p.team_id === t._id)
                    );

                    return (
                      <motion.div
                        key={match._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-800">{match.match_name}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            match.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {match.status}
                          </span>
                        </div>
                        {team && (
                          <p className="text-sm text-gray-600 mb-2">
                            <FiUsers className="inline w-4 h-4 mr-1" />
                            {team.team_name}
                          </p>
                        )}
                        <div className="flex items-center text-sm text-gray-600 mb-1">
                          <FiClock className="w-4 h-4 mr-1" />
                          {format(new Date(match.scheduled_time), 'MMM dd, yyyy HH:mm')}
                        </div>
                        {match.tournament_id?.venue && (
                          <div className="flex items-center text-sm text-gray-600">
                            <FiMapPin className="w-4 h-4 mr-1" />
                            {match.tournament_id.venue}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Schedule;

