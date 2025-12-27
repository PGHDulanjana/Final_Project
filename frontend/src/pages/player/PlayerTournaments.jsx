import { useState, useEffect } from 'react';
import { tournamentService } from '../../services/tournamentService';
import { registrationService } from '../../services/registrationService';
import { paymentService } from '../../services/paymentService';
import { categoryService } from '../../services/categoryService';
import { playerService } from '../../services/playerService';
import { processPayHerePayment, extractCustomerInfo } from '../../utils/payhere';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import Layout from '../../components/Layout';
import TournamentDetailModal from '../../components/TournamentDetailModal';
import PayHerePaymentModal from '../../components/PayHerePaymentModal';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const PlayerTournaments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [allTournaments, setAllTournaments] = useState([]); // Store all tournaments
  const [categories, setCategories] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [playerProfile, setPlayerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?._id) return;
    
    try {
      // Get player profile to find coach
      let playerProfileData = null;
      try {
        const playersRes = await playerService.getPlayers();
        const allPlayers = playersRes.data || [];
        playerProfileData = allPlayers.find(p => {
          const playerUserId = p.user_id?._id || p.user_id;
          return String(playerUserId) === String(user._id);
        });
        setPlayerProfile(playerProfileData);
      } catch (error) {
        console.error('Error loading player profile:', error);
      }

      const [tournamentsRes, registrationsRes, categoriesRes] = await Promise.all([
        tournamentService.getTournaments(),
        registrationService.getRegistrations(),
        categoryService.getCategories(),
      ]);

      const tournamentsData = tournamentsRes.data || [];
      const registrationsData = registrationsRes.data || [];
      
      setAllTournaments(tournamentsData);
      setRegistrations(registrationsData);
      setCategories(categoriesRes.data || []);

      // Show all tournaments created by organizers
      // Players can see all tournaments, but can only register for events in tournaments where their coach is registered
      setTournaments(tournamentsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const getTournamentCategories = (tournamentId) => {
    return categories.filter(cat => {
      const catTournamentId = cat.tournament_id?._id || cat.tournament_id;
      return catTournamentId?.toString() === tournamentId?.toString();
    });
  };

  const getTournamentCategoryInfo = (tournamentId) => {
    const tournamentCategories = getTournamentCategories(tournamentId);
    if (tournamentCategories.length === 0) {
      return { weightCategory: 'Open', beltRequirement: 'All Belts' };
    }

    // Get unique weight categories and belt categories
    const weightCats = [...new Set(tournamentCategories.map(cat => cat.weight_category).filter(Boolean))];
    const beltCats = [...new Set(tournamentCategories.map(cat => cat.belt_category).filter(Boolean))];

    // Format weight category
    let weightCategory = 'Open';
    if (weightCats.length > 0) {
      if (weightCats.length === 1) {
        weightCategory = weightCats[0];
      } else {
        weightCategory = 'Multiple';
      }
    }

    // Format belt requirement
    let beltRequirement = 'All Belts';
    if (beltCats.length > 0) {
      if (beltCats.length === 1) {
        const belt = beltCats[0];
        beltRequirement = belt === 'Black' ? 'Black Belt only' : 
                         belt === 'Brown' ? 'Brown Belt or higher' :
                         belt === 'Blue' ? 'Blue Belt or higher' :
                         belt === 'Yellow' ? 'Yellow Belt or higher' :
                         belt === 'White' ? 'White Belt or higher' :
                         `${belt} Belt or higher`;
      } else {
        // Multiple belt categories - show range
        const sortedBelts = ['White', 'Yellow', 'Orange', 'Green', 'Blue', 'Purple', 'Brown', 'Black'];
        const beltIndices = beltCats.map(b => sortedBelts.indexOf(b)).filter(i => i !== -1).sort((a, b) => a - b);
        if (beltIndices.length > 0) {
          const minBelt = sortedBelts[beltIndices[0]];
          const maxBelt = sortedBelts[beltIndices[beltIndices.length - 1]];
          beltRequirement = minBelt === maxBelt ? `${minBelt} Belt` : `${minBelt} to ${maxBelt} Belt`;
        }
      }
    }

    return { weightCategory, beltRequirement };
  };

  const getTournamentStatus = (tournament) => {
    const now = new Date();
    const startDate = new Date(tournament.start_date);
    const endDate = new Date(tournament.end_date);
    const deadline = new Date(tournament.registration_deadline);

    // Check if player is registered - handle both populated and non-populated tournament_id
    const registration = registrations.find(
      reg => {
        const regTournamentId = reg.tournament_id?._id || reg.tournament_id;
        const tournamentId = tournament._id;
        
        // Compare both as strings to handle ObjectId comparison issues
        return regTournamentId?.toString() === tournamentId?.toString() ||
               regTournamentId === tournamentId;
      }
    );

    if (registration) {
      return {
        status: 'Registered',
        registration: registration,
      };
    }

    // Check if tournament is completed
    if (endDate < now) {
      return {
        status: 'Completed',
        registration: null,
      };
    }

    // Check if registration is still open
    if (deadline > now && tournament.status === 'Open') {
      return {
        status: 'Upcoming',
        registration: null,
      };
    }

    // Past deadline or closed
    return {
      status: 'Closed',
      registration: null,
    };
  };

  const handleRegister = async (tournamentId, registrationData = null) => {
    if (!user || user.user_type !== 'Player') {
      toast.error('Only players can register for tournaments');
      return null;
    }

    setRegistering(tournamentId);
    try {
      const data = registrationData || {
        tournament_id: tournamentId,
        registration_type: 'Individual',
      };
      
      const response = await registrationService.registerForTournament(data);
      
      const registration = response.data;
      toast.success('Registration successful! Please complete payment if required.');
      
      // Reload data to get updated registration status
      await loadData();
      
      // Return registration data for payment processing
      return { data: registration };
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to register for tournament';
      
      // Provide helpful error messages
      if (errorMessage.includes('Player profile not found')) {
        toast.error('Player profile not found. Please contact support.');
      } else if (errorMessage.includes('Already registered')) {
        toast.warning('You are already registered for this tournament');
        loadData(); // Reload to show updated status
      } else if (errorMessage.includes('deadline')) {
        toast.error('Registration deadline has passed for this tournament');
      } else if (errorMessage.includes('not open')) {
        toast.error('This tournament is not currently open for registration');
      } else {
        toast.error(errorMessage);
      }
      return null;
    } finally {
      setRegistering(null);
    }
  };

  const handlePayment = async (registration) => {
    // Show payment modal first
    setSelectedRegistration(registration);
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    if (!selectedRegistration) return;

    try {
      const tournament = tournaments.find(t => 
        (t._id === selectedRegistration.tournament_id?._id) || 
        (t._id === selectedRegistration.tournament_id)
      );
      
      if (!tournament) {
        toast.error('Tournament not found');
        return;
      }

      const amount = selectedRegistration.registration_type === 'Individual' 
        ? tournament.entry_fee_individual 
        : tournament.entry_fee_team;

      const response = await paymentService.createPayment({
        registration_id: selectedRegistration._id,
        amount: amount,
        transaction_method: 'PayHere'
      });

      // Process PayHere payment
      if (response.data?.payhere) {
        // Extract customer info from registration
        const customerInfo = extractCustomerInfo(selectedRegistration);
        
        // Process payment using utility
        const success = processPayHerePayment(response, {
          items: `Tournament Entry Fee - ${tournament.tournament_name}`,
          customerInfo,
          method: 'form'
        });

        if (success) {
          toast.success('Redirecting to payment gateway...');
        } else {
          toast.error('Failed to redirect to payment gateway. Please try again.');
        }
      } else {
        toast.success('Payment processed successfully!');
        setShowPaymentModal(false);
        setSelectedRegistration(null);
        loadData();
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.message || 'Payment failed. Please try again.');
    }
  };

  const handleCancelRegistration = async (registrationId) => {
    if (!window.confirm('Are you sure you want to cancel this registration?')) {
      return;
    }

    try {
      await registrationService.deleteRegistration(registrationId);
      toast.success('Registration cancelled successfully');
      loadData();
    } catch (error) {
      console.error('Error cancelling registration:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel registration');
    }
  };

  const filteredTournaments = tournaments.filter(tournament => {
    const tournamentStatus = getTournamentStatus(tournament);
    const status = tournamentStatus.status.toLowerCase();
    
    // For "registered" filter, only show tournaments where player is actually registered
    let matchesFilter = true;
    if (filterStatus === 'registered') {
      matchesFilter = status === 'registered' && tournamentStatus.registration !== null;
    } else if (filterStatus === 'all') {
      matchesFilter = true; // Show all tournaments
    } else {
      matchesFilter = status === filterStatus.toLowerCase();
    }
    
    const matchesSearch = 
      tournament.tournament_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tournament.venue?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tournament.description?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const registeredCount = tournaments.filter(t => getTournamentStatus(t).status === 'Registered').length;
  const upcomingCount = tournaments.filter(t => getTournamentStatus(t).status === 'Upcoming').length;
  const completedCount = tournaments.filter(t => getTournamentStatus(t).status === 'Completed').length;

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
              My Tournaments
            </h1>
            <p className="text-gray-600">
              All tournaments and events. You can view all tournaments, but can only register for events in tournaments where your coach is registered.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Registered</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{registeredCount}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-cyan-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Upcoming</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{upcomingCount}</p>
                </div>
                <div className="p-3 bg-cyan-100 rounded-lg">
                  <svg className="w-8 h-8 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-indigo-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Completed</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{completedCount}</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search tournaments..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition duration-200 ${
                    filterStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterStatus('registered')}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition duration-200 ${
                    filterStatus === 'registered' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Registered
                </button>
                <button
                  onClick={() => setFilterStatus('upcoming')}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition duration-200 ${
                    filterStatus === 'upcoming' ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Upcoming
                </button>
                <button
                  onClick={() => setFilterStatus('completed')}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition duration-200 ${
                    filterStatus === 'completed' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
              const tournamentStatus = getTournamentStatus(tournament);
              const status = tournamentStatus.status;
              const registration = tournamentStatus.registration;
              const categoryInfo = getTournamentCategoryInfo(tournament._id);
              const tournamentCategories = getTournamentCategories(tournament._id);
              const primaryCategory = tournamentCategories[0] || {};

              return (
                <div key={tournament._id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300">
                  <div className={`h-2 ${
                    status === 'Registered' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                    status === 'Upcoming' ? 'bg-gradient-to-r from-cyan-500 to-blue-500' :
                    'bg-gradient-to-r from-indigo-500 to-purple-500'
                  }`}></div>
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{tournament.tournament_name}</h3>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                            {primaryCategory.category_type || tournamentCategories.map(c => c.category_type).join(', ') || 'Tournament'}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            status === 'Registered' ? 'bg-green-100 text-green-700' :
                            status === 'Upcoming' ? 'bg-cyan-100 text-cyan-700' :
                            'bg-indigo-100 text-indigo-700'
                          }`}>
                            {status}
                          </span>
                          {categoryInfo.weightCategory && categoryInfo.weightCategory !== 'Open' && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                              {categoryInfo.weightCategory}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center text-gray-600 mb-1">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="font-semibold">{format(new Date(tournament.start_date), 'yyyy-MM-dd')}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="font-semibold">{tournament.venue}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Belt Requirement</p>
                        <p className="font-medium text-gray-800">{categoryInfo.beltRequirement}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Registration Deadline</p>
                        <p className="font-medium text-gray-800">{format(new Date(tournament.registration_deadline), 'yyyy-MM-dd')}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-gray-600">
                          {status === 'Registered' 
                            ? registration?.payment_status === 'Paid'
                              ? 'You are registered and paid for this tournament'
                              : 'You are registered. Payment pending.'
                            : status === 'Upcoming' 
                              ? 'Registration deadline approaching' 
                              : 'Tournament has concluded'}
                        </span>
                      </div>
                      <div className="space-x-2">
                        <button 
                          onClick={() => setSelectedTournamentId(tournament._id)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition duration-200 flex items-center"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Details
                        </button>
                        {status === 'Registered' && registration && (
                          <>
                            {registration.payment_status !== 'Paid' && (
                              <div className="px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                                <p className="font-semibold">Payment Pending</p>
                                <p className="text-xs mt-1">Complete your payment to finalize registration</p>
                              </div>
                            )}
                            <button 
                              onClick={() => handleCancelRegistration(registration._id)}
                              className="px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 transition duration-200 flex items-center"
                            >
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredTournaments.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Tournaments Found</h3>
              {filterStatus === 'registered' ? (
                <div>
                  <p className="text-gray-600 mb-4">
                    You haven't registered for any events yet.
                  </p>
                  <button
                    onClick={() => {
                      setFilterStatus('all');
                      setSearchTerm('');
                    }}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition"
                  >
                    Browse All Tournaments
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-2">
                    No tournaments found matching your search criteria.
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    {!playerProfile || !playerProfile.coach_id 
                      ? 'You can view all tournaments, but need a coach assigned to register for events. Please contact support to assign a coach.'
                      : 'You can view all tournaments. To register for events, your coach must first register for the tournament.'}
                  </p>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tournament Detail Modal */}
      {selectedTournamentId && (
        <TournamentDetailModal
          tournamentId={selectedTournamentId}
          onClose={() => {
            setSelectedTournamentId(null);
            loadData(); // Reload data when modal closes
          }}
          onRegister={handleRegister}
          onPayment={handlePayment}
        />
      )}

      {/* PayHere Payment Modal */}
      {showPaymentModal && selectedRegistration && (
        <PayHerePaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedRegistration(null);
          }}
          registration={selectedRegistration}
          tournament={tournaments.find(t => {
            const regTournamentId = selectedRegistration.tournament_id?._id || selectedRegistration.tournament_id;
            return t._id === regTournamentId || t._id?.toString() === regTournamentId?.toString();
          })}
          enableCardOption={false}
          onSuccess={() => {
            setShowPaymentModal(false);
            setSelectedRegistration(null);
            loadData();
          }}
        />
      )}
    </Layout>
  );
};

export default PlayerTournaments;

