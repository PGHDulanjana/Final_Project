import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import { tournamentService } from '../../services/tournamentService';
import { registrationService } from '../../services/registrationService';
import { matchService } from '../../services/matchService';
import { paymentService } from '../../services/paymentService';
import { categoryService } from '../../services/categoryService';
import { notificationService } from '../../services/notificationService';
import { playerService } from '../../services/playerService';
import { coachService } from '../../services/coachService';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import Layout from '../../components/Layout';
import {
  FiUsers,
  FiAward,
  FiDollarSign,
  FiTrendingUp,
  FiActivity,
  FiCheckCircle,
  FiClock,
  FiBarChart2,
  FiSettings,
  FiBell,
  FiX,
  FiEdit,
  FiTrash2,
  FiEye,
  FiArrowRight,
  FiDownload,
  FiSend,
  FiTarget,
  FiShield,
  FiFileText,
  FiFilter,
  FiSearch
} from 'react-icons/fi';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [users, setUsers] = useState([]);
  const [players, setPlayers] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [matches, setMatches] = useState([]);
  const [payments, setPayments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // UI states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    target_audience: 'all'
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user?._id) return;

    setLoading(true);
    try {
      const [
        usersRes,
        playersRes,
        coachesRes,
        tournamentsRes,
        registrationsRes,
        matchesRes,
        paymentsRes,
        categoriesRes,
        notificationsRes
      ] = await Promise.allSettled([
        userService.getUsers(),
        playerService.getPlayers(),
        coachService.getCoaches(),
        tournamentService.getTournaments(),
        registrationService.getRegistrations(),
        matchService.getMatches(),
        paymentService.getPayments(),
        categoryService.getCategories(),
        notificationService.getNotifications()
      ]);

      // Extract data from Promise.allSettled results
      setUsers(usersRes.status === 'fulfilled' ? (usersRes.value.data || []) : []);
      
      // Extract players data - handle nested response structure
      let allPlayers = [];
      if (playersRes.status === 'fulfilled') {
        const playersData = playersRes.value.data || playersRes.value || [];
        if (Array.isArray(playersData)) {
          allPlayers = playersData;
        } else if (playersData.data && Array.isArray(playersData.data)) {
          allPlayers = playersData.data;
        }
      } else {
        console.error('❌ Failed to load players:', playersRes.reason);
      }
      setPlayers(allPlayers);
      
      // Extract coaches data - handle nested response structure
      let allCoaches = [];
      if (coachesRes.status === 'fulfilled') {
        const coachesData = coachesRes.value.data || coachesRes.value || [];
        if (Array.isArray(coachesData)) {
          allCoaches = coachesData;
        } else if (coachesData.data && Array.isArray(coachesData.data)) {
          allCoaches = coachesData.data;
        }
      }
      setCoaches(allCoaches);
      
      setTournaments(tournamentsRes.status === 'fulfilled' ? (tournamentsRes.value.data || []) : []);
      setRegistrations(registrationsRes.status === 'fulfilled' ? (registrationsRes.value.data || []) : []);
      setMatches(matchesRes.status === 'fulfilled' ? (matchesRes.value.data || []) : []);
      setPayments(paymentsRes.status === 'fulfilled' ? (paymentsRes.value.data || []) : []);
      setCategories(categoriesRes.status === 'fulfilled' ? (categoriesRes.value.data || []) : []);
      
      // Handle notifications separately - if it fails with 401, just set empty array
      if (notificationsRes.status === 'fulfilled') {
        setNotifications(notificationsRes.value.data || []);
      } else {
        const notifError = notificationsRes.reason;
        if (notifError?.response?.status === 401) {
          console.warn('Notifications: Authentication failed. Token may be missing or expired.');
          // Don't show error toast for 401 - the interceptor handles redirect
        } else {
          console.warn('Error loading notifications:', notifError);
        }
        setNotifications([]); // Set empty array if notifications fail
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      
      // If it's a 401 error, the interceptor should handle redirect, but log it
      if (error.response?.status === 401) {
        console.error('Authentication failed. Token may be missing or expired.');
      } else {
        toast.error('Failed to load dashboard data');
      }
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const totalUsers = users.length;
  const usersByRole = {
    Player: users.filter(u => u.user_type === 'Player').length,
    Judge: users.filter(u => u.user_type === 'Judge').length,
    Coach: users.filter(u => u.user_type === 'Coach').length,
    Organizer: users.filter(u => u.user_type === 'Organizer').length,
    Admin: users.filter(u => u.user_type === 'Admin').length
  };
  const activeUsers = users.filter(u => u.is_active).length;
  const totalTournaments = tournaments.length;
  const activeTournaments = tournaments.filter(t => t.status === 'Open' || t.status === 'Ongoing').length;
  const pendingApprovals = tournaments.filter(t => t.status === 'Draft').length;
  const totalMatches = matches.length;
  const pendingDraws = matches.filter(m => m.status === 'Scheduled' && !m.participants?.length).length;
  const totalRevenue = payments
    .filter(p => p.status === 'Completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalRegistrations = registrations.length;
  const completedMatches = matches.filter(m => m.status === 'Completed').length;

  const handleUpdateUser = async (userId, userData) => {
    try {
      await userService.updateUser(userId, userData);
      toast.success('User updated successfully');
      loadData();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await userService.deleteUser(userId);
      toast.success('User deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleApproveTournament = async (tournamentId) => {
    try {
      await tournamentService.updateTournament(tournamentId, {
        status: 'Open'
      });
      toast.success('Tournament approved and published');
      loadData();
    } catch (error) {
      console.error('Error approving tournament:', error);
      toast.error(error.response?.data?.message || 'Failed to approve tournament');
    }
  };

  const handleApproveDraws = async (matchId) => {
    try {
      // TODO: Implement API call to approve match draws
      toast.success('Match draws approved successfully');
      loadData();
    } catch (error) {
      console.error('Error approving draws:', error);
      toast.error('Failed to approve match draws');
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    try {
      await notificationService.createNotification(notificationForm);
      toast.success('Notification sent successfully');
      setShowNotificationModal(false);
      setNotificationForm({ title: '', message: '', target_audience: 'all' });
      loadData();
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error(error.response?.data?.message || 'Failed to send notification');
    }
  };

  const handleExportReport = async (reportType) => {
    try {
      // TODO: Implement report export functionality
      toast.info(`Exporting ${reportType} report...`);
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  // Group players by coach - CRITICAL: Include ALL players, even if user record is missing
  const playersByCoach = {};
  const playersWithoutCoach = [];
  
  players.forEach((player, index) => {
    // Handle populated user_id (object) or direct user_id (string/ObjectId)
    const playerUserId = player.user_id?._id || player.user_id;
    
    // Try to find matching user in users array
    let playerUser = null;
    if (playerUserId) {
      playerUser = users.find(u => {
        const userId = u._id;
        return String(userId) === String(playerUserId);
      });
    }
    
    // If user not found in users array, use populated user_id data from player
    let playerUserData = playerUser;
    if (!playerUserData) {
      // Check if user_id is populated (object with user data)
      if (player.user_id && typeof player.user_id === 'object' && player.user_id._id) {
        // Use populated user data
        playerUserData = {
          _id: player.user_id._id,
          first_name: player.user_id.first_name || 'Unknown',
          last_name: player.user_id.last_name || 'Player',
          email: player.user_id.email || 'No email',
          username: player.user_id.username || 'No username',
          user_type: 'Player',
          is_active: true // Default to active
        };
      } else if (playerUserId) {
        // Create minimal user object from playerUserId
        playerUserData = {
          _id: playerUserId,
          first_name: 'Unknown',
          last_name: 'Player',
          email: 'No email',
          username: 'No username',
          user_type: 'Player',
          is_active: true
        };
        console.warn(`⚠️ Player ${index + 1} has user_id but no matching user record:`, {
          player_id: player._id,
          user_id: playerUserId
        });
      }
    }
    
    if (!playerUserData) {
      console.error(`❌ Player ${index + 1} has no user_id at all, skipping:`, {
        player_id: player._id,
        user_id: player.user_id,
        coach_name: player.coach_name,
        dojo_name: player.dojo_name
      });
      return;
    }
    
    // Get coach ID from player
    const coachId = player.coach_id?._id || player.coach_id;
    const coachName = player.coach_name;
    
    if (coachId) {
      // Find coach profile
      const coach = coaches.find(c => {
        const coachProfileId = c._id;
        return String(coachProfileId) === String(coachId);
      });
      
      if (coach) {
        // Find coach user
        const coachUserId = coach.user_id?._id || coach.user_id;
        const coachUser = coachUserId ? users.find(u => {
          const userId = u._id;
          return String(userId) === String(coachUserId);
        }) : null;
        
        if (coachUser) {
          const coachKey = coachUser._id;
          if (!playersByCoach[coachKey]) {
            playersByCoach[coachKey] = {
              coach: coachUser,
              coachProfile: coach,
              players: []
            };
          }
          playersByCoach[coachKey].players.push({
            ...playerUserData,
            playerProfile: player,
            coach_name: coachName || player.coach_name,
            dojo_name: player.dojo_name
          });
          return;
        } else {
          console.warn(`⚠️ Coach profile found but no matching user for coach_id: ${coachId}`);
        }
      } else {
        console.warn(`⚠️ Player has coach_id ${coachId} but no matching coach profile found`);
      }
    }
    
    // If no coach found or coach user not found, add to players without coach
    playersWithoutCoach.push({
      ...playerUserData,
      playerProfile: player,
      coach_name: coachName || player.coach_name || 'No coach',
      dojo_name: player.dojo_name || 'No dojo'
    });
  });
  

  // Filter users (excluding players, as they'll be shown under coaches)
  const filteredNonPlayerUsers = users.filter(u => {
    if (u.user_type === 'Player') return false; // Players will be shown under coaches
    if (filterRole !== 'all' && u.user_type !== filterRole) return false;
    if (filterStatus !== 'all') {
      if (filterStatus === 'active' && !u.is_active) return false;
      if (filterStatus === 'inactive' && u.is_active) return false;
    }
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        u.username?.toLowerCase().includes(searchLower) ||
        u.email?.toLowerCase().includes(searchLower) ||
        u.first_name?.toLowerCase().includes(searchLower) ||
        u.last_name?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Filter coaches and their players
  const filteredCoachesWithPlayers = Object.values(playersByCoach).filter(coachGroup => {
    const coach = coachGroup.coach;
    
    // Filter by role
    if (filterRole !== 'all' && filterRole !== 'Coach' && filterRole !== 'Player') {
      return false;
    }
    
    // Filter by status
    if (filterStatus !== 'all') {
      if (filterStatus === 'active' && !coach.is_active) return false;
      if (filterStatus === 'inactive' && coach.is_active) return false;
    }
    
    // Filter players within coach group
    if (filterRole === 'Player' || filterRole === 'all') {
      coachGroup.players = coachGroup.players.filter(player => {
        if (filterStatus !== 'all') {
          if (filterStatus === 'active' && !player.is_active) return false;
          if (filterStatus === 'inactive' && player.is_active) return false;
        }
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          return (
            player.username?.toLowerCase().includes(searchLower) ||
            player.email?.toLowerCase().includes(searchLower) ||
            player.first_name?.toLowerCase().includes(searchLower) ||
            player.last_name?.toLowerCase().includes(searchLower) ||
            player.coach_name?.toLowerCase().includes(searchLower) ||
            player.dojo_name?.toLowerCase().includes(searchLower)
          );
        }
        return true;
      });
    } else {
      coachGroup.players = [];
    }
    
    // Check if coach matches search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const coachMatches = (
        coach.username?.toLowerCase().includes(searchLower) ||
        coach.email?.toLowerCase().includes(searchLower) ||
        coach.first_name?.toLowerCase().includes(searchLower) ||
        coach.last_name?.toLowerCase().includes(searchLower)
      );
      const playersMatch = coachGroup.players.length > 0;
      return coachMatches || playersMatch;
    }
    
    // Show coach if they have players (when filterRole is Player or all)
    // OR show coach if filterRole is Coach (even without players)
    if (filterRole === 'Player' || filterRole === 'all') {
      return coachGroup.players.length > 0;
    }
    
    // If filterRole is Coach, show all coaches regardless of player count
    if (filterRole === 'Coach') {
      return true;
    }
    
    return true;
  });

  // Filter players without coach
  const filteredPlayersWithoutCoach = playersWithoutCoach.filter(player => {
    if (filterRole !== 'all' && filterRole !== 'Player') return false;
    if (filterStatus !== 'all') {
      if (filterStatus === 'active' && !player.is_active) return false;
      if (filterStatus === 'inactive' && player.is_active) return false;
    }
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        player.username?.toLowerCase().includes(searchLower) ||
        player.email?.toLowerCase().includes(searchLower) ||
        player.first_name?.toLowerCase().includes(searchLower) ||
        player.last_name?.toLowerCase().includes(searchLower) ||
        player.coach_name?.toLowerCase().includes(searchLower) ||
        player.dojo_name?.toLowerCase().includes(searchLower)
      );
    }
    return true;
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
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                  Admin Dashboard
                </h1>
                <p className="text-gray-600">
                  Welcome back, {user?.first_name || user?.username}! Manage the entire system
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: FiBarChart2 },
                { id: 'users', label: 'Users', icon: FiUsers },
                { id: 'tournaments', label: 'Tournaments', icon: FiAward },
                { id: 'payments', label: 'Payments', icon: FiDollarSign },
                { id: 'draws', label: 'Match Draws', icon: FiTarget },
                { id: 'settings', label: 'Settings', icon: FiSettings },
                { id: 'notifications', label: 'Notifications', icon: FiBell },
                { id: 'reports', label: 'Reports', icon: FiFileText }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 font-medium transition whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Total Users</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{totalUsers}</p>
                      <p className="text-xs text-gray-500 mt-1">{activeUsers} Active</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <FiUsers className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Total Tournaments</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{totalTournaments}</p>
                      <p className="text-xs text-gray-500 mt-1">{activeTournaments} Active</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <FiAward className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Total Revenue</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">${totalRevenue.toFixed(2)}</p>
                      <p className="text-xs text-gray-500 mt-1">From {payments.filter(p => p.status === 'Completed').length} Payments</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <FiDollarSign className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Pending Actions</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{pendingApprovals + pendingDraws}</p>
                      <p className="text-xs text-gray-500 mt-1">Requires Approval</p>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <FiClock className="w-8 h-8 text-yellow-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* User Statistics */}
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">User Statistics by Role</h2>
                  <button
                    onClick={() => setActiveTab('users')}
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    Manage Users <FiArrowRight />
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{usersByRole.Player}</p>
                    <p className="text-sm text-gray-600 mt-1">Players</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{usersByRole.Judge}</p>
                    <p className="text-sm text-gray-600 mt-1">Judges</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{usersByRole.Coach}</p>
                    <p className="text-sm text-gray-600 mt-1">Coaches</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{usersByRole.Organizer}</p>
                    <p className="text-sm text-gray-600 mt-1">Organizers</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{usersByRole.Admin}</p>
                    <p className="text-sm text-gray-600 mt-1">Admins</p>
                  </div>
                </div>
              </div>

              {/* Pending Approvals */}
              {pendingApprovals > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-2 border-yellow-200">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FiClock className="w-6 h-6 text-yellow-600" />
                        Pending Approvals
                      </h2>
                      <p className="text-gray-600 text-sm mt-1">
                        {pendingApprovals} tournament{pendingApprovals !== 1 ? 's' : ''} awaiting approval
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('tournaments')}
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      Review All <FiArrowRight />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tournaments
                      .filter(t => t.status === 'Draft')
                      .slice(0, 6)
                      .map((tournament) => (
                        <TournamentCard
                          key={tournament._id}
                          tournament={tournament}
                          onApprove={() => handleApproveTournament(tournament._id)}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* System Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">System Overview</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Registrations</span>
                      <span className="font-bold text-gray-800">{totalRegistrations}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Active Tournaments</span>
                      <span className="font-bold text-gray-800">{activeTournaments}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Matches</span>
                      <span className="font-bold text-gray-800">{totalMatches}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Completed Matches</span>
                      <span className="font-bold text-gray-800">{completedMatches}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Active Users</span>
                      <span className="font-bold text-gray-800">{activeUsers}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
                  <div className="space-y-3">
                    <button
                      onClick={() => setActiveTab('users')}
                      className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition flex items-center"
                    >
                      <FiUsers className="w-5 h-5 mr-3 text-blue-600" />
                      <span className="font-medium text-gray-800">Manage Users</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('tournaments')}
                      className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition flex items-center"
                    >
                      <FiAward className="w-5 h-5 mr-3 text-green-600" />
                      <span className="font-medium text-gray-800">Oversee Tournaments</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('payments')}
                      className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition flex items-center"
                    >
                      <FiDollarSign className="w-5 h-5 mr-3 text-purple-600" />
                      <span className="font-medium text-gray-800">Monitor Payments</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('draws')}
                      className="w-full text-left px-4 py-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition flex items-center"
                    >
                      <FiTarget className="w-5 h-5 mr-3 text-yellow-600" />
                      <span className="font-medium text-gray-800">Approve Match Draws</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('settings')}
                      className="w-full text-left px-4 py-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition flex items-center"
                    >
                      <FiSettings className="w-5 h-5 mr-3 text-orange-600" />
                      <span className="font-medium text-gray-800">System Settings</span>
                    </button>
                    <button
                      onClick={() => setShowNotificationModal(true)}
                      className="w-full text-left px-4 py-3 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition flex items-center"
                    >
                      <FiSend className="w-5 h-5 mr-3 text-cyan-600" />
                      <span className="font-medium text-gray-800">Send Global Notification</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                <h2 className="text-2xl font-bold text-gray-800">Manage Users</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Showing {filteredCoachesWithPlayers.reduce((sum, g) => sum + g.players.length, 0) + filteredPlayersWithoutCoach.length} players 
                    ({filteredCoachesWithPlayers.length} coaches with players, {filteredPlayersWithoutCoach.length} players without coach) 
                    out of {players.length} total players
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2">
                    <FiSearch className="w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Roles</option>
                    <option value="Player">Players</option>
                    <option value="Coach">Coaches</option>
                    <option value="Judge">Judges</option>
                    <option value="Organizer">Organizers</option>
                    <option value="Admin">Admins</option>
                  </select>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {/* Coaches with their players */}
                    {filteredCoachesWithPlayers.map((coachGroup) => (
                      <React.Fragment key={coachGroup.coach._id}>
                        {/* Coach Row */}
                        <tr className="bg-blue-50 hover:bg-blue-100 font-semibold">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <FiUsers className="w-4 h-4 text-blue-600" />
                              {coachGroup.coach.first_name} {coachGroup.coach.last_name}
                              <span className="text-xs text-gray-500 font-normal">
                                ({coachGroup.players.length} {coachGroup.players.length === 1 ? 'player' : 'players'})
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">{coachGroup.coach.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                              Coach
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              coachGroup.coach.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {coachGroup.coach.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setSelectedUser(coachGroup.coach);
                                  setShowUserModal(true);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="Edit Coach"
                              >
                                <FiEdit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(coachGroup.coach._id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Delete Coach"
                              >
                                <FiTrash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {/* Players under this coach */}
                        {coachGroup.players.map((player) => (
                          <tr key={player._id} className="hover:bg-gray-50 bg-gray-25">
                            <td className="px-6 py-4 whitespace-nowrap pl-12">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400">└─</span>
                                {player.first_name} {player.last_name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">{player.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                                Player
                              </span>
                              {player.dojo_name && (
                                <span className="ml-2 text-xs text-gray-500">({player.dojo_name})</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                player.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {player.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedUser(player);
                                    setShowUserModal(true);
                                  }}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                  title="Edit Player"
                                >
                                  <FiEdit className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(player._id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                  title="Delete Player"
                                >
                                  <FiTrash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                    
                    {/* Players without coach */}
                    {filteredPlayersWithoutCoach.map((player) => (
                      <tr key={player._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {player.first_name} {player.last_name}
                          <span className="ml-2 text-xs text-gray-400">(No coach assigned)</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{player.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                            Player
                          </span>
                          {player.dojo_name && (
                            <span className="ml-2 text-xs text-gray-500">({player.dojo_name})</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            player.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {player.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedUser(player);
                                setShowUserModal(true);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Edit Player"
                            >
                              <FiEdit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(player._id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete Player"
                            >
                              <FiTrash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    
                    {/* Other users (Judges, Organizers, Admins) */}
                    {filteredNonPlayerUsers.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.first_name} {user.last_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            {user.user_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowUserModal(true);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Edit User"
                            >
                              <FiEdit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user._id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete User"
                            >
                              <FiTrash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tournaments Tab */}
          {activeTab === 'tournaments' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Oversee Tournaments</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tournaments.map((tournament) => (
                  <TournamentCard
                    key={tournament._id}
                    tournament={tournament}
                    onApprove={() => handleApproveTournament(tournament._id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Monitor Payments & Invoices</h2>
                <button
                  onClick={() => handleExportReport('payments')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <FiDownload className="w-5 h-5" />
                  Export Report
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {payment.payment_id || payment._id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          ${payment.amount?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            payment.status === 'Completed' ? 'bg-green-100 text-green-800' :
                            payment.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(payment.created_at || payment.createdAt), 'MMM dd, yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleExportReport(`invoice-${payment._id}`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="View Invoice"
                          >
                            <FiEye className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Match Draws Tab */}
          {activeTab === 'draws' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Approve AI-Generated Match Draws</h2>
              <div className="space-y-4">
                {matches
                  .filter(m => m.status === 'Scheduled' && !m.participants?.length)
                  .map((match) => (
                    <div key={match._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-lg text-gray-800">{match.match_name || 'Match'}</h3>
                          <p className="text-sm text-gray-600">
                            {format(new Date(match.scheduled_time), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                        <button
                          onClick={() => handleApproveDraws(match._id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          Approve Draws
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Manage System Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FiShield className="w-5 h-5" />
                    Roles & Permissions
                  </h3>
                  <p className="text-gray-600 mb-4">Manage user roles and their permissions</p>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                    Manage Roles
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FiAward className="w-5 h-5" />
                    Categories
                  </h3>
                  <p className="text-gray-600 mb-4">Manage tournament categories ({categories.length} categories)</p>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                    Manage Categories
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FiFileText className="w-5 h-5" />
                    Rules & Regulations
                  </h3>
                  <p className="text-gray-600 mb-4">Manage system-wide rules and regulations</p>
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                    Manage Rules
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FiSettings className="w-5 h-5" />
                    General Settings
                  </h3>
                  <p className="text-gray-600 mb-4">Configure general system settings</p>
                  <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition">
                    Configure Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Send Global Notifications</h2>
                <button
                  onClick={() => setShowNotificationModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <FiSend className="w-5 h-5" />
                  Send Notification
                </button>
              </div>
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <NotificationCard key={notification._id} notification={notification} />
                ))}
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">System-Wide Reports</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ReportCard
                  title="User Report"
                  description="Export all user data and statistics"
                  onExport={() => handleExportReport('users')}
                />
                <ReportCard
                  title="Tournament Report"
                  description="Export tournament data and analytics"
                  onExport={() => handleExportReport('tournaments')}
                />
                <ReportCard
                  title="Payment Report"
                  description="Export payment and revenue data"
                  onExport={() => handleExportReport('payments')}
                />
                <ReportCard
                  title="Match Report"
                  description="Export match results and statistics"
                  onExport={() => handleExportReport('matches')}
                />
                <ReportCard
                  title="Registration Report"
                  description="Export registration data"
                  onExport={() => handleExportReport('registrations')}
                />
                <ReportCard
                  title="System Report"
                  description="Export comprehensive system report"
                  onExport={() => handleExportReport('system')}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notification Modal */}
      {showNotificationModal && (
        <NotificationModal
          isOpen={showNotificationModal}
          onClose={() => {
            setShowNotificationModal(false);
            setNotificationForm({ title: '', message: '', target_audience: 'all' });
          }}
          onSubmit={handleSendNotification}
          formData={notificationForm}
          setFormData={setNotificationForm}
        />
      )}

      {/* User Modal */}
      {showUserModal && selectedUser && (
        <UserModal
          isOpen={showUserModal}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          onUpdate={handleUpdateUser}
        />
      )}
    </Layout>
  );
};

// Tournament Card Component
const TournamentCard = ({ tournament, onApprove }) => {
  return (
    <div className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-bold text-lg text-gray-800 flex-1">{tournament.tournament_name}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          tournament.status === 'Open' ? 'bg-green-100 text-green-700' :
          tournament.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' :
          tournament.status === 'Draft' ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {tournament.status}
        </span>
      </div>
      <div className="space-y-2 mb-4">
        <p className="text-sm text-gray-600">
          {format(new Date(tournament.start_date), 'MMM dd, yyyy')} - {format(new Date(tournament.end_date), 'MMM dd, yyyy')}
        </p>
        <p className="text-sm text-gray-600">{tournament.venue}</p>
      </div>
      {tournament.status === 'Draft' && onApprove && (
        <button
          onClick={onApprove}
          className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-semibold"
        >
          Approve Tournament
        </button>
      )}
    </div>
  );
};

// Notification Card Component
const NotificationCard = ({ notification }) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <FiBell className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-800 mb-1">{notification.title}</h4>
          <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
          <p className="text-xs text-gray-500">
            {format(new Date(notification.created_at), 'MMM dd, yyyy HH:mm')}
          </p>
        </div>
      </div>
    </div>
  );
};

// Report Card Component
const ReportCard = ({ title, description, onExport }) => {
  return (
    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
      <h3 className="font-bold text-lg text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      <button
        onClick={onExport}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        <FiDownload className="w-5 h-5" />
        Export Report
      </button>
    </div>
  );
};

// Notification Modal Component
const NotificationModal = ({ isOpen, onClose, onSubmit, formData, setFormData }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Send Global Notification</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Notification title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Notification message"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Audience
            </label>
            <select
              value={formData.target_audience}
              onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Users</option>
              <option value="Player">Players Only</option>
              <option value="Coach">Coaches Only</option>
              <option value="Judge">Judges Only</option>
              <option value="Organizer">Organizers Only</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Send Notification
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// User Modal Component
const UserModal = ({ isOpen, onClose, user, onUpdate }) => {
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    user_type: user?.user_type || 'Player',
    is_active: user?.is_active !== undefined ? user.is_active : true
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(user._id, formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Edit User</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">User Type</label>
            <select
              value={formData.user_type}
              onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Player">Player</option>
              <option value="Coach">Coach</option>
              <option value="Judge">Judge</option>
              <option value="Organizer">Organizer</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="ml-2 text-sm font-medium text-gray-700">Active</label>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Update User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminDashboard;
