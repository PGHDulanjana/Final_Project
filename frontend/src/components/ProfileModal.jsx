import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/userService';
import { toast } from 'react-toastify';
import { FiX, FiSave, FiCamera, FiTrash2 } from 'react-icons/fi';
import { BASE_URL } from '../config/api';

const ProfileModal = ({ user, onClose }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    phone: '',
    date_of_birth: '',
    gender: '',
  });
  const [originalData, setOriginalData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    profile_picture: null,
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      const userData = {
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        username: user.username || '',
        phone: user.phone || '',
        date_of_birth: user.date_of_birth ? new Date(user.date_of_birth).toISOString().split('T')[0] : '',
        gender: user.gender || '',
        profile_picture: user.profile_picture || null,
      };
      
      setFormData(userData);
      setOriginalData(userData);
      
      // Set profile picture preview if exists
      if (user.profile_picture) {
        setProfilePicturePreview(`${BASE_URL}/uploads/${user.profile_picture}`);
      }
    }
  }, [user]);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Real-time validation
    let error = '';
    if (name === 'first_name') {
      error = validateName(value, 'First name');
    } else if (name === 'last_name') {
      error = validateName(value, 'Last name');
    } else if (name === 'phone') {
      error = validatePhone(value);
    }

    setErrors({
      ...errors,
      [name]: error,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      setProfilePicture(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePicture = () => {
    setProfilePicture(null);
    setProfilePicturePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Check if there are any changes
  const hasChanges = () => {
    // Check form data changes
    const formChanged = 
      formData.first_name !== originalData.first_name ||
      formData.last_name !== originalData.last_name ||
      formData.phone !== originalData.phone ||
      formData.date_of_birth !== originalData.date_of_birth ||
      formData.gender !== originalData.gender;
    
    // Check profile picture change
    const pictureChanged = profilePicture !== null;
    
    return formChanged || pictureChanged;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if there are any changes
    if (!hasChanges()) {
      toast.info('No changes to save');
      return;
    }

    // Validate form
    const newErrors = {
      first_name: validateName(formData.first_name, 'First name'),
      last_name: validateName(formData.last_name, 'Last name'),
      phone: validatePhone(formData.phone),
    };

    setErrors(newErrors);

    if (Object.values(newErrors).some(error => error !== '')) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      // Prepare data for upload
      const updateData = { ...formData };
      const hasFile = profilePicture !== null;
      
      // Remove empty strings and null values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === '' || updateData[key] === null) {
          delete updateData[key];
        }
      });
      
      // If profile picture is selected, add it to form data
      if (profilePicture) {
        updateData.profile_picture = profilePicture;
      }

      const response = await userService.updateUser(user._id, updateData, hasFile);
      if (response && response.success) {
        toast.success('Profile updated successfully!');
        setIsEditing(false);
        // Close modal and reload user data
        onClose();
        // Reload page to get updated user data
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        toast.error(response?.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            {isEditing ? 'Edit Profile' : 'My Profile'}
          </h2>
          <div className="flex items-center space-x-2">
            {isEditing && (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setErrors({});
                  setProfilePicture(null);
                  setProfilePicturePreview(user.profile_picture ? `${BASE_URL}/uploads/${user.profile_picture}` : null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                  // Reset form data to original
                  const userData = {
                    first_name: user.first_name || '',
                    last_name: user.last_name || '',
                    username: user.username || '',
                    phone: user.phone || '',
                    date_of_birth: user.date_of_birth ? new Date(user.date_of_birth).toISOString().split('T')[0] : '',
                    gender: user.gender || '',
                  };
                  setFormData(userData);
                  setOriginalData({
                    ...userData,
                    profile_picture: user.profile_picture || null,
                  });
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              {profilePicturePreview ? (
                <img
                  src={profilePicturePreview}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-blue-500"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-blue-600 flex items-center justify-center text-white text-4xl font-bold border-4 border-blue-500">
                  {user?.first_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              
              {isEditing && (
                <div className="absolute bottom-0 right-0 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 shadow-lg"
                    title="Change Picture"
                  >
                    <FiCamera className="w-4 h-4" />
                  </button>
                  {profilePicturePreview && (
                    <button
                      type="button"
                      onClick={handleRemovePicture}
                      className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 shadow-lg"
                      title="Remove Picture"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {isEditing && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <p className="mt-2 text-xs text-gray-500 text-center">
                  Click camera icon to change picture<br />
                  Max size: 5MB
                </p>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.first_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.first_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
                  )}
                </>
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-lg">{user.first_name || 'N/A'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.last_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.last_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
                  )}
                </>
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-lg">{user.last_name || 'N/A'}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <p className="px-4 py-2 bg-gray-50 rounded-lg">{user.username || 'N/A'}</p>
            <p className="mt-1 text-xs text-gray-500">Username cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <p className="px-4 py-2 bg-gray-50 rounded-lg">{user.email || 'N/A'}</p>
            <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Type
            </label>
            <p className="px-4 py-2 bg-gray-50 rounded-lg">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {user.user_type}
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              {isEditing ? (
                <>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="10 digits only"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                  )}
                </>
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-lg">{user.phone || 'N/A'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              {isEditing ? (
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 5)).toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-lg">
                  {user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString() : 'N/A'}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gender
            </label>
            {isEditing ? (
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg">{user.gender || 'N/A'}</p>
            )}
          </div>


          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <FiSave className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || !hasChanges()}
                className={`px-6 py-2 rounded-lg flex items-center space-x-2 ${
                  hasChanges()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={!hasChanges() ? 'No changes to save' : ''}
              >
                <FiSave className="w-4 h-4" />
                <span>{loading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;

