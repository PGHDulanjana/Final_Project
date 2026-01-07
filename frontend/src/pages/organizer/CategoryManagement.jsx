import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { categoryService } from '../../services/categoryService';
import { tournamentService } from '../../services/tournamentService';
import { matchService } from '../../services/matchService';
import { tatamiService } from '../../services/tatamiService';
import { judgeService } from '../../services/judgeService';
import { registrationService } from '../../services/registrationService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import { FiPlus, FiEdit, FiTrash2, FiX, FiDollarSign, FiUsers, FiSettings, FiExternalLink } from 'react-icons/fi';
import { KUMITE_CLASSES, getWeightClasses, getAgeCategories } from '../../utils/kumiteClasses';

const CategoryManagement = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [tournaments, setTournaments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [matches, setMatches] = useState([]);
  const [tatamis, setTatamis] = useState([]);
  const [judges, setJudges] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTatamiModal, setShowTatamiModal] = useState(false);
  const [selectedCategoryForTatami, setSelectedCategoryForTatami] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tatamiFormData, setTatamiFormData] = useState({
    tatami_number: 1,
    tatami_name: '',
    location: '',
    assigned_judges: []
  });
  const [formData, setFormData] = useState({
    tournament_id: '',
    category_name: '',
    category_type: 'Kata',
    participation_type: 'Individual',
    use_wkf_standard: false,
    use_standard_kumite_classes: false, // New: Use standard Kumite age/weight classes
    age_category: 'Open',
    age_min: '',
    age_max: '',
    weight_category: '',
    weight_min: '',
    weight_max: '',
    belt_category: '',
    belt_groups: [],
    use_custom_belt_levels: false,
    custom_belt_levels: [],
    belt_level_groups: {},
    belt_level_group: '',
    belt_level: '',
    is_open_event: false,
    gender: '',
    team_size: 3,
    individual_player_fee: 0,
    team_event_fee: 0
  });

  useEffect(() => {
    loadData();
  }, [user]);

  // Check for tournament ID in URL query params
  useEffect(() => {
    const tournamentId = searchParams.get('tournament');
    if (tournamentId) {
      setSelectedTournament(tournamentId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedTournament) {
      loadCategories();
    }
  }, [selectedTournament]);

  const loadData = async () => {
    if (!user?._id) return;

    setLoading(true);
    try {
      const tournamentsRes = await tournamentService.getTournaments();
      setTournaments(tournamentsRes.data || []);
      
      if (selectedTournament) {
        await loadCategories();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    if (!selectedTournament) return;

    try {
      const [categoriesRes, matchesRes, tatamisRes, judgesRes] = await Promise.all([
        categoryService.getCategories({ tournament_id: selectedTournament }),
        matchService.getMatches({ tournament_id: selectedTournament }),
        tatamiService.getTatamis({ tournament_id: selectedTournament }),
        judgeService.getJudges()
      ]);
      setCategories(categoriesRes.data || []);
      setMatches(matchesRes.data || []);
      setTatamis(tatamisRes.data || []);
      // Filter judges to only show those registered for this tournament
      const allJudges = judgesRes.data || [];
      // Get registrations to filter judges
      const registrationsRes = await registrationService.getRegistrations({ 
        tournament_id: selectedTournament,
        registration_type: 'Judge'
      });
      const judgeRegistrations = registrationsRes.data || [];
      const registeredJudgeIds = new Set(
        judgeRegistrations.map(reg => String(reg.judge_id?._id || reg.judge_id))
      );
      const filteredJudges = allJudges.filter(judge => 
        registeredJudgeIds.has(String(judge._id))
      );
      setJudges(filteredJudges);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load events and matches');
    }
  };

  const handleOpenTatamiModal = (category) => {
    setSelectedCategoryForTatami(category);
    
    // Check if tatami already exists for this category
    const existingTatami = tatamis.find(t => 
      String(t.category_id?._id || t.category_id) === String(category._id)
    );

    if (existingTatami) {
      setTatamiFormData({
        tatami_number: existingTatami.tatami_number,
        tatami_name: existingTatami.tatami_name || '',
        location: existingTatami.location || '',
        assigned_judges: existingTatami.assigned_judges || []
      });
    } else {
      // Get next available tatami number
      const maxTatamiNumber = tatamis.length > 0 
        ? Math.max(...tatamis.map(t => t.tatami_number || 0))
        : 0;
      
      setTatamiFormData({
        tatami_number: maxTatamiNumber + 1,
        tatami_name: `Tatami ${maxTatamiNumber + 1}`,
        location: `Area ${maxTatamiNumber + 1}`,
        assigned_judges: []
      });
    }
    
    setShowTatamiModal(true);
  };

  const handleCreateOrUpdateTatami = async () => {
    if (!selectedCategoryForTatami || !selectedTournament) return;

    try {
      // Check if tatami already exists
      const existingTatami = tatamis.find(t => 
        String(t.category_id?._id || t.category_id) === String(selectedCategoryForTatami._id)
      );

      if (existingTatami) {
        // Update existing tatami
        await tatamiService.updateTatami(existingTatami._id, {
          tatami_number: tatamiFormData.tatami_number,
          tatami_name: tatamiFormData.tatami_name,
          location: tatamiFormData.location
        });

        // Update judges if provided
        if (tatamiFormData.assigned_judges.length > 0) {
          await tatamiService.assignJudges(existingTatami._id, tatamiFormData.assigned_judges);
        }

        toast.success('Tatami updated successfully');
      } else {
        // Create new tatami
        const response = await tatamiService.createTatami({
          tournament_id: selectedTournament,
          category_id: selectedCategoryForTatami._id,
          tatami_number: tatamiFormData.tatami_number,
          tatami_name: tatamiFormData.tatami_name,
          location: tatamiFormData.location,
          assigned_judges: tatamiFormData.assigned_judges
        });

        if (response.success) {
          toast.success('Tatami created and event assigned successfully');
        }
      }

      setShowTatamiModal(false);
      await loadCategories();
    } catch (error) {
      console.error('Error creating/updating tatami:', error);
      toast.error(error.response?.data?.message || 'Failed to setup tatami');
    }
  };

  const handleGoToTatami = (category) => {
    const tatami = tatamis.find(t => 
      String(t.category_id?._id || t.category_id) === String(category._id)
    );
    
    if (tatami) {
      navigate(`/tatami/${tatami._id}`);
    } else {
      toast.error('Tatami not set up for this event. Please setup tatami first.');
    }
  };

  const handleOpenModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        tournament_id: category.tournament_id?._id || category.tournament_id || selectedTournament,
        category_name: category.category_name || '',
        category_type: category.category_type || 'Kata',
        participation_type: category.participation_type || 'Individual',
        use_wkf_standard: category.use_wkf_standard || false,
        use_standard_kumite_classes: category.use_standard_kumite_classes || false,
        age_category: category.age_category || 'Open',
        age_min: category.age_min || '',
        age_max: category.age_max || '',
        weight_category: category.weight_category || '',
        weight_min: category.weight_min || '',
        weight_max: category.weight_max || '',
        belt_category: category.belt_category || '',
        belt_groups: category.belt_groups || [],
        use_custom_belt_levels: category.use_custom_belt_levels || false,
        custom_belt_levels: category.custom_belt_levels || [],
        belt_level_groups: category.belt_level_groups || {},
        belt_level_group: category.belt_level_group || '',
        belt_level: category.belt_level || '',
        is_open_event: category.is_open_event || false,
        gender: category.gender || '',
        team_size: category.team_size || 3,
        individual_player_fee: category.individual_player_fee || 0,
        team_event_fee: category.team_event_fee || 0
      });
    } else {
      setEditingCategory(null);
      setFormData({
        tournament_id: selectedTournament || '',
        category_name: '',
        category_type: 'Kata',
        participation_type: 'Individual',
        use_wkf_standard: false,
        use_standard_kumite_classes: false,
        age_category: 'Open',
        age_min: '',
        age_max: '',
        weight_category: '',
        weight_min: '',
        weight_max: '',
        belt_category: '',
        belt_groups: [],
        use_custom_belt_levels: false,
        custom_belt_levels: [],
        belt_level_groups: {},
        belt_level_group: '',
        belt_level: '',
        is_open_event: false,
        gender: '',
        team_size: 3,
        individual_player_fee: 0,
        team_event_fee: 0
      });
    }
    setShowCategoryModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.tournament_id) {
      toast.error('Please select a tournament');
      return;
    }

    if (!formData.category_name) {
      toast.error('Event name is required');
      return;
    }

    // Validate weight class for Kumite events
    if ((formData.category_type === 'Kumite' || formData.category_type === 'Team Kumite') && !formData.is_open_event) {
      if (!formData.weight_category || formData.weight_category.trim() === '') {
        toast.error('Weight class is required for Kumite events');
        return;
      }
    }

    // Validate fee based on participation type
    if (formData.participation_type === 'Individual' && (!formData.individual_player_fee || parseFloat(formData.individual_player_fee) < 0)) {
      toast.error('Individual player fee is required and must be 0 or greater');
      return;
    }

    if (formData.participation_type === 'Team' && (!formData.team_event_fee || parseFloat(formData.team_event_fee) < 0)) {
      toast.error('Team event fee is required and must be 0 or greater');
      return;
    }

    try {
      // Clean and prepare category data
      // Ensure boolean values are actual booleans, not strings
      const categoryData = {
        tournament_id: formData.tournament_id,
        category_name: formData.category_name.trim(),
        category_type: formData.category_type,
        participation_type: formData.participation_type,
        age_category: formData.age_category.trim(),
        use_wkf_standard: Boolean(formData.use_wkf_standard),
        use_standard_kumite_classes: Boolean(formData.use_standard_kumite_classes),
        is_open_event: Boolean(formData.is_open_event),
        use_custom_belt_levels: Boolean(formData.use_custom_belt_levels)
      };

      // Handle fees - only include if participation type matches
      if (formData.participation_type === 'Individual') {
        const individualFee = parseFloat(formData.individual_player_fee) || 0;
        categoryData.individual_player_fee = individualFee;
        // Don't include team_event_fee for individual events
      } else if (formData.participation_type === 'Team') {
        const teamFee = parseFloat(formData.team_event_fee) || 0;
        categoryData.team_event_fee = teamFee;
        // Don't include individual_player_fee for team events
        // Team size is required for team events
        const teamSize = parseInt(formData.team_size) || 3;
        if (teamSize >= 2) {
          categoryData.team_size = teamSize;
        }
      }

      // Handle gender - only include if not empty
      if (formData.gender && formData.gender.trim() !== '') {
        categoryData.gender = formData.gender;
      }

      // Handle age range - only include if provided
      if (formData.age_min && formData.age_min !== '') {
        const ageMin = parseInt(formData.age_min);
        if (!isNaN(ageMin) && ageMin >= 0) {
          categoryData.age_min = ageMin;
        }
      }
      if (formData.age_max && formData.age_max !== '') {
        const ageMax = parseInt(formData.age_max);
        if (!isNaN(ageMax) && ageMax >= 0) {
          categoryData.age_max = ageMax;
        }
      }

      // Handle weight category and range - only for Kumite events
      if (formData.category_type === 'Kumite' || formData.category_type === 'Team Kumite') {
        if (formData.weight_category && formData.weight_category.trim() !== '') {
          categoryData.weight_category = formData.weight_category.trim();
        }
        if (formData.weight_min && formData.weight_min !== '') {
          const weightMin = parseFloat(formData.weight_min);
          if (!isNaN(weightMin) && weightMin >= 0) {
            categoryData.weight_min = weightMin;
          }
        }
        if (formData.weight_max && formData.weight_max !== '') {
          const weightMax = parseFloat(formData.weight_max);
          if (!isNaN(weightMax) && weightMax >= 0) {
            categoryData.weight_max = weightMax;
          }
        }
      }

      // Handle belt category - only if not using custom belt levels
      if (!formData.use_custom_belt_levels && formData.belt_category && formData.belt_category.trim() !== '') {
        categoryData.belt_category = formData.belt_category.trim();
      }

      // Handle custom belt levels
      if (formData.use_custom_belt_levels) {
        if (Array.isArray(formData.custom_belt_levels) && formData.custom_belt_levels.length > 0) {
          categoryData.custom_belt_levels = formData.custom_belt_levels;
        }
        // Only include belt_level_groups if it's a non-empty object
        if (formData.belt_level_groups && 
            typeof formData.belt_level_groups === 'object' && 
            formData.belt_level_groups !== null &&
            Object.keys(formData.belt_level_groups).length > 0) {
          categoryData.belt_level_groups = formData.belt_level_groups;
        }
        if (formData.belt_level_group && formData.belt_level_group.trim() !== '') {
          categoryData.belt_level_group = formData.belt_level_group.trim();
        }
        if (formData.belt_level && formData.belt_level.trim() !== '') {
          categoryData.belt_level = formData.belt_level.trim();
        }
      }

      // Remove undefined, null, empty string, empty array, and empty object values
      Object.keys(categoryData).forEach(key => {
        const value = categoryData[key];
        if (value === undefined || value === null || value === '') {
          delete categoryData[key];
        } else if (Array.isArray(value) && value.length === 0) {
          delete categoryData[key];
        } else if (typeof value === 'object' && Object.keys(value).length === 0) {
          delete categoryData[key];
        }
      });

      console.log('Sending category data:', categoryData);

      if (editingCategory) {
        await categoryService.updateCategory(editingCategory._id, categoryData);
        toast.success('Category updated successfully!');
      } else {
        await categoryService.createCategory(categoryData);
        toast.success('Category created successfully!');
      }

      setShowCategoryModal(false);
      setEditingCategory(null);
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      
      // Extract and display specific validation errors
      let errorMessage = 'Failed to save category';
      const errorData = error.response?.data || error.data;
      
      if (errorData) {
        // Check for validation errors array
        if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
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
      
      console.error('Error details:', {
        status: error.response?.status || error.status,
        data: errorData,
        fullError: error
      });
      
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      await categoryService.deleteCategory(categoryId);
      toast.success('Category deleted successfully!');
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(error.response?.data?.message || 'Failed to delete category');
    }
  };

  const filteredCategories = selectedTournament
    ? categories.filter(cat => {
        const catTournamentId = cat.tournament_id?._id || cat.tournament_id;
        return catTournamentId === selectedTournament || catTournamentId?.toString() === selectedTournament?.toString();
      })
    : [];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                  Event Management
                </h1>
                <p className="text-gray-600">
                  Create events for tournaments with entry fees. Each event (defined by age, belt, weight, and type) will have matches (rounds) generated from registrations.
                </p>
              </div>
              <button
                onClick={() => handleOpenModal()}
                disabled={!selectedTournament}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiPlus className="w-5 h-5" />
                Add Event
              </button>
            </div>

            {/* Tournament Selector */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Tournament
              </label>
              <select
                value={selectedTournament}
                onChange={(e) => setSelectedTournament(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a tournament</option>
                {tournaments.map(t => (
                  <option key={t._id} value={t._id}>
                    {t.tournament_name} ({t.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Events List - Organized by Type and Gender */}
          {selectedTournament ? (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Events for {tournaments.find(t => t._id === selectedTournament)?.tournament_name || 'Tournament'}
              </h2>
              {filteredCategories.length === 0 ? (
                <div className="text-center py-12">
                  <FiDollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Events Yet</h3>
                  <p className="text-gray-600 mb-4">Create events with entry fees. Matches (rounds) will be generated automatically from registrations.</p>
                  <button
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Create Event
                  </button>
                </div>
              ) : (
                <OrganizedEventsView 
                  categories={filteredCategories}
                  matches={matches}
                  tatamis={tatamis}
                  onEdit={handleOpenModal}
                  onDelete={handleDelete}
                  onSetupTatami={handleOpenTatamiModal}
                  onGoToTatami={handleGoToTatami}
                />
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <FiDollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Select a Tournament</h3>
              <p className="text-gray-600">Please select a tournament to create and manage events</p>
            </div>
          )}
        </div>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingCategory ? 'Edit Event' : 'Create Event'}
              </h2>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategory(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tournament <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.tournament_id}
                    onChange={(e) => setFormData({ ...formData, tournament_id: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Tournament</option>
                    {tournaments.map(t => (
                      <option key={t._id} value={t._id}>{t.tournament_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.category_name}
                    onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Kata - Under 10 - White Belt"
                  />
                  <p className="text-xs text-gray-500 mt-1">This event will contain matches (rounds) generated from registrations</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Event Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.category_type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        // Clear weight fields when switching to Kata (Kata doesn't use weight classes)
                        if (newType === 'Kata' || newType === 'Team Kata') {
                          setFormData({ 
                            ...formData, 
                            category_type: newType,
                            weight_category: '',
                            weight_min: '',
                            weight_max: '',
                            use_standard_kumite_classes: false
                          });
                        } else {
                          setFormData({ ...formData, category_type: newType });
                        }
                      }}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Kata">Kata</option>
                      <option value="Kumite">Kumite</option>
                      <option value="Team Kata">Team Kata</option>
                      <option value="Team Kumite">Team Kumite</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Type of karate event. <strong>Note:</strong> Kata events don't use weight classes, only Kumite events do.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Participation Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.participation_type}
                      onChange={(e) => setFormData({ ...formData, participation_type: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Individual">Individual</option>
                      <option value="Team">Team</option>
                    </select>
                  </div>
                </div>

                {/* WKF Standard vs Custom Toggle */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={formData.use_wkf_standard}
                        onChange={(e) => setFormData({ ...formData, use_wkf_standard: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      Use WKF Standard Categories
                    </label>
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Recommended</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {formData.use_wkf_standard 
                      ? 'Using World Karate Federation standard categories. You can still customize if needed.'
                      : 'Create custom categories for your tournament (e.g., school events, novice divisions, special age splits)'}
                  </p>
                </div>

                {/* Age Group */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age Group <span className="text-red-500">*</span>
                  </label>
                  {/* For Individual Kumite with standard classes, age is selected in weight class section */}
                  {formData.use_standard_kumite_classes && formData.participation_type === 'Individual' && formData.category_type === 'Kumite' ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-600">
                        Age category will be selected when choosing weight class below.
                      </p>
                    </div>
                  ) : formData.use_wkf_standard ? (
                    <select
                      value={formData.age_category}
                      onChange={(e) => setFormData({ ...formData, age_category: e.target.value, age_min: '', age_max: '' })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Under 10">Under 10</option>
                      <option value="Under 12">Under 12</option>
                      <option value="Under 14">Under 14</option>
                      <option value="Under 16">Under 16</option>
                      <option value="Under 21">Under 21</option>
                      <option value="Over 21">Over 21</option>
                      <option value="Open">Open</option>
                    </select>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={formData.age_category}
                        onChange={(e) => setFormData({ ...formData, age_category: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Under 8, Under 13, Cadet, Novice"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={formData.age_min}
                          onChange={(e) => setFormData({ ...formData, age_min: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Min Age (optional)"
                          min="0"
                        />
                        <input
                          type="number"
                          value={formData.age_max}
                          onChange={(e) => setFormData({ ...formData, age_max: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Max Age (optional)"
                          min="0"
                        />
                      </div>
                      <p className="text-xs text-gray-500">Custom age group name (e.g., "Under 8", "Novice 10-12") or specify min/max age range</p>
                    </div>
                  )}
                </div>

                {/* Belt Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Belt Category
                  </label>
                  <div className="space-y-3">
                    {/* Custom Belt Levels Toggle */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={formData.use_custom_belt_levels || false}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setFormData({ 
                              ...formData, 
                              use_custom_belt_levels: isChecked,
                              belt_category: isChecked ? '' : formData.belt_category,
                              belt_level: isChecked ? '' : formData.belt_level,
                              custom_belt_levels: isChecked ? (formData.custom_belt_levels.length > 0 ? formData.custom_belt_levels : []) : []
                            });
                          }}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        Use Custom Belt Names with Kyu Levels
                      </label>
                      <p className="text-xs text-purple-700 mt-1">
                        Enable to use belt names with kyu levels (e.g., White 10th kyu, Brown Level 1 - 3rd kyu)
                      </p>
                    </div>

                    {formData.use_custom_belt_levels ? (
                      <div className="space-y-3">
                        {/* Custom Belt Levels Input */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-medium text-gray-600">
                              Define Belt Levels (one per line)
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                // Organize into groups as per user requirement
                                const presetGroups = {
                                  '10,9,8,7 Kyu': [
                                    'White 10th kyu',
                                    'White belt red bar 9th kyu',
                                    'Yellow belt 8th kyu',
                                    'Orange belt 7th kyu'
                                  ],
                                  '6,5,4 Kyu': [
                                    'Green belt 6th kyu',
                                    'Blue belt level 1 - 5th kyu',
                                    'Blue belt level 2 - 4th kyu'
                                  ],
                                  '3,2,1 Kyu': [
                                    'Brown belt level 1 - 3rd kyu',
                                    'Brown belt level 2 - 2nd kyu',
                                    'Brown belt level 3 - 1st kyu'
                                  ],
                                  'Black belt': [
                                    'Black belt (Open)'
                                  ]
                                };
                                // Flatten for display in textarea
                                const allLevels = Object.values(presetGroups).flat();
                                setFormData({ 
                                  ...formData, 
                                  custom_belt_levels: allLevels,
                                  belt_level_groups: presetGroups
                                });
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Load Preset (Organized by Levels)
                            </button>
                          </div>
                          <textarea
                            value={formData.custom_belt_levels.join('\n')}
                            onChange={(e) => {
                              const levels = e.target.value.split('\n').filter(l => l.trim());
                              setFormData({ ...formData, custom_belt_levels: levels });
                            }}
                            rows={6}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="White 10th kyu&#10;White belt red bar 9th kyu&#10;Yellow belt 8th kyu&#10;Green belt 6th kyu&#10;Blue belt level 1 - 5th kyu&#10;Blue belt level 2 - 4th kyu&#10;Brown belt level 1 - 3rd kyu&#10;Brown belt level 2 - 2nd kyu&#10;Brown belt level 3 - 1st kyu&#10;Black belt (Open)"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Enter one belt level per line, or click "Load Preset" for common kyu levels. These will be available for selection below.
                          </p>
                        </div>
                        {/* Select Belt Level Group */}
                        {Object.keys(formData.belt_level_groups || {}).length > 0 ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Select Belt Level Group for this Event
                              </label>
                              <select
                                value={formData.belt_level_group}
                                onChange={(e) => setFormData({ 
                                  ...formData, 
                                  belt_level_group: e.target.value,
                                  belt_level: '' // Reset specific level when group changes
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">Open (All Belt Level Groups)</option>
                                {Object.keys(formData.belt_level_groups).map((groupName) => (
                                  <option key={groupName} value={groupName}>{groupName}</option>
                                ))}
                              </select>
                              <p className="text-xs text-gray-500 mt-1">
                                Select a level group (e.g., 10,9,8,7 Kyu, 6,5,4 Kyu, 3,2,1 Kyu, Black belt)
                              </p>
                            </div>
                            {/* Show specific belt levels within selected group */}
                            {formData.belt_level_group && formData.belt_level_groups[formData.belt_level_group] && (
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Select Specific Belt Level (Optional - leave empty for all in group)
                                </label>
                                <select
                                  value={formData.belt_level}
                                  onChange={(e) => setFormData({ ...formData, belt_level: e.target.value })}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="">All in {formData.belt_level_group}</option>
                                  {formData.belt_level_groups[formData.belt_level_group].map((level, idx) => (
                                    <option key={idx} value={level}>{level}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        ) : formData.custom_belt_levels.length > 0 ? (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Select Belt Level for this Event
                            </label>
                            <select
                              value={formData.belt_level}
                              onChange={(e) => setFormData({ ...formData, belt_level: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Open (All Belt Levels)</option>
                              {formData.custom_belt_levels.map((level, idx) => (
                                <option key={idx} value={level}>{level}</option>
                              ))}
                            </select>
                          </div>
                        ) : null}
                      </div>
                    ) : formData.use_wkf_standard ? (
                      <select
                        value={formData.belt_category}
                        onChange={(e) => setFormData({ ...formData, belt_category: e.target.value, belt_groups: [] })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Open (All Belts)</option>
                        <option value="White">White</option>
                        <option value="Yellow">Yellow</option>
                        <option value="Orange">Orange</option>
                        <option value="Green">Green</option>
                        <option value="Blue">Blue</option>
                        <option value="Purple">Purple</option>
                        <option value="Brown">Brown</option>
                        <option value="Black">Black</option>
                      </select>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={formData.belt_category}
                          onChange={(e) => setFormData({ ...formData, belt_category: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., Novice (White-Green), Intermediate (Blue-Brown), Black Belt Only"
                        />
                        <p className="text-xs text-gray-500">Custom belt grouping name (e.g., "Novice", "White to Green", "Black Belt Only")</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Weight Class - Only for Kumite (not Kata) */}
                {(formData.category_type === 'Kumite' || formData.category_type === 'Team Kumite') && (
                  <div className="space-y-4">
                    {/* Standard Kumite Classes Toggle - Only for Individual Kumite */}
                    {formData.participation_type === 'Individual' && formData.category_type === 'Kumite' && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <input
                              type="checkbox"
                              checked={formData.use_standard_kumite_classes || false}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                setFormData({ 
                                  ...formData, 
                                  use_standard_kumite_classes: isChecked,
                                  weight_category: isChecked ? '' : formData.weight_category,
                                  weight_min: isChecked ? '' : formData.weight_min,
                                  weight_max: isChecked ? '' : formData.weight_max
                                });
                              }}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                            Use Standard Kumite Age & Weight Classes
                          </label>
                          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Recommended</span>
                        </div>
                        <p className="text-xs text-gray-600">
                          {formData.use_standard_kumite_classes
                            ? 'Using standard Kumite age and weight classes. Select age category and gender below, then choose weight class.'
                            : 'Use standard Kumite classes based on age and gender, or create custom weight classes.'}
                        </p>
                      </div>
                    )}

                    {formData.use_standard_kumite_classes && formData.participation_type === 'Individual' && formData.category_type === 'Kumite' ? (
                      // Standard Kumite Classes - Age Category, Gender, then Weight Class
                      <div className="space-y-4">
                        {/* Age Category for Standard Kumite */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Age Category <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={formData.age_category}
                            onChange={(e) => {
                              setFormData({ 
                                ...formData, 
                                age_category: e.target.value,
                                weight_category: '', // Reset weight when age changes
                                weight_min: '',
                                weight_max: ''
                              });
                            }}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select Age Category</option>
                            <option value="Under 10">Under 10</option>
                            <option value="Under 12">Under 12</option>
                            <option value="Under 14">Under 14</option>
                            <option value="Under 16">Under 16</option>
                            <option value="Under 21">Under 21</option>
                            <option value="Over 21">Over 21</option>
                          </select>
                        </div>

                        {/* Gender for Standard Kumite */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Gender <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={formData.gender}
                            onChange={(e) => {
                              setFormData({ 
                                ...formData, 
                                gender: e.target.value,
                                weight_category: '', // Reset weight when gender changes
                                weight_min: '',
                                weight_max: ''
                              });
                            }}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>

                        {/* Weight Class based on Age and Gender */}
                        {formData.age_category && formData.gender && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Weight Class <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={formData.weight_category}
                              onChange={(e) => {
                                const selectedWeight = getWeightClasses(formData.age_category, formData.gender)
                                  .find(w => w.value === e.target.value);
                                setFormData({ 
                                  ...formData, 
                                  weight_category: e.target.value,
                                  weight_min: selectedWeight?.min || '',
                                  weight_max: selectedWeight?.max || ''
                                });
                              }}
                              required
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Select Weight Class</option>
                              {getWeightClasses(formData.age_category, formData.gender).map((weightClass, idx) => (
                                <option key={idx} value={weightClass.value}>
                                  {weightClass.label}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                              Available weight classes for {formData.gender} {formData.age_category}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Custom Weight Class (original logic)
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Weight Class <span className="text-red-500">*</span>
                        </label>
                        {formData.use_wkf_standard ? (
                          <select
                            value={formData.weight_category}
                            onChange={(e) => setFormData({ ...formData, weight_category: e.target.value, weight_min: '', weight_max: '' })}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Open (All Weights)</option>
                            <option value="Light">Light</option>
                            <option value="Middle">Middle</option>
                            <option value="Heavy">Heavy</option>
                            <option value="Super Heavy">Super Heavy</option>
                          </select>
                        ) : (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={formData.weight_category}
                              onChange={(e) => setFormData({ ...formData, weight_category: e.target.value })}
                              required
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="e.g., -25kg, -30kg, -35kg, -52kg, -57kg"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                value={formData.weight_min}
                                onChange={(e) => setFormData({ ...formData, weight_min: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Min Weight (kg, optional)"
                                min="0"
                                step="0.1"
                              />
                              <input
                                type="number"
                                value={formData.weight_max}
                                onChange={(e) => setFormData({ ...formData, weight_max: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Max Weight (kg, optional)"
                                min="0"
                                step="0.1"
                              />
                            </div>
                            <p className="text-xs text-gray-500">Custom weight class name (e.g., "-25kg", "-30kg") or specify min/max weight range</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Note for Kata events */}
                {(formData.category_type === 'Kata' || formData.category_type === 'Team Kata') && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      <strong>Note:</strong> Kata events are not divided by weight classes. This event will be organized by belt category/level and age group only.
                    </p>
                  </div>
                )}

                {/* Gender, Team Size, and Open Event */}
                {/* Gender is handled in standard Kumite classes section, so hide it here if using standard classes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!(formData.use_standard_kumite_classes && formData.participation_type === 'Individual' && formData.category_type === 'Kumite') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gender
                      </label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Mixed</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  )}

                  {formData.participation_type === 'Team' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Team Size <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.team_size}
                        onChange={(e) => setFormData({ ...formData, team_size: e.target.value })}
                        required
                        min="2"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="3"
                      />
                      <p className="text-xs text-gray-500 mt-1">Number of members per team (default: 3)</p>
                    </div>
                  )}
                </div>

                {/* Open Event Option for Team Events Over 19 */}
                {formData.participation_type === 'Team' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={formData.is_open_event}
                        onChange={(e) => setFormData({ ...formData, is_open_event: e.target.checked })}
                        className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                      />
                      Open Event (No restrictions - for Team Kata/Kumite over 19 years)
                    </label>
                    <p className="text-xs text-yellow-700 mt-1">
                      Check this if this is an open event with no age, belt, or weight restrictions (commonly used for senior team events)
                    </p>
                  </div>
                )}

                {/* Fee Fields - Conditional based on participation type */}
                {formData.participation_type === 'Individual' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Individual Player Fee (Rs) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.individual_player_fee}
                      onChange={(e) => setFormData({ ...formData, individual_player_fee: e.target.value })}
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Fee per individual player for this event</p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team Event Fee (Rs) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.team_event_fee}
                      onChange={(e) => setFormData({ ...formData, team_event_fee: e.target.value })}
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Fee per team ({formData.team_size || 3} members) for this event</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                >
                  Cancel
                </button>
                  <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition font-medium"
                >
                  {editingCategory ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tatami Setup Modal */}
      {showTatamiModal && selectedCategoryForTatami && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                Setup Tatami for {selectedCategoryForTatami.category_name}
              </h2>
              <button
                onClick={() => {
                  setShowTatamiModal(false);
                  setSelectedCategoryForTatami(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateOrUpdateTatami();
              }}
              className="p-6 space-y-6"
            >
              {/* Tatami Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tatami Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={tatamiFormData.tatami_number}
                    onChange={(e) => setTatamiFormData({ ...tatamiFormData, tatami_number: parseInt(e.target.value) || 1 })}
                    required
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tatami Name
                  </label>
                  <input
                    type="text"
                    value={tatamiFormData.tatami_name}
                    onChange={(e) => setTatamiFormData({ ...tatamiFormData, tatami_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Tatami 1, Main Arena"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={tatamiFormData.location}
                    onChange={(e) => setTatamiFormData({ ...tatamiFormData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Area A, Main Hall"
                  />
                </div>
              </div>

              {/* Judge Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign Judges to Event (Select up to 5 judges)
                </label>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-xs text-blue-800">
                    <strong>Note:</strong> Judges assigned here will automatically judge <strong>all matches</strong> in this event. 
                    They are assigned to the event, not individual matches.
                  </p>
                </div>
                <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {judges.length === 0 ? (
                    <p className="text-gray-500 text-sm">No judges registered for this tournament</p>
                  ) : (
                    <div className="space-y-2">
                      {judges.map((judge) => {
                        const user = judge.user_id;
                        const name = user?.first_name && user?.last_name
                          ? `${user.first_name} ${user.last_name}`
                          : user?.username || 'Unknown Judge';
                        
                        const isSelected = tatamiFormData.assigned_judges.some(
                          j => String(j.judge_id) === String(judge._id)
                        );
                        const selectedJudge = tatamiFormData.assigned_judges.find(
                          j => String(j.judge_id) === String(judge._id)
                        );

                        return (
                          <div
                            key={judge._id}
                            className={`border-2 rounded-lg p-3 ${
                              isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      if (tatamiFormData.assigned_judges.length >= 5) {
                                        toast.error('Maximum 5 judges can be assigned to an event');
                                        return;
                                      }
                                      setTatamiFormData({
                                        ...tatamiFormData,
                                        assigned_judges: [
                                          ...tatamiFormData.assigned_judges,
                                          { judge_id: judge._id, judge_role: 'Judge' }
                                        ]
                                      });
                                    } else {
                                      setTatamiFormData({
                                        ...tatamiFormData,
                                        assigned_judges: tatamiFormData.assigned_judges.filter(
                                          j => String(j.judge_id) !== String(judge._id)
                                        )
                                      });
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600"
                                  disabled={!isSelected && tatamiFormData.assigned_judges.length >= 5}
                                />
                                <div>
                                  <p className="font-semibold text-gray-800">{name}</p>
                                  <p className="text-xs text-gray-600">
                                    {judge.certification_level} • {judge.specialization?.join(', ') || 'General'}
                                  </p>
                                </div>
                              </div>
                              {isSelected && (
                                <select
                                  value={selectedJudge?.judge_role || 'Judge'}
                                  onChange={(e) => {
                                    setTatamiFormData({
                                      ...tatamiFormData,
                                      assigned_judges: tatamiFormData.assigned_judges.map(j =>
                                        String(j.judge_id) === String(judge._id)
                                          ? { ...j, judge_role: e.target.value }
                                          : j
                                      )
                                    });
                                  }}
                                  className="text-sm border border-gray-300 rounded px-2 py-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <option value="Judge">Judge</option>
                                  <option value="Head Judge">Head Judge</option>
                                  <option value="Referee">Referee</option>
                                  <option value="Timekeeper">Timekeeper</option>
                                  <option value="Scorekeeper">Scorekeeper</option>
                                </select>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Selected: {tatamiFormData.assigned_judges.length}/5 judge(s). These judges will automatically be assigned to all matches in this event. Judges will need to confirm their assignment before accessing the tatami dashboard.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowTatamiModal(false);
                    setSelectedCategoryForTatami(null);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition font-medium"
                >
                  {tatamis.find(t => String(t.category_id?._id || t.category_id) === String(selectedCategoryForTatami._id))
                    ? 'Update Tatami'
                    : 'Create Tatami & Assign Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

// Organized Events View Component - Groups events by Type and Gender
const OrganizedEventsView = ({ categories, matches, tatamis, onEdit, onDelete, onSetupTatami, onGoToTatami }) => {
  // Organize categories by event type and gender
  const organizedEvents = {
    'Kata': {
      'Male': [],
      'Female': [],
      'Mixed': []
    },
    'Kumite': {
      'Male': [],
      'Female': [],
      'Mixed': []
    },
    'Team Kata': {
      'Male': [],
      'Female': [],
      'Mixed': []
    },
    'Team Kumite': {
      'Male': [],
      'Female': [],
      'Mixed': []
    }
  };

  // Group categories by event type and gender
  categories.forEach(category => {
    const eventType = category.category_type || 'Kata';
    // Determine gender: use category.gender if set, otherwise default to 'Mixed'
    let genderKey = 'Mixed';
    if (category.gender === 'Male') {
      genderKey = 'Male';
    } else if (category.gender === 'Female') {
      genderKey = 'Female';
    } else {
      // For null, 'Mixed', or open events, use 'Mixed'
      genderKey = 'Mixed';
    }
    
    if (organizedEvents[eventType] && organizedEvents[eventType][genderKey]) {
      organizedEvents[eventType][genderKey].push(category);
    }
  });

  // Event type colors and icons
  const eventTypeConfig = {
    'Kata': { 
      color: 'blue', 
      bgColor: 'bg-blue-50', 
      borderColor: 'border-blue-300',
      textColor: 'text-blue-700',
      icon: '🥋'
    },
    'Kumite': { 
      color: 'red', 
      bgColor: 'bg-red-50', 
      borderColor: 'border-red-300',
      textColor: 'text-red-700',
      icon: '⚔️'
    },
    'Team Kata': { 
      color: 'purple', 
      bgColor: 'bg-purple-50', 
      borderColor: 'border-purple-300',
      textColor: 'text-purple-700',
      icon: '👥🥋'
    },
    'Team Kumite': { 
      color: 'orange', 
      bgColor: 'bg-orange-50', 
      borderColor: 'border-orange-300',
      textColor: 'text-orange-700',
      icon: '👥⚔️'
    }
  };

  const genderConfig = {
    'Male': { color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800', icon: '♂️' },
    'Female': { color: 'pink', bgColor: 'bg-pink-100', textColor: 'text-pink-800', icon: '♀️' },
    'Mixed': { color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800', icon: '⚥' }
  };

  // Calculate summary statistics
  const summary = Object.entries(organizedEvents).map(([eventType, genders]) => {
    const total = Object.values(genders).flat().length;
    const male = genders.Male.length;
    const female = genders.Female.length;
    const mixed = genders.Mixed.length;
    return { eventType, total, male, female, mixed, config: eventTypeConfig[eventType] };
  }).filter(s => s.total > 0);

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      {summary.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {summary.map(({ eventType, total, male, female, mixed, config }) => (
            <div key={eventType} className={`${config.bgColor} border-2 ${config.borderColor} rounded-lg p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{config.icon}</span>
                <h4 className={`font-bold ${config.textColor}`}>{eventType}</h4>
              </div>
              <div className="text-sm space-y-1">
                <p className="font-semibold text-gray-700">Total: {total} events</p>
                {male > 0 && <p className="text-blue-700">♂️ Male: {male}</p>}
                {female > 0 && <p className="text-pink-700">♀️ Female: {female}</p>}
                {mixed > 0 && <p className="text-gray-600">⚥ Mixed: {mixed}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Organized Events by Type and Gender */}
      {Object.entries(organizedEvents).map(([eventType, genders]) => {
        const totalEvents = Object.values(genders).flat().length;
        if (totalEvents === 0) return null;

        const config = eventTypeConfig[eventType];
        
        return (
          <div key={eventType} className={`border-2 ${config.borderColor} rounded-xl overflow-hidden`}>
            {/* Event Type Header */}
            <div className={`${config.bgColor} px-6 py-4 border-b-2 ${config.borderColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{config.icon}</span>
                  <div>
                    <h3 className={`text-2xl font-bold ${config.textColor}`}>{eventType}</h3>
                    <p className="text-sm text-gray-600 mt-1">{totalEvents} event{totalEvents !== 1 ? 's' : ''} total</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Gender Sections - Display in order: Male, Female, Mixed */}
            <div className="p-6 space-y-6">
              {['Male', 'Female', 'Mixed'].map((gender) => {
                const events = genders[gender] || [];
                if (events.length === 0) return null;
                
                const genderCfg = genderConfig[gender];
                
                return (
                  <div key={gender} className="space-y-4">
                    {/* Gender Header */}
                    <div className={`${genderCfg.bgColor} px-4 py-2 rounded-lg flex items-center gap-2`}>
                      <span className="text-lg">{genderCfg.icon}</span>
                      <h4 className={`font-bold text-lg ${genderCfg.textColor}`}>
                        {gender} Events ({events.length})
                      </h4>
                    </div>

                    {/* Events Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {events.map((category) => {
                        const eventMatches = matches.filter(m => {
                          const matchCategoryId = m.category_id?._id || m.category_id;
                          return matchCategoryId === category._id || matchCategoryId?.toString() === category._id?.toString();
                        });
                        
                        const tatami = tatamis?.find(t => 
                          String(t.category_id?._id || t.category_id) === String(category._id)
                        );
                        
                        return (
                          <EventCard
                            key={category._id}
                            category={category}
                            eventMatches={eventMatches}
                            tatami={tatami}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onSetupTatami={onSetupTatami}
                            onGoToTatami={onGoToTatami}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Event Card Component
const EventCard = ({ category, eventMatches, tatami, onEdit, onDelete, onSetupTatami, onGoToTatami }) => {
  return (
    <div className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition bg-white">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="font-bold text-lg text-gray-800">{category.category_name}</h3>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Event</span>
            {tatami && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">
                Tatami {tatami.tatami_number}
              </span>
            )}
            {category.is_open_event && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-semibold">Open</span>
            )}
            {category.use_wkf_standard && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">WKF</span>
            )}
          </div>
          <div className="space-y-1 text-sm text-gray-600 mb-3">
            <p><span className="font-semibold">Participation:</span> {category.participation_type}</p>
            <p>
              <span className="font-semibold">Age:</span> {category.age_category}
              {category.age_min && category.age_max && (
                <span className="text-gray-500 ml-1">({category.age_min}-{category.age_max} years)</span>
              )}
            </p>
            {category.use_custom_belt_levels && (
              <>
                {category.belt_level_group && (
                  <p><span className="font-semibold">Belt Group:</span> {category.belt_level_group}</p>
                )}
                {category.belt_level && (
                  <p><span className="font-semibold">Belt Level:</span> {category.belt_level}</p>
                )}
                {!category.belt_level_group && !category.belt_level && (
                  <p><span className="font-semibold">Belt:</span> Open</p>
                )}
              </>
            )}
            {!category.use_custom_belt_levels && category.belt_category && (
              <p><span className="font-semibold">Belt:</span> {category.belt_category}</p>
            )}
            {(category.category_type === 'Kumite' || category.category_type === 'Team Kumite') && category.weight_category && (
              <p>
                <span className="font-semibold">Weight:</span> {category.weight_category}
                {category.weight_min && category.weight_max && (
                  <span className="text-gray-500 ml-1">({category.weight_min}-{category.weight_max}kg)</span>
                )}
              </p>
            )}
            {category.participation_type === 'Team' && category.team_size && (
              <p><span className="font-semibold">Team Size:</span> {category.team_size} members</p>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            {category.participation_type === 'Individual' ? (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Individual Fee:</span>
                <span className="text-xl font-bold text-green-600">Rs {category.individual_player_fee?.toFixed(2) || '0.00'}</span>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Team Fee:</span>
                <span className="text-xl font-bold text-green-600">Rs {category.team_event_fee?.toFixed(2) || '0.00'}</span>
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500">
            <p className="font-semibold text-gray-700">{eventMatches.length} Match{eventMatches.length !== 1 ? 'es' : ''} Generated</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 ml-4">
          {tatami ? (
            <button
              onClick={() => onGoToTatami(category)}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
              title="Go to Tatami Dashboard"
            >
              <FiExternalLink className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => onSetupTatami(category)}
              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
              title="Setup Tatami"
            >
              <FiSettings className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => onEdit(category)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
            title="Edit Event"
          >
            <FiEdit className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDelete(category._id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Delete Event"
          >
            <FiTrash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryManagement;

