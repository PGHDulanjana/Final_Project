import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { coachService } from '../services/coachService';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { FiEye, FiEyeOff, FiCheck, FiChevronRight, FiChevronLeft, FiInfo } from 'react-icons/fi';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';

const RegisterEnhanced = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password_hash: '',
    first_name: '',
    last_name: '',
    user_type: 'Player',
    phone: '',
    date_of_birth: '',
    gender: '',
    // Player-specific fields
    selected_coach_id: '',
    player_dojo_name: '',
    coach_name: '',
    coach_id: '',
    // Coach-specific fields
    dojo_name: '',
    dojo_street: '',
    dojo_city: '',
    dojo_state: '',
    dojo_zip_code: '',
    dojo_country: '',
    dojo_phone: '',
    dojo_description: '',
    dojo_established_date: '',
    // Optional organization details
    organization_name: '',
    organization_license: '',
    // Coach profile fields
    certification_level: '',
    experience_years: '',
    specialization: []
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coaches, setCoaches] = useState([]);
  const [loadingCoaches, setLoadingCoaches] = useState(false);
  const [selectedCoachDojos, setSelectedCoachDojos] = useState([]);
  const { register } = useAuth();
  const navigate = useNavigate();

  // Load coaches when user type is Player
  useEffect(() => {
    if (formData.user_type === 'Player') {
      loadCoaches();
    }
  }, [formData.user_type]);

  const loadCoaches = async () => {
    setLoadingCoaches(true);
    try {
      const response = await coachService.getCoaches();
      setCoaches(response.data || []);
    } catch (error) {
      console.error('Error loading coaches:', error);
      toast.error('Failed to load coaches list');
    } finally {
      setLoadingCoaches(false);
    }
  };

  const steps = [
    { number: 1, title: 'Account Info', fields: ['username', 'email', 'password_hash'] },
    { number: 2, title: 'Personal Details', fields: ['first_name', 'last_name', 'date_of_birth', 'gender'] },
    { number: 3, title: 'Contact Info', fields: ['phone', 'user_type'] },
    { number: 4, title: 'Review & Submit', fields: [] }
  ];

  const validateUsername = (username) => {
    if (!username) return 'Username is required';
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (username.length > 30) return 'Username must be less than 30 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores';
    return '';
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return '';
  };

  const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return '';
  };

  const validateName = (name, fieldName) => {
    if (!name) return `${fieldName} is required`;
    if (name.length < 2) return `${fieldName} must be at least 2 characters`;
    if (!/^[a-zA-Z\s]+$/.test(name)) return `${fieldName} can only contain letters and spaces`;
    return '';
  };

  const validatePhone = (phone) => {
    if (phone && !/^[0-9]{10}$/.test(phone)) return 'Phone number must be exactly 10 digits';
    return '';
  };

  const validateDateOfBirth = (date) => {
    if (date) {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        return 'Invalid date of birth';
      }
      if (age < 5) return 'You must be at least 5 years old';
      if (age > 100) return 'Please enter a valid date of birth';
    }
    return '';
  };

  const validateStep = (step) => {
    const stepFields = steps[step - 1].fields;
    const newErrors = {};

    stepFields.forEach(field => {
      let error = '';
      switch (field) {
        case 'username':
          error = validateUsername(formData.username);
          break;
        case 'email':
          error = validateEmail(formData.email);
          break;
        case 'password_hash':
          error = validatePassword(formData.password_hash);
          break;
        case 'first_name':
          error = validateName(formData.first_name, 'First name');
          break;
        case 'last_name':
          error = validateName(formData.last_name, 'Last name');
          break;
        case 'phone':
          error = validatePhone(formData.phone);
          break;
        case 'date_of_birth':
          error = validateDateOfBirth(formData.date_of_birth);
          break;
        default:
          break;
      }
      if (error) newErrors[field] = error;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    } else {
      toast.error('Please fix the errors before continuing');
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(currentStep)) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      // Clean form data - create a new object with only valid values
      const cleanedFormData = {
        username: formData.username,
        email: formData.email,
        password_hash: formData.password_hash,
        first_name: formData.first_name,
        last_name: formData.last_name,
        user_type: formData.user_type,
        // Player-specific fields - Coach selection is MANDATORY
        selected_coach_id: formData.selected_coach_id || '',
        player_dojo_name: formData.player_dojo_name || '',
        coach_name: formData.coach_name || '',
        coach_id: formData.coach_id || formData.selected_coach_id || '',
      };
      
      // Only add optional fields if they have valid values
      if (formData.phone && formData.phone.trim() !== '') {
        cleanedFormData.phone = formData.phone.trim();
      }
      
      if (formData.date_of_birth && formData.date_of_birth.trim() !== '') {
        cleanedFormData.date_of_birth = formData.date_of_birth;
      }
      
      // Handle gender: only include if it's a valid enum value
      const genderValue = formData.gender;
      if (genderValue && 
          genderValue !== '' && 
          genderValue !== null && 
          genderValue !== undefined &&
          typeof genderValue === 'string') {
        const trimmedGender = genderValue.trim();
        if (['Male', 'Female', 'Other'].includes(trimmedGender)) {
          cleanedFormData.gender = trimmedGender;
        }
      }
      // If gender is not valid, don't include it at all (not even as null/undefined)
      
      // Validate player-specific required fields - Coach selection is MANDATORY
      if (formData.user_type === 'Player') {
        if (!formData.selected_coach_id) {
          toast.error('Please select your coach and dojo to continue registration');
          setLoading(false);
          return;
        }
        if (!formData.player_dojo_name) {
          toast.error('Please select your dojo to continue registration');
          setLoading(false);
          return;
        }
      }

      const result = await register(cleanedFormData);
      if (result && result.success) {
        toast.success('Registration successful!');
        setTimeout(() => navigate('/dashboard'), 1000);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.username ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Choose a unique username"
              />
              {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="your.email@example.com"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password_hash"
                  value={formData.password_hash}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.password_hash ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                </button>
              </div>
              <PasswordStrengthMeter password={formData.password_hash} />
              {errors.password_hash && <p className="mt-1 text-sm text-red-600">{errors.password_hash}</p>}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.first_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.first_name && <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.last_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.last_name && <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 5)).toISOString().split('T')[0]}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.date_of_birth ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.date_of_birth && <p className="mt-1 text-sm text-red-600">{errors.date_of_birth}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({
                    ...formData,
                    gender: value === '' ? '' : value // Ensure it's always a string, never null
                  });
                  // Clear error when user changes selection
                  if (errors.gender) {
                    setErrors({ ...errors, gender: '' });
                  }
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="10 digits only"
              />
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Type <span className="text-red-500">*</span>
                <span className="ml-2 text-gray-500 text-xs font-normal">
                  <FiInfo className="inline mr-1" />
                  Select your role in the tournament system
                </span>
              </label>
              <select
                name="user_type"
                value={formData.user_type}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Player">Player</option>
                <option value="Coach">Coach</option>
                <option value="Judge">Judge</option>
                <option value="Organizer">Organizer</option>
              </select>
            </div>

            {/* Player-specific fields */}
            {formData.user_type === 'Player' && (
              <>
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Dojo & Coach Information</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Your Coach & Dojo <span className="text-red-500">*</span>
                    </label>
                    {loadingCoaches ? (
                      <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-sm text-gray-600">Loading coaches...</span>
                      </div>
                    ) : coaches.length === 0 ? (
                      <div className="w-full px-4 py-3 border border-yellow-300 rounded-lg bg-yellow-50">
                        <p className="text-sm text-yellow-800">
                          No coaches registered yet. Please ask your coach to register first, or contact support.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Coach Selection */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Coach <span className="text-red-500">*</span>
                          </label>
                          <select
                            name="selected_coach_id"
                            value={formData.selected_coach_id || ''}
                            onChange={(e) => {
                              const selectedCoachId = e.target.value;
                              const selectedCoach = coaches.find(c => c._id === selectedCoachId);
                              if (selectedCoach) {
                                const coachName = selectedCoach.user_id?.first_name && selectedCoach.user_id?.last_name
                                  ? `${selectedCoach.user_id.first_name} ${selectedCoach.user_id.last_name}`
                                  : selectedCoach.user_id?.username || 'Coach';
                                
                                // Get all dojos for this coach
                                const coachDojos = selectedCoach.dojos || (selectedCoach.dojo ? [selectedCoach.dojo] : []);
                                setSelectedCoachDojos(coachDojos);
                                
                                // Warn if coach doesn't have any dojos
                                if (coachDojos.length === 0) {
                                  toast.warning('This coach does not have any dojos set up. Please contact your coach to set up their dojo first.');
                                }
                                
                                setFormData({
                                  ...formData,
                                  selected_coach_id: selectedCoachId,
                                  coach_name: coachName.trim(),
                                  player_dojo_name: '', // Reset dojo selection
                                  coach_id: selectedCoachId
                                });
                              } else {
                                setSelectedCoachDojos([]);
                                setFormData({
                                  ...formData,
                                  selected_coach_id: '',
                                  coach_name: '',
                                  player_dojo_name: '',
                                  coach_id: ''
                                });
                              }
                            }}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select your coach</option>
                            {coaches.map((coach) => {
                              const coachName = coach.user_id?.first_name && coach.user_id?.last_name
                                ? `${coach.user_id.first_name} ${coach.user_id.last_name}`
                                : coach.user_id?.username || 'Coach';
                              const dojoCount = (coach.dojos || []).length || (coach.dojo ? 1 : 0);
                              return (
                                <option key={coach._id} value={coach._id}>
                                  {coachName} {dojoCount > 0 ? `(${dojoCount} dojo${dojoCount !== 1 ? 's' : ''})` : '(No dojos)'}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Dojo Selection - Show after coach is selected */}
                        {formData.selected_coach_id && selectedCoachDojos.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Select Dojo <span className="text-red-500">*</span>
                            </label>
                            <select
                              name="player_dojo_name"
                              value={formData.player_dojo_name || ''}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  player_dojo_name: e.target.value
                                });
                              }}
                              required
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select your dojo</option>
                              {selectedCoachDojos.map((dojo) => (
                                <option key={dojo._id} value={dojo.dojo_name}>
                                  {dojo.dojo_name}
                                  {dojo.address?.city ? ` - ${dojo.address.city}` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      First select your coach, then choose the dojo you belong to.
                    </p>
                    
                    {/* Display selected coach and dojo info */}
                    {formData.selected_coach_id && formData.coach_name && formData.player_dojo_name && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm font-semibold text-blue-900">Selected:</p>
                        <p className="text-sm text-blue-800">Coach: {formData.coach_name}</p>
                        <p className="text-sm text-blue-800">Dojo: {formData.player_dojo_name}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Coach-specific fields */}
            {formData.user_type === 'Coach' && (
              <>
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Dojo Details (Required)</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dojo Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="dojo_name"
                      value={formData.dojo_name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your dojo name"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="dojo_street"
                      value={formData.dojo_street}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Street address"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="dojo_city"
                        value={formData.dojo_city}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State/Province <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="dojo_state"
                        value={formData.dojo_state}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="State/Province"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ZIP/Postal Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="dojo_zip_code"
                        value={formData.dojo_zip_code}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="ZIP/Postal Code"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="dojo_country"
                        value={formData.dojo_country}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Country"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dojo Phone
                    </label>
                    <input
                      type="tel"
                      name="dojo_phone"
                      value={formData.dojo_phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Dojo contact number"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dojo Description
                    </label>
                    <textarea
                      name="dojo_description"
                      value={formData.dojo_description}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Brief description of your dojo"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Established Date
                    </label>
                    <input
                      type="date"
                      name="dojo_established_date"
                      value={formData.dojo_established_date}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Coach Profile</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Certification Level <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="certification_level"
                        value={formData.certification_level}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Level</option>
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Expert">Expert</option>
                        <option value="Master">Master</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Years of Experience <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="experience_years"
                        value={formData.experience_years}
                        onChange={handleChange}
                        required
                        min="0"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Years"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Organization Details (Optional)</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        name="organization_name"
                        value={formData.organization_name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Organization name (optional)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Organization License Number
                      </label>
                      <input
                        type="text"
                        name="organization_license"
                        value={formData.organization_license}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="License number (optional)"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-900 mb-2">Review Your Information</h3>
              <p className="text-sm text-blue-700">Please review all your information before submitting.</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium text-gray-700">Username:</span>
                <span className="text-gray-900">{formData.username}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium text-gray-700">Email:</span>
                <span className="text-gray-900">{formData.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium text-gray-700">Name:</span>
                <span className="text-gray-900">{formData.first_name} {formData.last_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium text-gray-700">User Type:</span>
                <span className="text-gray-900">{formData.user_type}</span>
              </div>
              {formData.phone && (
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium text-gray-700">Phone:</span>
                  <span className="text-gray-900">{formData.phone}</span>
                </div>
              )}
              {formData.date_of_birth && (
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium text-gray-700">Date of Birth:</span>
                  <span className="text-gray-900">{new Date(formData.date_of_birth).toLocaleDateString()}</span>
                </div>
              )}
              {formData.gender && (
                <div className="flex justify-between py-2">
                  <span className="font-medium text-gray-700">Gender:</span>
                  <span className="text-gray-900">{formData.gender}</span>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-3xl"
      >
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                      currentStep > step.number
                        ? 'bg-green-500 text-white'
                        : currentStep === step.number
                        ? 'bg-blue-600 text-white scale-110'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {currentStep > step.number ? (
                      <FiCheck className="w-5 h-5" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <span className={`mt-2 text-xs font-medium ${
                    currentStep >= step.number ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 transition-all duration-300 ${
                    currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={currentStep === totalSteps ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  {steps[currentStep - 1].title}
                </h2>
                <p className="text-gray-600">
                  Step {currentStep} of {totalSteps}
                </p>
              </div>

              {renderStepContent()}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
            >
              <FiChevronLeft className="mr-2" />
              Previous
            </button>

            {currentStep < totalSteps ? (
              <button
                type="submit"
                className="flex items-center px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition duration-200"
              >
                Next
                <FiChevronRight className="ml-2" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex items-center px-6 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
              >
                {loading ? 'Registering...' : 'Submit Registration'}
              </button>
            )}
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Login here
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterEnhanced;

