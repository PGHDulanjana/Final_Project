const express = require('express');
const router = express.Router();
const {
  getRegistrations,
  getRegistration,
  createRegistration,
  updateRegistration,
  deleteRegistration
} = require('../controllers/registrationController');
const { registerForTournamentValidation, updateRegistrationValidation } = require('../validations/registrationValidation');
const validateRequest = require('../middlewares/validateRequest');
const authenticate = require('../middlewares/authMiddleware');

router.get('/', authenticate, getRegistrations);
router.get('/:id', authenticate, getRegistration);
router.post('/', authenticate, registerForTournamentValidation, validateRequest, createRegistration);
router.put('/:id', authenticate, updateRegistrationValidation, validateRequest, updateRegistration);
router.delete('/:id', authenticate, deleteRegistration);

module.exports = router;

