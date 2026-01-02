import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { coachService } from '../services/coachService';
import { toast } from 'react-toastify';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const Register = () => {
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
  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password_hash: '',
    first_name: '',
    last_name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
  });
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

  const validateUsername = (username) => {
    if (!username) {
      return 'Username is required';
    }
    if (username.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (username.length > 30) {
      return 'Username must be less than 30 characters';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return 'Username can only contain letters, numbers, and underscores';
    }
    return '';
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return 'Email is required';
    }
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const validatePassword = (password) => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return '';
  };

  const validateName = (name, fieldName) => {
    if (!name) {
      return `${fieldName} is required`;
    }
    if (name.length < 2) {
      return `${fieldName} must be at least 2 characters`;
    }
    if (!/^[a-zA-Z\s]+$/.test(name)) {
      return `${fieldName} can only contain letters and spaces`;
    }
    return '';
  };

  const validatePhone = (phone) => {
    if (phone && !/^[0-9]{10}$/.test(phone)) {
      return 'Phone number must be exactly 10 digits';
    }
    return '';
  };

  const validateDateOfBirth = (date) => {
    if (date) {
      const birthDate = new Date(date);
      const today = new Date();
      
      // Check if date is invalid
      if (isNaN(birthDate.getTime())) {
        return 'Invalid date of birth';
      }
      
      // Check if birth date is in the future
      if (birthDate > today) {
        return 'Date of birth cannot be in the future';
      }
      
      // Calculate age correctly
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      // Adjust age if birthday hasn't occurred this year yet
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      // Validate age range
      if (age < 5) {
        return 'You must be at least 5 years old';
      }
      if (age > 100) {
        return 'Please enter a valid date of birth';
      }
    }
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Real-time validation
    let error = '';
    switch (name) {
      case 'username':
        error = validateUsername(value);
        break;
      case 'email':
        error = validateEmail(value);
        break;
      case 'password_hash':
        error = validatePassword(value);
        break;
      case 'first_name':
        error = validateName(value, 'First name');
        break;
      case 'last_name':
        error = validateName(value, 'Last name');
        break;
      case 'phone':
        error = validatePhone(value);
        break;
      case 'date_of_birth':
        error = validateDateOfBirth(value);
        break;
      case 'gender':
        // Gender is optional, no validation needed
        break;
      default:
        break;
    }

    setErrors({
      ...errors,
      [name]: error,
    });
  };

  const validateForm = () => {
    const newErrors = {
      username: validateUsername(formData.username),
      email: validateEmail(formData.email),
      password_hash: validatePassword(formData.password_hash),
      first_name: validateName(formData.first_name, 'First name'),
      last_name: validateName(formData.last_name, 'Last name'),
      phone: validatePhone(formData.phone),
      date_of_birth: validateDateOfBirth(formData.date_of_birth),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Validate form
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      // Clean form data - create a new object with only valid values
      const cleanedFormData = {
        username: formData.username?.trim() || '',
        email: formData.email?.trim() || '',
        password_hash: formData.password_hash || '',
        first_name: formData.first_name?.trim() || '',
        last_name: formData.last_name?.trim() || '',
        user_type: formData.user_type || 'Player',
      };
      
      // Add user-type specific fields
      if (formData.user_type === 'Player') {
        // Player-specific fields - Coach selection is MANDATORY
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
        
        cleanedFormData.selected_coach_id = formData.selected_coach_id;
        cleanedFormData.player_dojo_name = formData.player_dojo_name.trim();
        cleanedFormData.coach_name = formData.coach_name?.trim() || '';
        cleanedFormData.coach_id = formData.coach_id || formData.selected_coach_id;
        
      } else if (formData.user_type === 'Coach') {
        // Coach-specific required fields
        cleanedFormData.dojo_name = formData.dojo_name?.trim() || '';
        cleanedFormData.dojo_street = formData.dojo_street?.trim() || '';
        cleanedFormData.dojo_city = formData.dojo_city?.trim() || '';
        cleanedFormData.dojo_state = formData.dojo_state?.trim() || '';
        cleanedFormData.dojo_zip_code = formData.dojo_zip_code?.trim() || '';
        cleanedFormData.dojo_country = formData.dojo_country?.trim() || '';
        cleanedFormData.certification_level = formData.certification_level || '';
        // Convert experience_years to number if it's a valid number string
        cleanedFormData.experience_years = formData.experience_years ? 
          (isNaN(Number(formData.experience_years)) ? formData.experience_years : Number(formData.experience_years)) : 
          '';
        
        // Coach-specific optional fields
        if (formData.dojo_phone && formData.dojo_phone.trim() !== '') {
          cleanedFormData.dojo_phone = formData.dojo_phone.trim();
        }
        if (formData.dojo_description && formData.dojo_description.trim() !== '') {
          cleanedFormData.dojo_description = formData.dojo_description.trim();
        }
        if (formData.dojo_established_date && formData.dojo_established_date.trim() !== '') {
          cleanedFormData.dojo_established_date = formData.dojo_established_date;
        }
        if (formData.organization_name && formData.organization_name.trim() !== '') {
          cleanedFormData.organization_name = formData.organization_name.trim();
        }
        if (formData.organization_license && formData.organization_license.trim() !== '') {
          cleanedFormData.organization_license = formData.organization_license.trim();
        }
        if (formData.specialization && Array.isArray(formData.specialization) && formData.specialization.length > 0) {
          cleanedFormData.specialization = formData.specialization;
        }
      }
      
      // Only add optional fields if they have valid values
      if (formData.phone && formData.phone.trim() !== '') {
        cleanedFormData.phone = formData.phone.trim();
      }
      
      if (formData.date_of_birth && formData.date_of_birth.trim() !== '') {
        cleanedFormData.date_of_birth = formData.date_of_birth;
      }
      
      // Include gender if provided and valid
      if (formData.gender && (formData.gender === 'Male' || formData.gender === 'Female')) {
        cleanedFormData.gender = formData.gender;
      }

      // Final cleanup: Remove null/undefined values and empty strings for optional fields only
      // Required fields should keep their values even if empty (for validation)
      const optionalFields = ['phone', 'date_of_birth', 'gender', 'dojo_phone', 'dojo_description', 'dojo_established_date', 'organization_name', 'organization_license', 'specialization'];
      const finalFormData = Object.keys(cleanedFormData).reduce((acc, key) => {
        const value = cleanedFormData[key];
        // For optional fields, skip null, undefined, or empty strings
        if (optionalFields.includes(key)) {
          if (value !== null && value !== undefined && value !== '') {
            acc[key] = value;
          }
        } else {
          // For required fields, include the value as-is (even if empty for validation)
          acc[key] = value;
        }
        return acc;
      }, {});

      
      const result = await register(finalFormData);
      
      if (result && result.success) {
        toast.success('Registration successful! You can now login.');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        console.error('❌ Frontend - Registration failed:', result);
        setLoading(false);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Create Account</h1>
          <p className="text-gray-600 mt-2">Join XpertKarate Tournament Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                onBlur={() => setErrors({ ...errors, first_name: validateName(formData.first_name, 'First name') })}
                required
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.first_name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.first_name && (
                <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
              )}
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
                onBlur={() => setErrors({ ...errors, last_name: validateName(formData.last_name, 'Last name') })}
                required
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.last_name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.last_name && (
                <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              onBlur={() => setErrors({ ...errors, username: validateUsername(formData.username) })}
              required
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.username ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="3-30 characters, letters, numbers, and underscores only"
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username}</p>
            )}
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
              onBlur={() => setErrors({ ...errors, email: validateEmail(formData.email) })}
              required
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="example@email.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
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
                onBlur={() => setErrors({ ...errors, password_hash: validatePassword(formData.password_hash) })}
                required
                minLength={6}
                className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.password_hash ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Minimum 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <FiEyeOff className="h-5 w-5" />
                ) : (
                  <FiEye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password_hash && (
              <p className="mt-1 text-sm text-red-600">{errors.password_hash}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Type *
            </label>
            <select
              name="user_type"
              value={formData.user_type}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-sm text-gray-600">Loading coaches...</span>
                    </div>
                  ) : coaches.length === 0 ? (
                    <div className="w-full px-4 py-2 border border-yellow-300 rounded-lg bg-yellow-50">
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
                              // Reset if no coach selected
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      
                      {/* Warning if coach selected but no dojos available */}
                      {formData.selected_coach_id && selectedCoachDojos.length === 0 && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-800">
                            <strong>Warning:</strong> The selected coach does not have any dojos set up. 
                            Please contact your coach to set up their dojo first, or select a different coach.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    <strong>Required:</strong> You must select your coach and dojo to complete registration. 
                    All players must be registered under a coach.
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="License number (optional)"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                onBlur={() => setErrors({ ...errors, phone: validatePhone(formData.phone) })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="10 digits only"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
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
                onBlur={() => setErrors({ ...errors, date_of_birth: validateDateOfBirth(formData.date_of_birth) })}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 5)).toISOString().split('T')[0]}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.date_of_birth ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.date_of_birth && (
                <p className="mt-1 text-sm text-red-600">{errors.date_of_birth}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender || ''}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.gender ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select Gender (Optional)</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              {errors.gender && (
                <p className="mt-1 text-sm text-red-600">{errors.gender}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

