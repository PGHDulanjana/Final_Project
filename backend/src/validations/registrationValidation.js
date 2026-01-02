const { body } = require('express-validator');

const registerForTournamentValidation = [
  body('tournament_id')
    .notEmpty()
    .withMessage('Tournament ID is required')
    .isMongoId()
    .withMessage('Invalid tournament ID format'),
  body('registration_type')
    .notEmpty()
    .withMessage('Registration type is required')
    .isIn(['Individual', 'Team', 'Coach', 'Judge'])
    .withMessage('Invalid registration type. Must be one of: Individual, Team, Coach, Judge'),
  body('category_id')
    .custom((value, { req }) => {
      const registrationType = req.body.registration_type;
      
      // For Individual and Team registrations, category_id is required
      if (registrationType === 'Individual' || registrationType === 'Team') {
        if (!value || value === '' || value === null || value === undefined) {
          throw new Error('Event (category) is required for Individual and Team registrations');
        }
        // Must be a valid MongoId
        const mongoose = require('mongoose');
        if (typeof value !== 'string' || !mongoose.Types.ObjectId.isValid(value)) {
          throw new Error('Invalid event (category) ID format. Please select a valid event.');
        }
      }
      // For Coach and Judge, category_id is optional but if provided must be valid
      if (value && value !== '' && value !== null && value !== undefined && 
          (registrationType === 'Coach' || registrationType === 'Judge')) {
        const mongoose = require('mongoose');
        if (typeof value !== 'string' || !mongoose.Types.ObjectId.isValid(value)) {
          throw new Error('Invalid event (category) ID format');
        }
      }
      return true;
    })
    .withMessage('Invalid event (category) ID'),
  body('player_id')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      // If provided, must be a valid MongoId
      if (value && typeof value === 'string' && value.trim() !== '') {
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new Error('Invalid player ID format');
        }
      }
      return true;
    }),
  body('team_id')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      // If provided, must be a valid MongoId
      if (value && typeof value === 'string' && value.trim() !== '') {
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new Error('Invalid team ID format');
        }
      }
      return true;
    }),
  body('coach_id')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      // If provided, must be a valid MongoId
      if (value && typeof value === 'string' && value.trim() !== '') {
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new Error('Invalid coach ID format');
        }
      }
      return true;
    }),
  body('judge_id')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      // If provided, must be a valid MongoId
      if (value && typeof value === 'string' && value.trim() !== '') {
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new Error('Invalid judge ID format');
        }
      }
      return true;
    })
];

const updateRegistrationValidation = [
  body('approval_status')
    .optional()
    .isIn(['Pending', 'Approved', 'Rejected', 'Cancelled'])
    .withMessage('Invalid approval status'),
  body('payment_status')
    .optional()
    .isIn(['Pending', 'Paid', 'Failed', 'Refunded'])
    .withMessage('Invalid payment status')
];

module.exports = {
  registerForTournamentValidation,
  updateRegistrationValidation
};

