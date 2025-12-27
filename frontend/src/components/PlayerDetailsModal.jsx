import { useState, useEffect } from 'react';
import { playerService } from '../services/playerService';
import { registrationService } from '../services/registrationService';
import { paymentService } from '../services/paymentService';
import { processPayHerePayment, extractCustomerInfo } from '../utils/payhere';
import { getWeightClasses } from '../utils/kumiteClasses';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { FiX, FiEdit, FiTarget } from 'react-icons/fi';
import PayHerePaymentModal from './PayHerePaymentModal';

const PlayerDetailsModal = ({ 
  player, 
  onClose, 
  tournaments, 
  categories, 
  registrations,
  onUpdatePlayer,
  onRegisterForEvent,
  onMakePayment,
  user
}) => {
  // Add effect to update playerRegistrations when registrations prop changes
  useEffect(() => {
    // This will automatically update when parent refreshes registrations
  }, [registrations]);
  const [activeSection, setActiveSection] = useState('details'); // 'details', 'registrations'
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [paying, setPaying] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState(null);
  const [pendingCategory, setPendingCategory] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(player); // Track current player data
  const [recentRegistrations, setRecentRegistrations] = useState([]); // Track recent registrations to prevent duplicates
  const [formData, setFormData] = useState({
    age: player.age || '',
    belt_rank: player.belt_rank || '',
    weight_category: player.weight_category || '',
    age_category: player.age_category || '',
    gender: player.gender || '',
    kata: player.kata || false,
    kumite: player.kumite || false,
    team_kata: player.team_kata || false,
    team_kumite: player.team_kumite || false
  });

  // Update formData when player prop changes
  useEffect(() => {
    setCurrentPlayer(player);
    setFormData({
      age: player.age || '',
      belt_rank: player.belt_rank || '',
      weight_category: player.weight_category || '',
      age_category: player.age_category || '',
      gender: player.gender || '',
      kata: player.kata || false,
      kumite: player.kumite || false,
      team_kata: player.team_kata || false,
      team_kumite: player.team_kumite || false
    });
  }, [player]);

  // Function to get weight classes based on age category and gender for Kumite
  // Uses the centralized kumiteClasses utility
  const getWeightClassesForPlayer = (ageCategory, gender) => {
    if (!ageCategory || !gender) return [];
    return getWeightClasses(ageCategory, gender);
  };

  const playerUser = currentPlayer.user_id || {};
  const playerRegistrations = registrations.filter(r => {
    const regPlayerId = r.player_id?._id || r.player_id;
    const playerIdStr = String(currentPlayer._id);
    const regPlayerIdStr = String(regPlayerId || '');
    return regPlayerIdStr === playerIdStr && r.registration_type === 'Individual';
  });

  // Get coach registrations to filter tournaments - only show tournaments where THIS coach is registered
  // Use the same logic as CoachDashboard to match coach registrations
  const currentCoachId = user?.coach_id;
  const currentUserId = user?._id;
  
  const coachRegistrations = registrations.filter(r => {
    if (r.registration_type !== 'Coach') return false;
    
    // Check by coach_id (can be populated object or ID string)
    const regCoachId = r.coach_id?._id || r.coach_id;
    
    // Match by coach_id if available
    if (regCoachId && currentCoachId) {
      const regCoachIdStr = String(regCoachId).trim();
      const currentCoachIdStr = String(currentCoachId).trim();
      if (regCoachIdStr === currentCoachIdStr) {
        return true;
      }
    }
    
    // Also check if the registration's coach has the same user_id as current user
    // This handles cases where coach_id might be populated with user_id structure
    if (r.coach_id?.user_id) {
      const regCoachUserId = r.coach_id.user_id?._id || r.coach_id.user_id;
      if (regCoachUserId && currentUserId) {
        const regCoachUserIdStr = String(regCoachUserId).trim();
        const currentUserIdStr = String(currentUserId).trim();
        if (regCoachUserIdStr === currentUserIdStr) {
          return true;
        }
      }
    }
    
    // Fallback: if coach_id is not populated but we have user_id match
    // This handles edge cases where the structure might be different
    if (!regCoachId && r.coach_id && typeof r.coach_id === 'object') {
      // Try to extract user_id from nested structure
      const nestedUserId = r.coach_id.user_id?._id || r.coach_id.user_id;
      if (nestedUserId && currentUserId && String(nestedUserId) === String(currentUserId)) {
        return true;
      }
    }
    
    return false;
  });
  
  // Get tournament IDs where coach is registered
  const coachRegisteredTournamentIds = new Set(
    coachRegistrations.map(r => {
      const regTournamentId = r.tournament_id?._id || r.tournament_id;
      return regTournamentId ? String(regTournamentId) : null;
    }).filter(id => id !== null)
  );
  
  // Filter tournaments to only show those where coach is registered
  const coachRegisteredTournaments = tournaments.filter(t => {
    const tournamentId = String(t._id);
    return coachRegisteredTournamentIds.has(tournamentId);
  });
  

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Validate weight category for Kumite events
      if ((formData.kumite || formData.team_kumite) && !formData.weight_category) {
        toast.error('Weight category is required for Kumite and Team Kumite events');
        setSaving(false);
        return;
      }
      
      // Prepare data - convert empty strings to null/undefined and ensure proper types
      const updateData = {
        age: formData.age ? parseInt(formData.age) : null,
        belt_rank: formData.belt_rank || null,
        // Only include weight_category if player participates in Kumite or Team Kumite
        weight_category: (formData.kumite || formData.team_kumite) ? (formData.weight_category || null) : null,
        age_category: formData.age_category || null,
        gender: formData.gender || null,
        kata: formData.kata || false,
        kumite: formData.kumite || false,
        team_kata: formData.team_kata || false,
        team_kumite: formData.team_kumite || false
      };

      // Remove null/undefined values for optional fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === null || updateData[key] === undefined || updateData[key] === '') {
          if (key === 'age' || key === 'belt_rank') {
            // Keep age and belt_rank even if empty (they might be required)
          } else {
            delete updateData[key];
          }
        }
      });

      const response = await playerService.updatePlayer(currentPlayer._id, updateData);
      
      // Update current player state with saved data
      const updatedPlayer = {
        ...currentPlayer,
        ...updateData
      };
      setCurrentPlayer(updatedPlayer);
      
      // Update formData with saved values
      setFormData({
        age: updateData.age || '',
        belt_rank: updateData.belt_rank || '',
        weight_category: updateData.weight_category || '',
        age_category: updateData.age_category || '',
        gender: updateData.gender || '',
        kata: updateData.kata || false,
        kumite: updateData.kumite || false,
        team_kata: updateData.team_kata || false,
        team_kumite: updateData.team_kumite || false
      });
      
      toast.success('Player details updated successfully');
      setEditing(false);
      
      // Call callback to refresh parent component data
      if (onUpdatePlayer) {
        onUpdatePlayer(currentPlayer._id, updatedPlayer);
      }
    } catch (error) {
      console.error('Error updating player:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update player';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleRegisterForEvent = async (categoryId, tournamentId) => {
    // Only coaches can register players for events
    if (!user || user.user_type !== 'Coach') {
      toast.error('Only coaches can register players for events');
      return;
    }
    
    setRegistering(true);
    
    // Find category to get fee (defined outside try block for use in catch)
    const category = categories.find(c => 
      c._id === categoryId || c._id?.toString() === categoryId?.toString()
    );
    
    try {
      if (!category) {
        toast.error('Event not found');
        setRegistering(false);
        return;
      }

      // Check for duplicate registration - but allow if payment is Pending or Failed
      const tournamentIdStr = String(tournamentId);
      const categoryIdStr = String(categoryId);
      const playerIdStr = String(currentPlayer._id);
      
      // Check in playerRegistrations (filtered by player)
      const existingInPlayerRegs = playerRegistrations.find(r => {
        const regTournamentId = String(r.tournament_id?._id || r.tournament_id);
        const regCategoryId = String(r.category_id?._id || r.category_id);
        
        return regTournamentId === tournamentIdStr &&
               regCategoryId === categoryIdStr &&
               r.registration_type === 'Individual';
      });

      // Check in all registrations (broader check)
      const existingInAllRegs = registrations.find(r => {
        const regPlayerId = String(r.player_id?._id || r.player_id);
        const regTournamentId = String(r.tournament_id?._id || r.tournament_id);
        const regCategoryId = String(r.category_id?._id || r.category_id);
        
        return regPlayerId === playerIdStr &&
               regTournamentId === tournamentIdStr &&
               regCategoryId === categoryIdStr &&
               r.registration_type === 'Individual';
      });

      // If there's an existing registration, check payment status
      const existingRegistration = existingInPlayerRegs || existingInAllRegs;
      
      if (existingRegistration) {
        const paymentStatus = existingRegistration.payment_status;
        
        // If payment is already Paid, block registration
        if (paymentStatus === 'Paid') {
          const eventName = category?.category_name || 'this event';
          const playerName = playerUser.first_name && playerUser.last_name 
            ? `${playerUser.first_name} ${playerUser.last_name}` 
            : playerUser.username || 'This player';
          
          toast.warning(`${playerName} is already registered and paid for ${eventName}. Please select a different event.`);
          setRegistering(false);
          return;
        }
        
        // If payment is Pending or Failed, allow them to proceed with payment
        if (paymentStatus === 'Pending' || paymentStatus === 'Failed') {
          const entryFee = category.individual_player_fee || 0;
          
          if (entryFee > 0) {
            // Show payment modal for existing pending/failed registration
            setPendingRegistration(existingRegistration);
            setPendingCategory(category);
            setShowPaymentModal(true);
            setRegistering(false);
            toast.info('Payment pending. Please complete payment to finalize registration.');
            return;
          }
        }
      }

      // Check in recent registrations (prevent double-clicks) - but only if not pending payment
      if (!existingRegistration || existingRegistration.payment_status === 'Paid') {
        const existingInRecent = recentRegistrations.find(r => 
          String(r.tournamentId) === tournamentIdStr && 
          String(r.categoryId) === categoryIdStr
        );

        if (existingInRecent) {
          const eventName = category?.category_name || 'this event';
          toast.warning(`Registration for ${eventName} is being processed. Please wait...`);
          setRegistering(false);
          return;
        }
      }

      // Register the player first (or get existing registration if payment is pending)
      const registrationData = {
        tournament_id: tournamentId,
        category_id: categoryId,
        player_id: currentPlayer._id,
        registration_type: 'Individual'
      };

      const registrationResponse = await registrationService.registerForTournament(registrationData);
      const newRegistration = registrationResponse.data || registrationResponse;
      
      // Check if backend returned existing registration with pending payment
      // Backend returns status 200 with requiresPayment: true if registration exists with pending payment
      if (registrationResponse.requiresPayment || (existingRegistration && (existingRegistration.payment_status === 'Pending' || existingRegistration.payment_status === 'Failed'))) {
        // Use existing registration for payment
        const regToUse = existingRegistration || newRegistration;
        const entryFee = category.individual_player_fee || 0;
        if (entryFee > 0) {
          setPendingRegistration(regToUse);
          setPendingCategory(category);
          setShowPaymentModal(true);
          setRegistering(false);
          toast.info('Payment pending. Please complete payment to finalize registration.');
          return;
        }
      }
      
      // Add to recent registrations to prevent duplicate clicks (only for new registrations)
      if (!existingRegistration || existingRegistration.payment_status === 'Paid') {
        setRecentRegistrations(prev => [
          ...prev,
          { tournamentId, categoryId, timestamp: Date.now() }
        ]);
        
        // Clean up old recent registrations (older than 30 seconds)
        setTimeout(() => {
          setRecentRegistrations(prev => 
            prev.filter(r => Date.now() - r.timestamp < 30000)
          );
        }, 30000);
      }
      
      // Check if payment is required
      const entryFee = category.individual_player_fee || 0;
      
      if (entryFee > 0) {
        // Payment required - show payment modal
        setPendingRegistration(newRegistration);
        setPendingCategory(category);
        setShowPaymentModal(true);
        setRegistering(false); // Clear registering state so button can be used again if needed
        toast.info('Please complete payment to finalize registration');
      } else {
        // No payment required
        setRegistering(false); // Clear registering state
        toast.success('Player registered successfully for event!');
        if (onRegisterForEvent) {
          onRegisterForEvent(currentPlayer._id, categoryId, tournamentId);
        }
      }
    } catch (error) {
      console.error('Error registering for event:', error);
      
      // Extract error message from various possible locations
      let errorMessage = 'Failed to register for event';
      const errorData = error.response?.data || error.data;
      
      if (errorData) {
        // Handle duplicate registration error with a more user-friendly message
        if (errorData.message && (
          errorData.message.toLowerCase().includes('duplicate') ||
          errorData.message.toLowerCase().includes('already registered')
        )) {
          const playerName = playerUser.first_name && playerUser.last_name 
            ? `${playerUser.first_name} ${playerUser.last_name}` 
            : playerUser.username || 'This player';
          
          const eventName = category?.category_name || 'this event';
          errorMessage = `${playerName} is already registered for ${eventName}. Please select a different event.`;
        } else if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          // Check for validation errors array
          const validationErrors = errorData.errors.map(err => {
            const msg = err.msg || err.message || '';
            const param = err.param || err.field || '';
            return param ? `${param}: ${msg}` : msg;
          }).join(', ');
          errorMessage = errorData.message ? `${errorData.message} - ${validationErrors}` : validationErrors;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setRegistering(false);
    }
  };


  // Handle event registration payment (after registration)
  const handleEventPayment = async (registrationId) => {
    setPaying(true);
    try {
      const registration = playerRegistrations.find(r => r._id === registrationId);
      if (registration) {
        const category = categories.find(c => {
          const regCategoryId = registration.category_id?._id || registration.category_id;
          return c._id === regCategoryId || c._id?.toString() === regCategoryId?.toString();
        });
        const paymentAmount = category?.individual_player_fee || 0;
        
        const paymentRes = await paymentService.createPayment({
          registration_id: registrationId,
          amount: paymentAmount,
          transaction_method: 'PayHere'
        });
        
        // Process PayHere payment
        if (paymentRes.data?.payment_url) {
          window.location.href = paymentRes.data.payment_url;
        } else if (paymentRes.data?.payhere) {
          // Extract customer info from registration
          const customerInfo = extractCustomerInfo(registration);
          
          // Process payment using utility
          const success = processPayHerePayment(paymentRes, {
            items: `Event Payment - ${category?.category_name || 'Tournament Event'}`,
            customerInfo,
            method: 'form'
          });

          if (!success) {
            toast.error('Failed to redirect to payment gateway. Please try again.');
          }
        } else {
          toast.success('Payment processed successfully');
          if (onMakePayment) {
            onMakePayment(registrationId, paymentAmount);
          }
        }
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error(error.response?.data?.message || 'Failed to process payment');
    } finally {
      setPaying(false);
    }
  };


  // Get available events for this player
  const getAvailableEvents = () => {
    return categories.filter(cat => {
      // Filter by participation type (Individual only)
      if (cat.participation_type !== 'Individual') return false;
      
      // Check if player already registered
      const alreadyRegistered = playerRegistrations.some(r => {
        const regCategoryId = r.category_id?._id || r.category_id;
        return regCategoryId === cat._id || regCategoryId?.toString() === cat._id?.toString();
      });
      if (alreadyRegistered) return false;
      
      // Check age match if player has age
      if (formData.age && cat.age_min && cat.age_max) {
        const playerAge = parseInt(formData.age);
        if (playerAge < cat.age_min || playerAge > cat.age_max) return false;
      }
      
      return true;
    });
  };

  const availableEvents = getAvailableEvents();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 rounded-t-xl flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-2">
              {playerUser.first_name && playerUser.last_name 
                ? `${playerUser.first_name} ${playerUser.last_name}` 
                : playerUser.username || 'Player'}
            </h2>
            <p className="text-white text-opacity-90">{playerUser.email}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6 pt-4">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveSection('details')}
              className={`px-4 py-3 font-medium transition ${
                activeSection === 'details'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Player Details
            </button>
            <button
              onClick={() => setActiveSection('registrations')}
              className={`px-4 py-3 font-medium transition ${
                activeSection === 'registrations'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Event Registrations
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Player Details Section */}
          {activeSection === 'details' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800">Player Information</h3>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <FiEdit className="w-4 h-4" />
                    Edit Details
                  </button>
                )}
              </div>

              {editing ? (
                <form onSubmit={handleSaveDetails} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Age <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="100"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Belt Rank <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.belt_rank}
                        onChange={(e) => setFormData({ ...formData, belt_rank: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Belt</option>
                        <option value="White">White</option>
                        <option value="Yellow">Yellow</option>
                        <option value="Orange">Orange</option>
                        <option value="Green">Green</option>
                        <option value="Blue">Blue</option>
                        <option value="Purple">Purple</option>
                        <option value="Brown">Brown</option>
                        <option value="Black">Black</option>
                      </select>
                    </div>

                    {/* Weight Category - Only show for Kumite and Team Kumite */}
                    {(formData.kumite || formData.team_kumite) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Weight Category <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.weight_category}
                          onChange={(e) => setFormData({ ...formData, weight_category: e.target.value })}
                          disabled={!formData.age_category || !formData.gender}
                          required={formData.kumite || formData.team_kumite}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          <option value="">
                            {!formData.age_category || !formData.gender 
                              ? 'Please select Age Category and Gender first' 
                              : 'Select Weight Category'}
                          </option>
                          {formData.age_category && formData.gender && getWeightClassesForPlayer(formData.age_category, formData.gender).map((weightClass, idx) => (
                            <option key={idx} value={weightClass.value}>
                              {weightClass.label}
                            </option>
                          ))}
                        </select>
                        {formData.age_category && formData.gender && (
                          <p className="text-xs text-gray-500 mt-1">
                            Weight classes for {formData.gender} - {formData.age_category} (Kumite events only)
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Age Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.age_category}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          age_category: e.target.value,
                          weight_category: '' // Reset weight when age changes
                        })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Age Category</option>
                        <option value="Under 10">Under 10</option>
                        <option value="10-12">10-12</option>
                        <option value="13-15">13-15</option>
                        <option value="16-17">16-17</option>
                        <option value="18-21">18-21</option>
                        <option value="22-34">22-34</option>
                        <option value="35+">35+</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          gender: e.target.value,
                          weight_category: '' // Reset weight when gender changes
                        })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">♂️ Male</option>
                        <option value="Female">♀️ Female</option>
                      </select>
                    </div>
                  </div>

                  {/* Event Type Selection */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Event Participation Types <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.kata}
                          onChange={(e) => {
                            const isKata = e.target.checked;
                            setFormData({ 
                              ...formData, 
                              kata: isKata,
                              // Clear weight category if only Kata/Team Kata selected (no Kumite events)
                              weight_category: (formData.kumite || formData.team_kumite) ? formData.weight_category : ''
                            });
                          }}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Kata</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.kumite}
                          onChange={(e) => {
                            const isKumite = e.target.checked;
                            setFormData({ 
                              ...formData, 
                              kumite: isKumite,
                              // Clear weight category if unchecking Kumite and no Team Kumite
                              weight_category: (isKumite || formData.team_kumite) ? formData.weight_category : ''
                            });
                          }}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Kumite</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.team_kata}
                          onChange={(e) => {
                            const isTeamKata = e.target.checked;
                            setFormData({ 
                              ...formData, 
                              team_kata: isTeamKata,
                              // Clear weight category if only Kata/Team Kata selected (no Kumite events)
                              weight_category: (formData.kumite || formData.team_kumite) ? formData.weight_category : ''
                            });
                          }}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Team Kata</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.team_kumite}
                          onChange={(e) => {
                            const isTeamKumite = e.target.checked;
                            setFormData({ 
                              ...formData, 
                              team_kumite: isTeamKumite,
                              // Clear weight category if unchecking Team Kumite and no Kumite
                              weight_category: (isTeamKumite || formData.kumite) ? formData.weight_category : ''
                            });
                          }}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Team Kumite</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Select the event types this player will participate in</p>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        setFormData({
                          age: currentPlayer.age || '',
                          belt_rank: currentPlayer.belt_rank || '',
                          weight_category: currentPlayer.weight_category || '',
                          age_category: currentPlayer.age_category || '',
                          gender: currentPlayer.gender || '',
                          kata: currentPlayer.kata || false,
                          kumite: currentPlayer.kumite || false,
                          team_kata: currentPlayer.team_kata || false,
                          team_kumite: currentPlayer.team_kumite || false
                        });
                      }}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Details'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Age</p>
                      <p className="font-semibold text-gray-800">{currentPlayer.age || formData.age || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Belt Rank</p>
                      <p className="font-semibold text-gray-800">{currentPlayer.belt_rank || formData.belt_rank || 'Not set'}</p>
                    </div>
                    {(currentPlayer.kumite || currentPlayer.team_kumite || formData.kumite || formData.team_kumite) && (
                      <div>
                        <p className="text-sm text-gray-500">Weight Category</p>
                        <p className="font-semibold text-gray-800">{currentPlayer.weight_category || formData.weight_category || 'Not set'}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-500">Age Category</p>
                      <p className="font-semibold text-gray-800">{currentPlayer.age_category || formData.age_category || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Gender</p>
                      <p className="font-semibold text-gray-800">
                        {currentPlayer.gender || formData.gender ? (
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            (currentPlayer.gender || formData.gender) === 'Male' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-pink-100 text-pink-700'
                          }`}>
                            {(currentPlayer.gender || formData.gender) === 'Male' ? '♂️ Male' : '♀️ Female'}
                          </span>
                        ) : 'Not set'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Dojo</p>
                      <p className="font-semibold text-gray-800">{currentPlayer.dojo_name || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Coach</p>
                      <p className="font-semibold text-gray-800">{currentPlayer.coach_name || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500 mb-2">Event Participation Types</p>
                    <div className="flex flex-wrap gap-3">
                      {(currentPlayer.kata || formData.kata) && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Kata</span>
                      )}
                      {(currentPlayer.kumite || formData.kumite) && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Kumite</span>
                      )}
                      {(currentPlayer.team_kata || formData.team_kata) && (
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">Team Kata</span>
                      )}
                      {(currentPlayer.team_kumite || formData.team_kumite) && (
                        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">Team Kumite</span>
                      )}
                      {!currentPlayer.kata && !formData.kata && !currentPlayer.kumite && !formData.kumite && 
                       !currentPlayer.team_kata && !formData.team_kata && !currentPlayer.team_kumite && !formData.team_kumite && (
                        <span className="text-gray-400 text-sm">No event types selected</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* Event Registrations View Section - Read Only */}
          {activeSection === 'registrations' && (
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Event Registrations</h3>
              <p className="text-gray-600 mb-6">
                View all event registrations for this player. Players register and pay for events themselves through their dashboard.
              </p>
              
              {playerRegistrations.length === 0 ? (
                <div className="text-center py-12">
                  <FiTarget className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">No Event Registrations</h4>
                  <p className="text-gray-600">
                    This player has not registered for any events yet. Players can register for events through their own dashboard.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {playerRegistrations.map((registration) => {
                    const category = categories.find(c => {
                      const regCategoryId = registration.category_id?._id || registration.category_id;
                      return c._id === regCategoryId || c._id?.toString() === regCategoryId?.toString();
                    });
                    const tournament = tournaments.find(t => {
                      const regTournamentId = registration.tournament_id?._id || registration.tournament_id;
                      return t._id === regTournamentId || t._id?.toString() === regTournamentId?.toString();
                    });

                    return (
                      <div key={registration._id} className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h5 className="font-semibold text-lg text-gray-800 mb-1">
                              {category?.category_name || 'Event'}
                            </h5>
                            <p className="text-sm text-gray-600 mb-2">{tournament?.tournament_name || 'Tournament'}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {category?.category_type && (
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  category.category_type === 'Kata' || category.category_type === 'Team Kata'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {category.category_type}
                                </span>
                              )}
                              {category?.participation_type && (
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  category.participation_type === 'Individual'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {category.participation_type}
                                </span>
                              )}
                              {category?.gender && (
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  category.gender === 'Male' 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : category.gender === 'Female'
                                    ? 'bg-pink-100 text-pink-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {category.gender === 'Male' ? '♂️ Male' : category.gender === 'Female' ? '♀️ Female' : '⚥ Mixed'}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 text-sm text-gray-600 space-y-1">
                              {category?.age_category && <p><span className="font-medium">Age:</span> {category.age_category}</p>}
                              {category?.belt_category && <p><span className="font-medium">Belt:</span> {category.belt_category}</p>}
                              {category?.weight_category && <p><span className="font-medium">Weight:</span> {category.weight_category}</p>}
                              <p className="text-xs text-gray-500 mt-2">
                                Registered: {format(new Date(registration.registration_date || registration.createdAt), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-bold text-lg text-gray-800 mb-2">
                              ${category?.individual_player_fee?.toFixed(2) || '0.00'}
                            </p>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              registration.payment_status === 'Paid' 
                                ? 'bg-green-100 text-green-700'
                                : registration.payment_status === 'Pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : registration.payment_status === 'Failed'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {registration.payment_status}
                            </span>
                            {registration.approval_status && (
                              <span className={`block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                                registration.approval_status === 'Approved'
                                  ? 'bg-blue-100 text-blue-700'
                                  : registration.approval_status === 'Pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {registration.approval_status}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

    </div>
  );
};

export default PlayerDetailsModal;

