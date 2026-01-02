import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { tournamentService } from '../../services/tournamentService';
import { matchService } from '../../services/matchService';
import { categoryService } from '../../services/categoryService';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import { FiPlus, FiEdit, FiTrash2, FiCalendar, FiFilter, FiSearch, FiAward, FiMapPin } from 'react-icons/fi';
import { format } from 'date-fns';
import CreateTournamentModal from './CreateTournamentModal';

const localizer = momentLocalizer(moment);

const TournamentManagement = () => {
  const [view, setView] = useState('month'); // 'month', 'week', 'day', 'agenda'
  const [date, setDate] = useState(new Date());
  const [tournaments, setTournaments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingTournament, setDeletingTournament] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tournamentsRes, matchesRes, categoriesRes] = await Promise.all([
        tournamentService.getTournaments(),
        matchService.getMatches(),
        categoryService.getCategories(),
      ]);

      setTournaments(tournamentsRes.data || []);
      setMatches(matchesRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTournament = (tournament) => {
    setSelectedItem({ type: 'edit', data: tournament });
    setShowModal(true);
  };

  const handleDeleteTournament = async (tournamentId) => {
    if (!window.confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) {
      return;
    }

    setDeletingTournament(tournamentId);
    try {
      await tournamentService.deleteTournament(tournamentId);
      toast.success('Tournament deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting tournament:', error);
      toast.error(error.response?.data?.message || 'Failed to delete tournament');
    } finally {
      setDeletingTournament(null);
    }
  };

  const handleSelectEvent = (event) => {
    if (event.type === 'tournament') {
      handleEditTournament(event.data);
    } else {
      setSelectedItem(event);
      setShowModal(true);
    }
  };

  const handleSelectSlot = ({ start, end }) => {
    // Create new event
    setSelectedItem({ start, end, type: 'new' });
    setShowModal(true);
  };

  const eventStyleGetter = (event) => {
    let backgroundColor = '#3174ad';
    if (event.type === 'tournament') {
      backgroundColor = '#7cb342';
    } else if (event.type === 'match') {
      backgroundColor = '#f57c00';
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

  // Prepare calendar events
  const calendarEvents = [
    ...tournaments.map(t => ({
      id: t._id,
      title: t.tournament_name,
      start: new Date(t.start_date),
      end: new Date(t.end_date),
      type: 'tournament',
      data: t,
    })),
    ...matches.map(m => ({
      id: m._id,
      title: m.match_name || 'Match',
      start: new Date(m.scheduled_time),
      end: new Date(new Date(m.scheduled_time).getTime() + 30 * 60000), // 30 min duration
      type: 'match',
      data: m,
    })),
  ];

  const filteredTournaments = tournaments.filter(t => {
    const matchesStatus = filterStatus === 'all' || t.status.toLowerCase() === filterStatus.toLowerCase();
    const matchesSearch = t.tournament_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.venue?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Tournament Management</h1>
            <p className="text-gray-600">Manage tournaments, matches, and schedules</p>
          </div>
          <button
            onClick={() => {
              setSelectedItem({ type: 'new', category: 'tournament' });
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <FiPlus className="mr-2" />
            New Tournament
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search tournaments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg ${
                  filterStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('open')}
                className={`px-4 py-2 rounded-lg ${
                  filterStatus === 'open' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Open
              </button>
              <button
                onClick={() => setFilterStatus('upcoming')}
                className={`px-4 py-2 rounded-lg ${
                  filterStatus === 'upcoming' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setFilterStatus('completed')}
                className={`px-4 py-2 rounded-lg ${
                  filterStatus === 'completed' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Completed
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar View */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Calendar View</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setView('month')}
                  className={`px-3 py-1 rounded ${view === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                >
                  Month
                </button>
                <button
                  onClick={() => setView('week')}
                  className={`px-3 py-1 rounded ${view === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                >
                  Week
                </button>
                <button
                  onClick={() => setView('day')}
                  className={`px-3 py-1 rounded ${view === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                >
                  Day
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 600 }}
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}
                onSelectEvent={handleSelectEvent}
                onSelectSlot={handleSelectSlot}
                selectable
                eventPropGetter={eventStyleGetter}
              />
            )}
          </div>

          {/* Tournament List */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Tournaments ({filteredTournaments.length})
            </h2>
            {filteredTournaments.length === 0 ? (
              <div className="text-center py-8">
                <FiAward className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No tournaments found</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredTournaments.map(tournament => (
                  <div
                    key={tournament._id}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 mb-1">
                          {tournament.tournament_name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-1 flex items-center">
                          <FiMapPin className="w-3 h-3 mr-1" />
                          {tournament.venue}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(tournament.start_date), 'MMM dd, yyyy')} - {format(new Date(tournament.end_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTournament(tournament);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit tournament"
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTournament(tournament._id);
                          }}
                          disabled={deletingTournament === tournament._id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                          title="Delete tournament"
                        >
                          <FiTrash2 className={`w-4 h-4 ${deletingTournament === tournament._id ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        tournament.status === 'Open' ? 'bg-green-100 text-green-800' :
                        tournament.status === 'Ongoing' ? 'bg-blue-100 text-blue-800' :
                        tournament.status === 'Completed' ? 'bg-gray-100 text-gray-800' :
                        tournament.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {tournament.status}
                      </span>
                      <div className="text-xs text-gray-500">
                        Rs {tournament.entry_fee_individual || 0} / Rs {tournament.entry_fee_team || 0}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal for Create/Edit Tournament */}
        {showModal && (selectedItem?.type === 'new' || selectedItem?.type === 'edit') && (
          <CreateTournamentModal
            tournament={selectedItem?.type === 'edit' ? selectedItem.data : null}
            onClose={() => {
              setShowModal(false);
              setSelectedItem(null);
            }}
            onSuccess={() => {
              setShowModal(false);
              setSelectedItem(null);
              loadData();
            }}
          />
        )}
      </div>
    </Layout>
  );
};

export default TournamentManagement;

