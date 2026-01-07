import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { playerService } from '../../services/playerService';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import ChatbotPopup from '../../components/ChatbotPopup';
import { FiUser, FiSave, FiEdit, FiX, FiAward, FiTarget, FiUsers } from 'react-icons/fi';

const PlayerProfile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [playerProfile, setPlayerProfile] = useState(null);
  const [formData, setFormData] = useState({
    age: '',
    belt_rank: '',
    weight_category: '',
    age_category: '',
    gender: '',
    kata: false,
    kumite: false,
    team_kata: false,
    team_kumite: false,
    medical_info: '',
    emergency_contact: {
      name: '',
      phone: '',
      relationship: ''
    }
  });

  useEffect(() => {
    loadPlayerProfile();
  }, [user]);

  const loadPlayerProfile = async () => {
    if (!user?._id) return;

    try {
      setLoading(true);
      const playersRes = await playerService.getPlayers();
      const allPlayers = playersRes.data || [];
      const profile = allPlayers.find(p => {
        const playerUserId = p.user_id?._id || p.user_id;
        return String(playerUserId) === String(user._id);
      });

      if (profile) {
        setPlayerProfile(profile);
        setFormData({
          age: profile.age || '',
          belt_rank: profile.belt_rank || '',
          weight_category: profile.weight_category || '',
          age_category: profile.age_category || '',
          gender: profile.gender || '',
          kata: profile.kata || false,
          kumite: profile.kumite || false,
          team_kata: profile.team_kata || false,
          team_kumite: profile.team_kumite || false,
          medical_info: profile.medical_info || '',
          emergency_contact: {
            name: profile.emergency_contact?.name || '',
            phone: profile.emergency_contact?.phone || '',
            relationship: profile.emergency_contact?.relationship || ''
          }
        });
      } else {
        toast.error('Player profile not found');
      }
    } catch (error) {
      console.error('Error loading player profile:', error);
      toast.error('Failed to load player profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate weight category for Kumite events
      if ((formData.kumite || formData.team_kumite) && !formData.weight_category) {
        toast.error('Weight category is required for Kumite and Team Kumite events');
        setSaving(false);
        return;
      }

      const updateData = {
        age: formData.age ? parseInt(formData.age) : null,
        belt_rank: formData.belt_rank || null,
        weight_category: (formData.kumite || formData.team_kumite) ? (formData.weight_category || null) : null,
        age_category: formData.age_category || null,
        gender: formData.gender || null,
        kata: formData.kata || false,
        kumite: formData.kumite || false,
        team_kata: formData.team_kata || false,
        team_kumite: formData.team_kumite || false,
        medical_info: formData.medical_info || null,
        emergency_contact: {
          name: formData.emergency_contact.name || null,
          phone: formData.emergency_contact.phone || null,
          relationship: formData.emergency_contact.relationship || null
        }
      };

      // Remove null/undefined values for optional fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === null || updateData[key] === undefined || updateData[key] === '') {
          if (key === 'age' || key === 'belt_rank') {
            // Keep age and belt_rank even if empty
          } else if (key !== 'emergency_contact') {
            delete updateData[key];
          }
        }
      });

      // Clean emergency_contact
      if (updateData.emergency_contact) {
        Object.keys(updateData.emergency_contact).forEach(key => {
          if (!updateData.emergency_contact[key]) {
            updateData.emergency_contact[key] = null;
          }
        });
      }

      await playerService.updatePlayer(playerProfile._id, updateData);
      toast.success('Profile updated successfully!');
      setEditing(false);
      await loadPlayerProfile(); // Reload to get updated data
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update profile';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
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

  if (!playerProfile) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Player Profile Not Found</h2>
              <p className="text-gray-600">Please contact support if you believe this is an error.</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const playerUser = playerProfile.user_id || {};

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                  My Profile
                </h1>
                <p className="text-gray-600">Edit your player details, event preferences, and personal information</p>
              </div>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <FiEdit className="w-5 h-5" />
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Profile Form */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <form onSubmit={handleSave}>
              {/* Personal Information */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FiUser className="w-6 h-6 text-blue-600" />
                  Personal Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={`${playerUser.first_name || ''} ${playerUser.last_name || ''}`.trim() || playerUser.username || ''}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">Name cannot be changed. Contact admin to update.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={playerUser.email || ''}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Coach</label>
                    <input
                      type="text"
                      value={playerProfile.coach_name || 'Not assigned'}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dojo</label>
                    <input
                      type="text"
                      value={playerProfile.dojo_name || 'Not assigned'}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>
                </div>
              </div>

              {/* Player Details */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FiTarget className="w-6 h-6 text-blue-600" />
                  Player Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      disabled={!editing}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      disabled={!editing}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Belt Rank <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.belt_rank}
                      onChange={(e) => setFormData({ ...formData, belt_rank: e.target.value })}
                      disabled={!editing}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600"
                    >
                      <option value="">Select Belt Rank</option>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Age Category
                    </label>
                    <select
                      value={formData.age_category}
                      onChange={(e) => setFormData({ ...formData, age_category: e.target.value })}
                      disabled={!editing}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600"
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
                  {(formData.kumite || formData.team_kumite) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Weight Category <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.weight_category}
                        onChange={(e) => setFormData({ ...formData, weight_category: e.target.value })}
                        disabled={!editing}
                        required
                        placeholder="e.g., -50kg, 50-55kg, +75kg"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600"
                      />
                      <p className="text-xs text-gray-500 mt-1">Required for Kumite events</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Event Preferences */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FiAward className="w-6 h-6 text-blue-600" />
                  Event Preferences
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Select which types of events you are interested in participating in. You can register for multiple events.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                    formData.kata
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${!editing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      checked={formData.kata}
                      onChange={(e) => setFormData({ ...formData, kata: e.target.checked })}
                      disabled={!editing}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <p className="font-semibold text-gray-800">Kata</p>
                      <p className="text-sm text-gray-600">Individual kata competition</p>
                    </div>
                  </label>
                  <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                    formData.kumite
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${!editing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      checked={formData.kumite}
                      onChange={(e) => setFormData({ ...formData, kumite: e.target.checked })}
                      disabled={!editing}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <p className="font-semibold text-gray-800">Kumite</p>
                      <p className="text-sm text-gray-600">Individual kumite competition (requires weight category)</p>
                    </div>
                  </label>
                  <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                    formData.team_kata
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${!editing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      checked={formData.team_kata}
                      onChange={(e) => setFormData({ ...formData, team_kata: e.target.checked })}
                      disabled={!editing}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <p className="font-semibold text-gray-800">Team Kata</p>
                      <p className="text-sm text-gray-600">Team kata competition</p>
                    </div>
                  </label>
                  <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                    formData.team_kumite
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${!editing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      checked={formData.team_kumite}
                      onChange={(e) => setFormData({ ...formData, team_kumite: e.target.checked })}
                      disabled={!editing}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <p className="font-semibold text-gray-800">Team Kumite</p>
                      <p className="text-sm text-gray-600">Team kumite competition (requires weight category)</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FiUsers className="w-6 h-6 text-blue-600" />
                  Emergency Contact
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                    <input
                      type="text"
                      value={formData.emergency_contact.name}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergency_contact: { ...formData.emergency_contact, name: e.target.value }
                      })}
                      disabled={!editing}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.emergency_contact.phone}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergency_contact: { ...formData.emergency_contact, phone: e.target.value }
                      })}
                      disabled={!editing}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Relationship</label>
                    <input
                      type="text"
                      value={formData.emergency_contact.relationship}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergency_contact: { ...formData.emergency_contact, relationship: e.target.value }
                      })}
                      disabled={!editing}
                      placeholder="e.g., Parent, Guardian"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600"
                    />
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Medical Information</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Medical Notes (Optional)</label>
                  <textarea
                    value={formData.medical_info}
                    onChange={(e) => setFormData({ ...formData, medical_info: e.target.value })}
                    disabled={!editing}
                    rows={4}
                    placeholder="Any medical conditions, allergies, or special requirements..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              {editing && (
                <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      loadPlayerProfile(); // Reset form
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition flex items-center gap-2"
                  >
                    <FiX className="w-5 h-5" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <FiSave className="w-5 h-5" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Chatbot Popup */}
      <ChatbotPopup />
    </Layout>
  );
};

export default PlayerProfile;

