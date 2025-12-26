import React from 'react';
import { motion } from 'framer-motion';

const PasswordStrengthMeter = ({ password }) => {
  const calculateStrength = (password) => {
    let strength = 0;
    let feedback = [];

    if (password.length >= 8) strength += 1;
    else feedback.push('At least 8 characters');

    if (/[a-z]/.test(password)) strength += 1;
    else feedback.push('Lowercase letter');

    if (/[A-Z]/.test(password)) strength += 1;
    else feedback.push('Uppercase letter');

    if (/[0-9]/.test(password)) strength += 1;
    else feedback.push('Number');

    if (/[^a-zA-Z0-9]/.test(password)) strength += 1;
    else feedback.push('Special character');

    return { strength, feedback };
  };

  const { strength, feedback } = calculateStrength(password);
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-blue-500',
    'bg-green-500'
  ];

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600">Password Strength:</span>
        <span className={`text-xs font-semibold ${
          strength <= 1 ? 'text-red-600' :
          strength === 2 ? 'text-orange-600' :
          strength === 3 ? 'text-yellow-600' :
          strength === 4 ? 'text-blue-600' :
          'text-green-600'
        }`}>
          {strengthLabels[strength] || 'Very Weak'}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <motion.div
          className={`h-2 rounded-full ${strengthColors[strength] || 'bg-red-500'}`}
          initial={{ width: 0 }}
          animate={{ width: `${(strength / 5) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      {feedback.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          <p className="font-medium mb-1">Add:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {feedback.slice(0, 3).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;

