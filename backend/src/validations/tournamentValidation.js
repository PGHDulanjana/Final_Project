const { body } = require('express-validator');

const createTournamentValidation = [
  body('tournament_name')
    .trim()
    .notEmpty()
    .withMessage('Tournament name is required')
    .isLength({ max: 200 })
    .withMessage('Tournament name must be less than 200 characters'),
  body('start_date')
    .isISO8601()
    .withMessage('Please provide a valid start date'),
  body('end_date')
    .isISO8601()
    .withMessage('Please provide a valid end date')
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.start_date)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('venue')
    .trim()
    .notEmpty()
    .withMessage('Venue is required'),
  body('venue_address')
    .trim()
    .notEmpty()
    .withMessage('Venue address is required'),
  body('registration_deadline')
    .isISO8601()
    .withMessage('Please provide a valid registration deadline')
    .custom((value, { req }) => {
      if (new Date(value) > new Date(req.body.start_date)) {
        throw new Error('Registration deadline must be before start date');
      }
      return true;
    }),
  body('status')
    .optional()
    .isIn(['Draft', 'Open', 'Closed', 'Ongoing', 'Completed', 'Cancelled'])
    .withMessage('Invalid tournament status')
];

const updateTournamentValidation = [
  body('tournament_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Tournament name cannot be empty'),
  body('status')
    .optional()
    .isIn(['Draft', 'Open', 'Closed', 'Ongoing', 'Completed', 'Cancelled'])
    .withMessage('Invalid tournament status')
];

const createCategoryValidation = [
  body('category_name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required'),
  body('category_type')
    .isIn(['Kata', 'Kumite', 'Team Kata', 'Team Kumite'])
    .withMessage('Invalid category type'),
  body('participation_type')
    .isIn(['Individual', 'Team'])
    .withMessage('Invalid participation type'),
  body('age_category')
    .trim()
    .notEmpty()
    .withMessage('Age category is required'),
  body('individual_player_fee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Individual player fee must be a positive number'),
  body('team_event_fee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Team event fee must be a positive number'),
  body('use_wkf_standard')
    .optional()
    .isBoolean()
    .withMessage('use_wkf_standard must be a boolean'),
  body('age_min')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Age min must be a non-negative integer'),
  body('age_max')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Age max must be a non-negative integer'),
  body('weight_min')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weight min must be a non-negative number'),
  body('weight_max')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weight max must be a non-negative number'),
  body('gender')
    .optional()
    .isIn(['Male', 'Female', 'Mixed', null, ''])
    .withMessage('Invalid gender'),
  body('team_size')
    .optional()
    .isInt({ min: 2 })
    .withMessage('Team size must be at least 2'),
  body('use_custom_belt_levels')
    .optional()
    .isBoolean()
    .withMessage('use_custom_belt_levels must be a boolean'),
  body('custom_belt_levels')
    .optional()
    .isArray()
    .withMessage('custom_belt_levels must be an array'),
  body('belt_level_groups')
    .optional()
    .custom((value) => {
      if (typeof value !== 'object' || value === null) {
        throw new Error('belt_level_groups must be an object');
      }
      return true;
    }),
  body('belt_level_group')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Belt level group must be less than 100 characters'),
  body('belt_level')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Belt level must be less than 100 characters'),
  body('is_open_event')
    .optional()
    .isBoolean()
    .withMessage('is_open_event must be a boolean')
];

module.exports = {
  createTournamentValidation,
  updateTournamentValidation,
  createCategoryValidation
};

