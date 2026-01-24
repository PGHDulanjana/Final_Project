import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiLogOut, FiEdit2, FiChevronDown } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import ProfileModal from './ProfileModal';
import { BASE_URL } from '../config/api';

const ProfileDropdown = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [imageError, setImageError] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const displayName = user?.username || user?.email || 'User';

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="User menu"
        >
          <div className="flex items-center space-x-2">
            {user?.profile_picture && !imageError ? (
              <img
                src={`${BASE_URL}/uploads/${user.profile_picture}`}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover border-2 border-blue-600"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                {user?.first_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <span className="text-sm font-medium text-gray-700 hidden md:block">
              {displayName}
            </span>
          </div>
          <FiChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-900">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              <p className="text-xs text-gray-500 mt-1">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                  {user?.user_type}
                </span>
              </p>
            </div>

            <button
              onClick={() => {
                setShowEditModal(true);
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
            >
              <FiUser className="w-4 h-4" />
              <span>View Profile</span>
            </button>

            <button
              onClick={() => {
                setShowEditModal(true);
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
            >
              <FiEdit2 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>

            <div className="border-t border-gray-200 my-1"></div>

            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
            >
              <FiLogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>

      {showEditModal && (
        <ProfileModal
          user={user}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
  );
};

export default ProfileDropdown;

