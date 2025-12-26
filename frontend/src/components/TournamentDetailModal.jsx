import { useState, useEffect } from 'react';
import { tournamentService } from '../services/tournamentService';
import { categoryService } from '../services/categoryService';
import { registrationService } from '../services/registrationService';
import { playerService } from '../services/playerService';
import { teamService } from '../services/teamService';
import { dojoService } from '../services/dojoService';
import { matchService } from '../services/matchService';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { FiX, FiCalendar, FiMapPin, FiDollarSign, FiUsers, FiClock, FiUser, FiCheck, FiUserPlus, FiPlus, FiTarget, FiAward } from 'react-icons/fi';
import { toast } from 'react-toastify';
import PayHerePaymentModal from './PayHerePaymentModal';
import { processPayHerePayment } from '../utils/payhere';

const TournamentDetailModal = ({ tournamentId, onClose, onRegister, onPayment }) => {
  const { user } = useAuth();
  const isOrganizer = user?.user_type === 'Organizer';
  const isCoach = user?.user_type === 'Coach';
  const [tournament, setTournament] = useState(null);
  const [categories, setCategories] = useState([]);
  const [matches, setMatches] = useState([]);
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [formData, setFormData] = useState({
    registration_type: 'Individual',
    coach_id: null,
  });
  
  // Coach-specific states
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedEventForRegistration, setSelectedEventForRegistration] = useState(null);
  const [eventRegistrationForm, setEventRegistrationForm] = useState({
    category_id: '',
    player_id: '',
    team_id: '',
    registration_type: 'Individual'
  });
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState(null);
  const [pendingCategory, setPendingCategory] = useState(null);

  useEffect(() => {
    if (tournamentId) {
      loadTournamentDetails();
    }
  }, [tournamentId]);

  const loadTournamentDetails = async () => {
    if (!tournamentId) {
      console.error('TournamentDetailModal: No tournamentId provided');
      return;
    }
    
    try {
      setLoading(true);
      const promises = [
        tournamentService.getTournament(tournamentId),
        categoryService.getCategories({ tournament_id: tournamentId }),
        matchService.getMatches({ tournament_id: tournamentId }),
        registrationService.getRegistrations({ tournament_id: tournamentId }),
      ];

      // Load players, teams, and dojos if coach
      if (isCoach) {
        promises.push(
          playerService.getPlayers(),
          teamService.getTeams(),
          dojoService.getDojos()
        );
      }

      const results = await Promise.all(promises);
      
      // Services return response.data, which is { success: true, data: ... } from backend
      // So we need to access .data to get the actual tournament/categories/etc
      const tournamentResponse = results[0];
      const categoriesResponse = results[1];
      const matchesResponse = results[2];
      const registrationsResponse = results[3];
      
      // Extract data - services return { success: true, data: ... }, so access .data
      const tournamentData = tournamentResponse?.data || null;
      const categoriesData = categoriesResponse?.data || categoriesResponse || [];
      const matchesData = matchesResponse?.data || matchesResponse || [];
      const registrationsData = registrationsResponse?.data || registrationsResponse || [];
      
      if (!tournamentData) {
        console.error('❌ Tournament data is null or undefined!');
        console.error('Full tournament response:', tournamentResponse);
        throw new Error('Tournament data not found');
      }
      
      setTournament(tournamentData);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setMatches(Array.isArray(matchesData) ? matchesData : []);
      // Check if coach/judge is registered
      const allRegistrations = Array.isArray(registrationsData) ? registrationsData : [];
      const coachRegistration = allRegistrations.find(r => 
        r.registration_type === 'Coach' && 
        (r.coach_id?._id || r.coach_id) === (user?.coach_id || user?._id)
      );
      const judgeRegistration = allRegistrations.find(r => 
        r.registration_type === 'Judge' && 
        (r.judge_id?._id || r.judge_id) === (user?.judge_id || user?._id)
      );
      setRegistration(coachRegistration || judgeRegistration || allRegistrations[0] || null);
      
      if (isCoach) {
        // For coach, players/teams/dojos are in results[4], [5], [6] after registrations
        const allPlayers = results[4]?.data || results[4] || [];
        const allTeams = results[5]?.data || results[5] || [];
        const allDojos = results[6]?.data || results[6] || [];
        
        // Get coach's dojo information
        let coachDojoName = null;
        if (user?.coach_id) {
          const coachDojo = allDojos.find(d => {
            const dojoCoachId = d.coach_id?._id || d.coach_id;
            return dojoCoachId === user.coach_id || dojoCoachId?.toString() === user.coach_id?.toString();
          });
          if (coachDojo) {
            coachDojoName = coachDojo.dojo_name?.toLowerCase().trim();
          }
        }
        
        // Filter players by coach name and dojo name
        const coachFullName = user?.first_name && user?.last_name 
          ? `${user.first_name} ${user.last_name}`.toLowerCase().trim()
          : user?.username?.toLowerCase().trim() || '';
        
        const coachPlayers = allPlayers.filter(p => {
          // Check by coach_id (if player selected coach from dropdown)
          const coachId = p.coach_id?._id || p.coach_id;
          if (coachId === user?.coach_id || coachId === user?._id) {
            return true;
          }
          
          // Check by coach_name and dojo_name (if player registered with coach name and dojo)
          if (p.coach_name && p.dojo_name) {
            const playerCoachName = p.coach_name.toLowerCase().trim();
            const playerDojoName = p.dojo_name.toLowerCase().trim();
            
            // Check if coach name matches
            const nameMatches = coachFullName && (
              playerCoachName.includes(coachFullName) || 
              coachFullName.includes(playerCoachName) ||
              playerCoachName === coachFullName
            );
            
            // Check if dojo name matches (if coach has a dojo)
            let dojoMatches = true; // Default to true if coach doesn't have dojo info
            if (coachDojoName) {
              dojoMatches = playerDojoName.includes(coachDojoName) || 
                           coachDojoName.includes(playerDojoName) ||
                           playerDojoName === coachDojoName;
            }
            
            // Player must match both coach name AND dojo name
            if (nameMatches && dojoMatches) {
              return true;
            }
          }
          
          return false;
        });
        
        // Filter teams by coach
        const coachTeams = allTeams.filter(t => {
          const coachId = t.coach_id?._id || t.coach_id;
          return coachId === user?.coach_id || coachId === user?._id;
        });
        
        setPlayers(coachPlayers);
        setTeams(coachTeams);
      }
    } catch (error) {
      console.error('Error loading tournament details:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Show error message but don't close modal - let user see the error
      toast.error(error.response?.data?.message || 'Failed to load tournament details');
      
      // Set tournament to null so error state is shown
      setTournament(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterClick = () => {
    // Show registration form instead of registering directly
    setShowRegistrationForm(true);
  };

  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    setRegistering(true);
    
    try {
      const registrationData = {
        tournament_id: tournamentId,
        registration_type: formData.registration_type,
        ...(formData.coach_id && { coach_id: formData.coach_id }),
      };

      let registration;
      if (onRegister) {
        // onRegister should return the registration data
        const result = await onRegister(tournamentId, registrationData);
        registration = result?.data || result;
      } else {
        const response = await registrationService.registerForTournament(registrationData);
        registration = response.data;
        toast.success('Registration successful!');
      }
      
      setShowRegistrationForm(false);
      await loadTournamentDetails(); // Reload to update registration status
      
      // Check if payment is needed
      if (tournament && onPayment && registration) {
        const entryFee = formData.registration_type === 'Individual' 
          ? tournament.entry_fee_individual 
          : tournament.entry_fee_team;
        
        if (entryFee > 0) {
          // Small delay to ensure registration is saved and modal updates
          setTimeout(() => {
            onPayment(registration);
            onClose(); // Close detail modal to show payment modal
          }, 800);
        } else {
          // No payment needed, just close the modal
          setTimeout(() => {
            onClose();
          }, 500);
        }
      } else {
        // No payment callback, just close after a moment
        setTimeout(() => {
          onClose();
        }, 500);
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.message || 'Failed to register for tournament');
    } finally {
      setRegistering(false);
    }
  };

  const getTournamentStatus = () => {
    if (!tournament) return 'Unknown';
    if (registration) return 'Registered';
    
    const now = new Date();
    const endDate = new Date(tournament.end_date);
    const deadline = new Date(tournament.registration_deadline);

    if (endDate < now) return 'Completed';
    if (deadline > now && tournament.status === 'Open') return 'Upcoming';
    return 'Closed';
  };

  // Always render modal if tournamentId is provided, even if loading or error
  if (!tournamentId) {
    return null;
  }

  if (loading) {
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" 
        onClick={onClose}
        style={{ zIndex: 9999 }}
      >
        <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading tournament details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" 
        onClick={onClose}
        style={{ zIndex: 9999 }}
      >
        <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Tournament Not Found</h3>
            <p className="text-gray-600 mb-4">Unable to load tournament details. Please try again.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  loadTournamentDetails();
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const status = getTournamentStatus();
  const isUpcoming = status === 'Upcoming' && !registration;

  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" 
      onClick={onClose}
      style={{ zIndex: 9999 }}
    >
      <div 
        className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" 
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 10000 }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 rounded-t-xl flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-2">{tournament?.tournament_name || 'Tournament'}</h2>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm font-semibold">
                {tournament.status}
              </span>
              {registration && (
                <span className="px-3 py-1 bg-green-500 rounded-full text-sm font-semibold">
                  Registered
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Description */}
          {tournament.description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Description</h3>
              <p className="text-gray-600">{tournament.description}</p>
            </div>
          )}

          {/* Key Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <FiCalendar className="w-5 h-5 text-blue-600 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Start Date</p>
                  <p className="font-semibold text-gray-800">
                    {format(new Date(tournament.start_date), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <FiCalendar className="w-5 h-5 text-blue-600 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">End Date</p>
                  <p className="font-semibold text-gray-800">
                    {format(new Date(tournament.end_date), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <FiClock className="w-5 h-5 text-blue-600 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Registration Deadline</p>
                  <p className="font-semibold text-gray-800">
                    {format(new Date(tournament.registration_deadline), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <FiMapPin className="w-5 h-5 text-blue-600 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Venue</p>
                  <p className="font-semibold text-gray-800">{tournament.venue}</p>
                  <p className="text-sm text-gray-600">{tournament.venue_address}</p>
                </div>
              </div>
              {categories.length > 0 && (
                <div className="flex items-start space-x-3">
                  <FiDollarSign className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Events with Entry Fees</p>
                    <p className="font-semibold text-gray-800">
                      {categories.length} event{categories.length !== 1 ? 's' : ''} available
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Entry fees are set per event. View events below for details.
                    </p>
                  </div>
                </div>
              )}
              {tournament.max_participants && (
                <div className="flex items-start space-x-3">
                  <FiUsers className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Max Participants</p>
                    <p className="font-semibold text-gray-800">{tournament.max_participants}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Categories - Show to Coaches, Judges, and Organizers */}
          {(user?.user_type === 'Coach' || user?.user_type === 'Judge' || user?.user_type === 'Organizer') && (
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FiAward className="w-5 h-5" />
                Events Created by {(() => {
                  const organizer = tournament?.organizer_id;
                  if (organizer?.user_id) {
                    const organizerUser = organizer.user_id;
                    if (organizerUser.first_name && organizerUser.last_name) {
                      return `${organizerUser.first_name} ${organizerUser.last_name}`;
                    } else if (organizerUser.username) {
                      return organizerUser.username;
                    }
                  }
                  if (organizer?.organization_name) {
                    return organizer.organization_name;
                  }
                  return 'Organizer';
                })()} ({categories.length})
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                All events created by the organizer for this tournament. {user?.user_type === 'Judge' && 'As a judge, you can view all events to understand the tournament structure.'} {user?.user_type === 'Coach' && 'As a coach, you can view all events and register your players/teams for them.'}
              </p>
              {categories.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-gray-600">No events created yet by the organizer</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categories.map((category) => (
                    <div key={category._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-800">{category.category_name}</h4>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                          {category.category_type}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600 mb-3">
                        {category.use_custom_belt_levels && (
                          <>
                            {category.belt_level_group && (
                              <p><span className="font-medium">Belt Level Group:</span> {category.belt_level_group}</p>
                            )}
                            {category.belt_level && (
                              <p><span className="font-medium">Belt Level:</span> {category.belt_level}</p>
                            )}
                            {!category.belt_level_group && !category.belt_level && (
                              <p><span className="font-medium">Belt Level:</span> Open (All Levels)</p>
                            )}
                          </>
                        )}
                        {!category.use_custom_belt_levels && category.belt_category && (
                          <p><span className="font-medium">Belt:</span> {category.belt_category}</p>
                        )}
                        {(category.category_type === 'Kumite' || category.category_type === 'Team Kumite') && category.weight_category && (
                          <p><span className="font-medium">Weight:</span> {category.weight_category}</p>
                        )}
                        {category.age_category && (
                          <p><span className="font-medium">Age:</span> {category.age_category}</p>
                        )}
                        <p><span className="font-medium">Type:</span> {category.participation_type}</p>
                        {category.participation_type === 'Individual' && (
                          <p><span className="font-medium">Fee:</span> ${category.individual_player_fee?.toFixed(2) || '0.00'}</p>
                        )}
                        {category.participation_type === 'Team' && (
                          <p><span className="font-medium">Team Fee ({category.team_size || 3} members):</span> ${category.team_event_fee?.toFixed(2) || '0.00'}</p>
                        )}
                        {category.is_open_event && (
                          <p><span className="font-medium text-yellow-600">Open Event</span> (No restrictions)</p>
                        )}
                      </div>
                      {/* Register buttons for coaches */}
                      {isCoach && (
                        <div className="pt-3 border-t border-gray-200 space-y-2">
                          {category.participation_type === 'Individual' && (
                            <button
                              onClick={() => {
                                setSelectedEventForRegistration(category);
                                setEventRegistrationForm({
                                  category_id: category._id,
                                  player_id: '',
                                  team_id: '',
                                  registration_type: 'Individual'
                                });
                              }}
                              className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold flex items-center justify-center gap-2"
                            >
                              <FiUserPlus className="w-4 h-4" />
                              Register Player
                            </button>
                          )}
                          {category.participation_type === 'Team' && (
                            <button
                              onClick={() => {
                                setSelectedEventForRegistration(category);
                                setEventRegistrationForm({
                                  category_id: category._id,
                                  player_id: '',
                                  team_id: '',
                                  registration_type: 'Team'
                                });
                              }}
                              className="w-full bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition text-sm font-semibold flex items-center justify-center gap-2"
                            >
                              <FiUsers className="w-4 h-4" />
                              Register Team
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Coach/Judge Registration */}
          {(isCoach || user?.user_type === 'Judge') && !registration && tournament.status === 'Open' && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {isCoach ? 'Register as Coach' : 'Register as Judge'}
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                {isCoach 
                  ? 'Register for this tournament to manage your players and teams in events. Registration is FREE.'
                  : 'Register for this tournament to be assigned to matches for judging. Registration is FREE.'}
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-4">
                <p className="text-xs text-green-800 font-semibold">
                  ✓ FREE Registration - No payment required for coaches and judges
                </p>
              </div>
              <button
                onClick={async () => {
                  setRegistering(true);
                  try {
                    
                    // Backend finds coach/judge by user_id, so we don't need to send coach_id/judge_id
                    // But we can send it if it exists for reference
                    const registrationData = {
                      tournament_id: tournamentId,
                      registration_type: isCoach ? 'Coach' : 'Judge'
                    };
                    
                    // Only include coach_id if it exists and is valid
                    if (isCoach && user?.coach_id) {
                      registrationData.coach_id = user.coach_id;
                    }
                    
                    // Only include judge_id if it exists and is valid
                    if (user?.user_type === 'Judge' && user?.judge_id) {
                      registrationData.judge_id = user.judge_id;
                    }
                    
                    
                    await registrationService.registerForTournament(registrationData);
                    toast.success(`Successfully registered as ${isCoach ? 'coach' : 'judge'}! Registration is free.`);
                    await loadTournamentDetails();
                  } catch (error) {
                    console.error('TournamentDetailModal: Registration error:', error);
                    console.error('TournamentDetailModal: Error response:', error.response?.data);
                    const errorMessage = error.response?.data?.message || 
                                      (error.response?.data?.errors && Array.isArray(error.response.data.errors) 
                                        ? error.response.data.errors.map(e => e.message || e).join(', ')
                                        : null) ||
                                      error.message ||
                                      'Failed to register';
                    toast.error(errorMessage);
                  } finally {
                    setRegistering(false);
                  }
                }}
                disabled={registering}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {registering ? 'Registering...' : `Register as ${isCoach ? 'Coach' : 'Judge'} (FREE)`}
              </button>
            </div>
          )}

          {/* Registration Status */}
          {registration && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Your Registration</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className={`font-semibold ${
                    registration.approval_status === 'Approved' ? 'text-green-600' :
                    registration.approval_status === 'Pending' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {registration.approval_status}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment</p>
                  <p className={`font-semibold ${
                    registration.payment_status === 'Paid' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {registration.payment_status}
                  </p>
                </div>
              </div>
              {(registration.registration_type === 'Coach' || registration.registration_type === 'Judge') && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800 font-semibold">
                      ✓ FREE Registration - No payment required for {registration.registration_type === 'Coach' ? 'coaches' : 'judges'}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      {registration.registration_type === 'Coach' 
                        ? 'You can now register your players and teams for events. Player/team registrations may have entry fees.'
                        : 'You can now view all events and will be assigned to matches by the organizer.'}
                    </p>
                  </div>
                </div>
              )}
              {registration.payment_status === 'Pending' && registration.registration_type !== 'Coach' && registration.registration_type !== 'Judge' && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">
                    Payment required when registering for events. Entry fees are set per event.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Matches Section */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FiTarget className="w-5 h-5" />
              Matches ({matches.length})
            </h3>
            {matches.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-gray-600">No matches scheduled yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {matches.map((match) => (
                  <div key={match._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-800">{match.match_name || 'Match'}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        match.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                        match.status === 'Scheduled' ? 'bg-yellow-100 text-yellow-700' :
                        match.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {match.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><span className="font-medium">Type:</span> {match.match_type}</p>
                      <p><span className="font-medium">Scheduled:</span> {format(new Date(match.scheduled_time), 'MMM dd, yyyy HH:mm')}</p>
                      {match.venue_area && <p><span className="font-medium">Venue:</span> {match.venue_area}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rules */}
          {tournament.rules && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Rules</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-line">{tournament.rules}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            {/* Hide registration for organizers - they create tournaments, not register */}
            {!isOrganizer && !isCoach && user?.user_type !== 'Judge' && (
              <>
                {/* Show Register button for players only (not coaches/judges) */}
                {isUpcoming && !showRegistrationForm && !registration ? (
                  <button
                    onClick={handleRegisterClick}
                    className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition duration-200 flex items-center"
                  >
                    <FiUser className="w-4 h-4 mr-2" />
                    Register Tournament
                  </button>
                ) : (
                  // Show Close button when registration form is visible, or when already registered, or tournament is closed
                  !showRegistrationForm && (
                    <button
                      onClick={onClose}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                    >
                      Close
                    </button>
                  )
                )}
                {registration && registration.payment_status === 'Pending' && onPayment && (
                  <button
                    onClick={() => {
                      onPayment(registration);
                      onClose();
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition duration-200"
                  >
                    Pay Entry Fee
                  </button>
                )}
              </>
            )}
            {/* For organizers, just show Close button */}
            {isOrganizer && (
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Close
              </button>
            )}
          </div>

          {/* Registration Form - Only for players (not coaches/judges/organizers) */}
          {!isOrganizer && !isCoach && user?.user_type !== 'Judge' && showRegistrationForm && (
            <div className="mt-6 p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center">
                  <FiUser className="w-5 h-5 mr-2 text-blue-600" />
                  Tournament Registration Form
                </h3>
                <button
                  onClick={() => setShowRegistrationForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRegistrationSubmit} className="space-y-4">
                <div className="bg-white p-4 rounded-lg">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Registration Type <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                        formData.registration_type === 'Individual' 
                          ? 'border-blue-600 bg-blue-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}>
                        <input
                          type="radio"
                          name="registration_type"
                          value="Individual"
                          checked={formData.registration_type === 'Individual'}
                          onChange={(e) => setFormData({ ...formData, registration_type: e.target.value })}
                          className="mr-3"
                        />
                        <div>
                          <div className="font-semibold text-gray-800">Individual</div>
                          <div className="text-xs text-gray-600">Register as an individual player</div>
                        </div>
                      </label>
                      <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                        formData.registration_type === 'Team' 
                          ? 'border-blue-600 bg-blue-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}>
                        <input
                          type="radio"
                          name="registration_type"
                          value="Team"
                          checked={formData.registration_type === 'Team'}
                          onChange={(e) => setFormData({ ...formData, registration_type: e.target.value })}
                          className="mr-3"
                        />
                        <div>
                          <div className="font-semibold text-gray-800">Team</div>
                          <div className="text-xs text-gray-600">Register as part of a team</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Entry fees are set at the event level. After registration, you'll select specific events and pay fees for each event you register for.
                    </p>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> By registering, you agree to the tournament rules and regulations. 
                      Payment will be required when you register for specific events.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowRegistrationForm(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={registering}
                    className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {registering ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Registering...
                      </>
                    ) : (
                      <>
                        <FiCheck className="w-4 h-4 mr-2" />
                        Confirm Registration
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Event Registration Form for Coaches */}
          {isCoach && selectedEventForRegistration && (
            <div className="mt-6 p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center">
                  <FiPlus className="w-5 h-5 mr-2 text-blue-600" />
                  Register for {selectedEventForRegistration.category_name}
                </h3>
                <button
                  onClick={() => {
                    setSelectedEventForRegistration(null);
                    setEventRegistrationForm({
                      category_id: '',
                      player_id: '',
                      team_id: '',
                      registration_type: 'Individual'
                    });
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!eventRegistrationForm.category_id) {
                  toast.error('Please select an event');
                  return;
                }
                if (selectedEventForRegistration.participation_type === 'Individual' && !eventRegistrationForm.player_id) {
                  toast.error('Please select a player');
                  return;
                }
                if (selectedEventForRegistration.participation_type === 'Team' && !eventRegistrationForm.team_id) {
                  toast.error('Please select a team');
                  return;
                }

                setRegistering(true);
                try {
                  // Build registration data object, only including fields that have values
                  const registrationData = {
                    tournament_id: tournamentId,
                    category_id: eventRegistrationForm.category_id,
                    registration_type: selectedEventForRegistration.participation_type
                  };

                  // Only include player_id or team_id if they have valid values
                  if (selectedEventForRegistration.participation_type === 'Individual' && eventRegistrationForm.player_id) {
                    registrationData.player_id = eventRegistrationForm.player_id;
                  }
                  
                  if (selectedEventForRegistration.participation_type === 'Team' && eventRegistrationForm.team_id) {
                    registrationData.team_id = eventRegistrationForm.team_id;
                  }

                  // Only include coach_id if it exists and is valid
                  if (user?.coach_id) {
                    registrationData.coach_id = user.coach_id;
                  }

                  // Create registration first (with Pending payment status)
                  const registrationResponse = await registrationService.registerForTournament(registrationData);
                  const newRegistration = registrationResponse.data || registrationResponse;
                  
                  // Check if payment is required
                  const entryFee = selectedEventForRegistration.participation_type === 'Individual' 
                    ? selectedEventForRegistration.individual_player_fee || 0
                    : selectedEventForRegistration.team_event_fee || 0;
                  
                  if (entryFee > 0) {
                    // Show payment modal
                    setPendingRegistration(newRegistration);
                    setPendingCategory(selectedEventForRegistration);
                    setShowPaymentModal(true);
                    toast.info('Please complete payment to finalize registration');
                  } else {
                    // No payment required, registration is complete
                    toast.success(`${selectedEventForRegistration.participation_type === 'Individual' ? 'Player' : 'Team'} registered successfully!`);
                    setSelectedEventForRegistration(null);
                    setEventRegistrationForm({
                      category_id: '',
                      player_id: '',
                      team_id: '',
                      registration_type: 'Individual'
                    });
                    await loadTournamentDetails();
                  }
                } catch (error) {
                  console.error('Registration error:', error);
                  const errorMessage = error.response?.data?.message || 
                                     (error.response?.data?.errors && Array.isArray(error.response.data.errors) 
                                       ? error.response.data.errors.map(e => e.message || e).join(', ')
                                       : null) ||
                                     `Failed to register ${selectedEventForRegistration.participation_type === 'Individual' ? 'player' : 'team'}`;
                  toast.error(errorMessage);
                } finally {
                  setRegistering(false);
                }
              }} className="space-y-4">
                <div className="bg-white p-4 rounded-lg">
                  {selectedEventForRegistration.participation_type === 'Individual' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Player <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={eventRegistrationForm.player_id}
                        onChange={(e) => setEventRegistrationForm({ ...eventRegistrationForm, player_id: e.target.value })}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Player</option>
                        {players.map(p => {
                          const playerUser = p.user_id || {};
                          const name = playerUser.first_name && playerUser.last_name 
                            ? `${playerUser.first_name} ${playerUser.last_name}` 
                            : playerUser.username || p.name || 'Player';
                          return <option key={p._id} value={p._id}>{name} {p.belt ? `(${p.belt})` : ''}</option>;
                        })}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Entry Fee: ${selectedEventForRegistration.individual_player_fee?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Team <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={eventRegistrationForm.team_id}
                        onChange={(e) => setEventRegistrationForm({ ...eventRegistrationForm, team_id: e.target.value })}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Team</option>
                        {teams.filter(t => t.team_type === selectedEventForRegistration.category_type).map(t => (
                          <option key={t._id} value={t._id}>{t.team_name} ({t.team_type})</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Team Fee ({selectedEventForRegistration.team_size || 3} members): ${selectedEventForRegistration.team_event_fee?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEventForRegistration(null);
                      setEventRegistrationForm({
                        category_id: '',
                        player_id: '',
                        team_id: '',
                        registration_type: 'Individual'
                      });
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={registering}
                    className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {registering ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Registering...
                      </>
                    ) : (
                      <>
                        <FiCheck className="w-4 h-4 mr-2" />
                        Register {selectedEventForRegistration.participation_type === 'Individual' ? 'Player' : 'Team'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* PayHere Payment Modal */}
      {showPaymentModal && pendingRegistration && tournament && pendingCategory && (
        <PayHerePaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPendingRegistration(null);
            setPendingCategory(null);
            // Reload tournament details to show updated registration status
            loadTournamentDetails();
          }}
          registration={{
            ...pendingRegistration,
            // Add category fee information to registration for payment calculation
            category_fee: pendingCategory.participation_type === 'Individual'
              ? pendingCategory.individual_player_fee || 0
              : pendingCategory.team_event_fee || 0
          }}
          tournament={{
            ...tournament,
            // Override tournament fees with category-specific fees
            entry_fee_individual: pendingCategory.individual_player_fee || 0,
            entry_fee_team: pendingCategory.team_event_fee || 0
          }}
          onSuccess={async () => {
            toast.success('Payment completed successfully! Registration confirmed.');
            setShowPaymentModal(false);
            setPendingRegistration(null);
            setPendingCategory(null);
            setSelectedEventForRegistration(null);
            setEventRegistrationForm({
              category_id: '',
              player_id: '',
              team_id: '',
              registration_type: 'Individual'
            });
            await loadTournamentDetails();
          }}
        />
      )}
    </div>
  );
};

export default TournamentDetailModal;

