const { body } = require('express-validator');

const registerForTournamentValidation = [
  body('tournament_id')
    .notEmpty()
    .withMessage('Tournament ID is required')
    .isMongoId()
    .withMessage('Invalid tournament ID'),
  body('registration_type')
    .isIn(['Individual', 'Team', 'Coach', 'Judge'])
    .withMessage('Invalid registration type'),
  body('category_id')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  body('player_id')
    .optional()
    .isMongoId()
    .withMessage('Invalid player ID'),
  body('team_id')
    .optional()
    .isMongoId()
    .withMessage('Invalid team ID'),
  body('coach_id')
    .optional()
    .isMongoId()
    .withMessage('Invalid coach ID'),
  body('judge_id')
    .optional()
    .isMongoId()
    .withMessage('Invalid judge ID')
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

