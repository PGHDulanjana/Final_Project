const express = require('express');
const router = express.Router();
const {
  getMatches,
  getMatch,
  createMatch,
  updateMatch,
  deleteMatch,
  generateDraws,
  calculateKumiteMatchWinner,
  generateNextRound
} = require('../controllers/matchController');
const authenticate = require('../middlewares/authMiddleware');

router.get('/', getMatches);
router.get('/:id', getMatch);
router.post('/', authenticate, createMatch);
router.post('/generate-draws', authenticate, generateDraws);
router.post('/generate-next-round', authenticate, generateNextRound);
router.post('/:id/calculate-winner', authenticate, calculateKumiteMatchWinner);
router.put('/:id', authenticate, updateMatch);
router.delete('/:id', authenticate, deleteMatch);

module.exports = router;

