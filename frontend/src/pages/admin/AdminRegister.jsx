import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FiEye, FiEyeOff, FiShield } from 'react-icons/fi';

const AdminRegister = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password_hash: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    phone: '',
    admin_registration_key: '', // Special key for admin registration
  });
  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password_hash: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    phone: '',
    admin_registration_key: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

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
    if (password.length < 8) {
      return 'Password must be at least 8 characters for admin accounts';
    }
    // Check for at least one uppercase, one lowercase, one number
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    return '';
  };

  const validateConfirmPassword = (confirmPassword) => {
    if (!confirmPassword) {
      return 'Please confirm your password';
    }
    if (confirmPassword !== formData.password_hash) {
      return 'Passwords do not match';
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
    if (phone && !/^[0-9]{10,15}$/.test(phone)) {
      return 'Phone number must be 10-15 digits';
    }
    return '';
  };

  const validateAdminKey = (key) => {
    if (!key) {
      return 'Admin registration key is required';
    }
    if (key.length < 8) {
      return 'Admin registration key must be at least 8 characters';
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
        // Re-validate confirm password if password changes
        if (formData.confirm_password) {
          setErrors({
            ...errors,
            password_hash: error,
            confirm_password: validateConfirmPassword(formData.confirm_password),
          });
          return;
        }
        break;
      case 'confirm_password':
        error = validateConfirmPassword(value);
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
      case 'admin_registration_key':
        error = validateAdminKey(value);
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
      confirm_password: validateConfirmPassword(formData.confirm_password),
      first_name: validateName(formData.first_name, 'First name'),
      last_name: validateName(formData.last_name, 'Last name'),
      phone: validatePhone(formData.phone),
      admin_registration_key: validateAdminKey(formData.admin_registration_key),
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
      // Clean form data
      const cleanedFormData = {
        username: formData.username?.trim() || '',
        email: formData.email?.trim() || '',
        password_hash: formData.password_hash || '',
        first_name: formData.first_name?.trim() || '',
        last_name: formData.last_name?.trim() || '',
        user_type: 'Admin',
        admin_registration_key: formData.admin_registration_key?.trim() || '',
      };
      
      // Add optional phone if provided
      if (formData.phone && formData.phone.trim() !== '') {
        cleanedFormData.phone = formData.phone.trim();
      }

      // Call admin registration API
      const response = await fetch('http://localhost:5000/api/auth/register-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedFormData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Admin account created successfully! You can now login.');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        toast.error(result.message || 'Failed to create admin account');
        setLoading(false);
      }
    } catch (error) {
      console.error('Admin registration error:', error);
      toast.error('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 py-12">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <FiShield className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Admin Registration</h1>
          <p className="text-gray-600 mt-2">Create a new administrator account</p>
        </div>

        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Admin registration requires a valid admin registration key. 
            Please contact the system administrator to obtain this key.
          </p>
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
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 ${
                  errors.first_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter first name"
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
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 ${
                  errors.last_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter last name"
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
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 ${
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
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 ${
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
                minLength={8}
                className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-red-500 ${
                  errors.password_hash ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Minimum 8 characters with uppercase, lowercase, and number"
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
            <p className="mt-1 text-xs text-gray-500">
              Must be at least 8 characters with uppercase, lowercase, and number
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                onBlur={() => setErrors({ ...errors, confirm_password: validateConfirmPassword(formData.confirm_password) })}
                required
                className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-red-500 ${
                  errors.confirm_password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Re-enter your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? (
                  <FiEyeOff className="h-5 w-5" />
                ) : (
                  <FiEye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.confirm_password && (
              <p className="mt-1 text-sm text-red-600">{errors.confirm_password}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              onBlur={() => setErrors({ ...errors, phone: validatePhone(formData.phone) })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="10-15 digits (optional)"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Registration Key <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="admin_registration_key"
              value={formData.admin_registration_key}
              onChange={handleChange}
              onBlur={() => setErrors({ ...errors, admin_registration_key: validateAdminKey(formData.admin_registration_key) })}
              required
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 ${
                errors.admin_registration_key ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter admin registration key"
            />
            {errors.admin_registration_key && (
              <p className="mt-1 text-sm text-red-600">{errors.admin_registration_key}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Contact the system administrator to obtain this key
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            {loading ? 'Creating Admin Account...' : 'Create Admin Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-red-600 hover:text-red-700 font-medium">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminRegister;

