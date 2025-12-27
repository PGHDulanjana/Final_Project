import React, { useState, useEffect } from 'react';
import { tournamentService } from '../../services/tournamentService';
import { toast } from 'react-toastify';
import { FiX } from 'react-icons/fi';

const CreateTournamentModal = ({ onClose, onSuccess, tournament = null }) => {
  const isEditMode = !!tournament;
  
  // Format date for datetime-local input
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState({
    tournament_name: '',
    description: '',
    start_date: '',
    end_date: '',
    venue: '',
    venue_address: '',
    registration_deadline: '',
    rules: '',
    max_participants: '',
    status: 'Draft',
    bank_account_holder_name: '',
    bank_name: '',
    bank_account_number: '',
    bank_branch: '',
    bank_swift_code: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Load tournament data if editing
  useEffect(() => {
    if (tournament) {
      setFormData({
        tournament_name: tournament.tournament_name || '',
        description: tournament.description || '',
        start_date: formatDateForInput(tournament.start_date),
        end_date: formatDateForInput(tournament.end_date),
        venue: tournament.venue || '',
        venue_address: tournament.venue_address || '',
        registration_deadline: formatDateForInput(tournament.registration_deadline),
        rules: tournament.rules || '',
        max_participants: tournament.max_participants || '',
        status: tournament.status || 'Draft',
        bank_account_holder_name: tournament.bank_account_holder_name || '',
        bank_name: tournament.bank_name || '',
        bank_account_number: tournament.bank_account_number || '',
        bank_branch: tournament.bank_branch || '',
        bank_swift_code: tournament.bank_swift_code || ''
      });
    }
  }, [tournament]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'max_participants'
        ? value === '' ? '' : parseFloat(value) || 0
        : value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.tournament_name.trim()) {
      newErrors.tournament_name = 'Tournament name is required';
    }
    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }
    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }
    if (formData.start_date && formData.end_date && new Date(formData.end_date) < new Date(formData.start_date)) {
      newErrors.end_date = 'End date must be after start date';
    }
    if (!formData.venue.trim()) {
      newErrors.venue = 'Venue is required';
    }
    if (!formData.venue_address.trim()) {
      newErrors.venue_address = 'Venue address is required';
    }
    if (!formData.registration_deadline) {
      newErrors.registration_deadline = 'Registration deadline is required';
    }
    if (formData.registration_deadline && formData.start_date && new Date(formData.registration_deadline) > new Date(formData.start_date)) {
      newErrors.registration_deadline = 'Registration deadline must be before start date';
    }
    if (formData.max_participants && formData.max_participants < 1) {
      newErrors.max_participants = 'Max participants must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      const tournamentData = {
        ...formData,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : undefined
      };

      let createdTournament;
      if (isEditMode) {
        await tournamentService.updateTournament(tournament._id, tournamentData);
        toast.success('Tournament updated successfully!');
        onSuccess(tournament._id);
      } else {
        const response = await tournamentService.createTournament(tournamentData);
        createdTournament = response.data;
        toast.success('Tournament created successfully!');
        onSuccess(createdTournament._id || createdTournament.id);
      }
    } catch (error) {
      console.error('Error creating tournament:', error);
      let errorMessage = error.response?.data?.message || error.message || 'Failed to create tournament';
      
      // Handle specific error cases
      if (error.response?.status === 404 && errorMessage.includes('organizer profile')) {
        errorMessage = 'Organizer profile not found. The system will attempt to create one automatically. Please try again.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again or contact support.';
      }
      
      toast.error(errorMessage);
      
      // Set field-specific errors if available
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            {isEditMode ? 'Edit Tournament' : 'Create New Tournament'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tournament Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tournament Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="tournament_name"
                value={formData.tournament_name}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.tournament_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter tournament name"
                maxLength={200}
              />
              {errors.tournament_name && (
                <p className="text-red-500 text-xs mt-1">{errors.tournament_name}</p>
              )}
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter tournament description"
                maxLength={2000}
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.start_date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.start_date && (
                <p className="text-red-500 text-xs mt-1">{errors.start_date}</p>
              )}
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.end_date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.end_date && (
                <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>
              )}
            </div>

            {/* Venue */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Venue <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="venue"
                value={formData.venue}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.venue ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter venue name"
                maxLength={200}
              />
              {errors.venue && (
                <p className="text-red-500 text-xs mt-1">{errors.venue}</p>
              )}
            </div>

            {/* Venue Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Venue Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="venue_address"
                value={formData.venue_address}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.venue_address ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter full address"
              />
              {errors.venue_address && (
                <p className="text-red-500 text-xs mt-1">{errors.venue_address}</p>
              )}
            </div>

            {/* Info about fees */}
            <div className="md:col-span-2">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Entry fees are set at the <strong>Event</strong> level. After creating the tournament, 
                  you can create <strong>Events</strong> (defined by age group, belt rank, weight class, and event type like Kata/Kumite) 
                  with specific entry fees. Matches (rounds) will be automatically generated from registrations within each event.
                </p>
              </div>
            </div>

            {/* Registration Deadline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Registration Deadline <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                name="registration_deadline"
                value={formData.registration_deadline}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.registration_deadline ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.registration_deadline && (
                <p className="text-red-500 text-xs mt-1">{errors.registration_deadline}</p>
              )}
            </div>

            {/* Max Participants */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Participants (Optional)
              </label>
              <input
                type="number"
                name="max_participants"
                value={formData.max_participants}
                onChange={handleChange}
                min="1"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.max_participants ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="No limit"
              />
              {errors.max_participants && (
                <p className="text-red-500 text-xs mt-1">{errors.max_participants}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Draft">Draft</option>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            {/* Rules */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rules & Regulations (Optional)
              </label>
              <textarea
                name="rules"
                value={formData.rules}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter tournament rules and regulations"
                maxLength={5000}
              />
            </div>

            {/* Bank Account Details Section */}
            <div className="md:col-span-2 mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Bank Account Details (Optional)</h3>
              <p className="text-sm text-gray-600 mb-4">
                Add your bank account details to display payment information to participants.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Account Holder Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    name="bank_account_holder_name"
                    value={formData.bank_account_holder_name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter account holder name"
                    maxLength={200}
                  />
                </div>

                {/* Bank Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter bank name"
                    maxLength={200}
                  />
                </div>

                {/* Account Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    name="bank_account_number"
                    value={formData.bank_account_number}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter account number"
                    maxLength={50}
                  />
                </div>

                {/* Branch */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch
                  </label>
                  <input
                    type="text"
                    name="bank_branch"
                    value={formData.bank_branch}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter branch name"
                    maxLength={200}
                  />
                </div>

                {/* SWIFT Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SWIFT Code (Optional)
                  </label>
                  <input
                    type="text"
                    name="bank_swift_code"
                    value={formData.bank_swift_code}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter SWIFT code"
                    maxLength={20}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading 
                ? (isEditMode ? 'Updating...' : 'Creating...') 
                : (isEditMode ? 'Update Tournament' : 'Create Tournament')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTournamentModal;

