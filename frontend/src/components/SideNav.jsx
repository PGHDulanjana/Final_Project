import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiHome,
  FiUsers,
  FiAward,
  FiCalendar,
  FiBarChart2,
  FiSettings,
  FiChevronDown,
  FiChevronRight,
  FiZap,
  FiCheckCircle,
  FiDollarSign,
  FiBell,
  FiUser,
  FiFileText,
  FiTrendingUp,
  FiTarget,
  FiActivity
} from 'react-icons/fi';

const SideNav = ({ role }) => {
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleMenu = (menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const menuItems = {
    Admin: [
      { icon: FiHome, label: 'Dashboard', path: '/admin/dashboard', exact: true },
      {
        icon: FiUsers,
        label: 'User Management',
        path: '/admin/users',
        children: [
          { label: 'All Users', path: '/admin/users' },
          { label: 'Players', path: '/admin/users?type=Player' },
          { label: 'Judges', path: '/admin/users?type=Judge' },
          { label: 'Coaches', path: '/admin/users?type=Coach' },
          { label: 'Organizers', path: '/admin/users?type=Organizer' }
        ]
      },
      { icon: FiAward, label: 'Tournaments', path: '/admin/tournaments' },
      { icon: FiBell, label: 'Notifications', path: '/admin/notifications' },
      { icon: FiBarChart2, label: 'Analytics', path: '/admin/analytics' },
      { icon: FiDollarSign, label: 'Payments', path: '/admin/payments' },
      { icon: FiSettings, label: 'Settings', path: '/admin/settings' }
    ],
    Player: [
      { icon: FiUser, label: 'My Profile', path: '/player/profile' },
      { icon: FiAward, label: 'Tournaments', path: '/player/tournaments' },
      { icon: FiTarget, label: 'Match Draws', path: '/player/matches' },
      { icon: FiCheckCircle, label: 'My Results', path: '/player/results' },
      {
        icon: FiTrendingUp,
        label: 'Performance',
        path: '/player/performance'
      },
      { icon: FiBell, label: 'Notifications', path: '/player/notifications' }
    ],
    Judge: [
      { icon: FiHome, label: 'Dashboard', path: '/judge/dashboard', exact: true },
      { icon: FiZap, label: 'Active Matches', path: '/judge/matches' },
      { icon: FiCheckCircle, label: 'Scored Matches', path: '/judge/scored' },
      { icon: FiCalendar, label: 'Schedule', path: '/judge/schedule' }
    ],
    Coach: [
      { icon: FiHome, label: 'Dashboard', path: '/coach/dashboard', exact: true },
      { icon: FiTarget, label: 'Kumite Match Draws', path: '/coach/kumite-match-draws' },
      { icon: FiTarget, label: 'Kata Player Lists', path: '/coach/kata-player-lists' },
      { icon: FiCalendar, label: 'Schedule', path: '/coach/schedule' },
      { icon: FiBell, label: 'Notifications', path: '/coach/notifications' }
    ],
    Organizer: [
      { icon: FiHome, label: 'Dashboard', path: '/organizer/dashboard', exact: true },
      { icon: FiAward, label: 'Tournaments', path: '/organizer/tournaments' },
      { icon: FiUsers, label: 'Participants', path: '/organizer/participants' },
      { icon: FiTarget, label: 'Match Draws', path: '/organizer/draws' },
      { icon: FiCalendar, label: 'Schedule', path: '/organizer/schedule' },
      { icon: FiDollarSign, label: 'Payments', path: '/organizer/payments' }
    ]
  };

  const items = menuItems[role] || [];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const NavItem = ({ item, level = 0 }) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus[item.path];
    const active = isActive(item.path, item.exact);

    return (
      <li>
        {hasChildren ? (
          <>
            <button
              onClick={() => toggleMenu(item.path)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
                active
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              style={{ paddingLeft: `${1 + level * 1}rem` }}
            >
              <div className="flex items-center space-x-3">
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </div>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {isExpanded ? (
                  <FiChevronDown className="w-4 h-4" />
                ) : (
                  <FiChevronRight className="w-4 h-4" />
                )}
              </motion.div>
            </button>
            <AnimatePresence>
              {isExpanded && (
                <motion.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {item.children.map((child) => (
                    <li key={child.path}>
                      <Link
                        to={child.path}
                        className={`block px-4 py-2 rounded-lg transition-all duration-200 ${
                          isActive(child.path)
                            ? 'bg-blue-100 text-blue-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                        style={{ paddingLeft: `${2 + level * 1}rem` }}
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </>
        ) : (
          <Link
            to={item.path}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              active
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            style={{ paddingLeft: `${1 + level * 1}rem` }}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        )}
      </li>
    );
  };

  return (
    <aside className="w-64 bg-white shadow-lg min-h-screen fixed left-0 top-0 pt-16 z-30">
      <nav className="p-4">
        <ul className="space-y-2">
          {items.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default SideNav;

