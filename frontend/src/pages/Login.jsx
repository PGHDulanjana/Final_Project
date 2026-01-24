import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password_hash: '',
  });
  const [errors, setErrors] = useState({
    email: '',
    password_hash: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Real-time validation
    if (name === 'email') {
      setErrors({
        ...errors,
        email: validateEmail(value),
      });
    } else if (name === 'password_hash') {
      setErrors({
        ...errors,
        password_hash: validatePassword(value),
      });
    }
  };

  const validateForm = () => {
    const newErrors = {
      email: validateEmail(formData.email),
      password_hash: validatePassword(formData.password_hash),
    };
    setErrors(newErrors);
    return !newErrors.email && !newErrors.password_hash;
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
      const result = await login(formData.email, formData.password_hash);
      
      if (result && result.success) {
        // Small delay to show success message, then redirect based on user type
        setTimeout(() => {
          // Get user data from localStorage (set by login function)
          const userData = JSON.parse(localStorage.getItem('user') || '{}');
          const userType = userData?.user_type;
          
          // Redirect based on user type
          if (userType === 'Admin') {
            navigate('/admin/dashboard');
          } else if (userType === 'Player') {
            navigate('/player/matches');
          } else if (userType === 'Coach') {
            navigate('/coach/dashboard');
          } else if (userType === 'Judge') {
            navigate('/judge/dashboard');
          } else if (userType === 'Organizer') {
            navigate('/organizer/dashboard');
          } else {
            // Fallback to general dashboard (which will redirect based on user type)
            navigate('/dashboard');
          }
        }, 500);
      } else {
        // Error already shown by login function
        setLoading(false);
      }
    } catch (error) {
      console.error('Login error in component:', error);
      toast.error('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">XpertKarate</h1>
          <p className="text-gray-600 mt-2">Tournament Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your email"
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
                className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.password_hash ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your password"
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

          <div className="flex items-center justify-between">
            <Link
              to="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

