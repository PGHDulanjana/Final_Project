const express = require('express');
const router = express.Router();
const {
  getTournaments,
  getTournament,
  createTournament,
  updateTournament,
  deleteTournament
} = require('../controllers/tournamentController');
const { createTournamentValidation, updateTournamentValidation } = require('../validations/tournamentValidation');
const validateRequest = require('../middlewares/validateRequest');
const authenticate = require('../middlewares/authMiddleware');
const optionalAuth = require('../middlewares/optionalAuth');

// Use optional auth so organizers can see their tournaments when logged in
router.get('/', optionalAuth, getTournaments);
router.get('/:id', getTournament);
router.post('/', authenticate, createTournamentValidation, validateRequest, createTournament);
router.put('/:id', authenticate, updateTournamentValidation, validateRequest, updateTournament);
router.delete('/:id', authenticate, deleteTournament);

module.exports = router;

