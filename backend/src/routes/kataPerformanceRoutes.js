const express = require('express');
const router = express.Router();
const {
  getKataPerformances,
  getKataPerformance,
  createRoundPerformances,
  submitKataScore,
  calculateFinalScore,
  getKataScoreboard,
  assignRankings,
  deleteKataPerformance,
  deleteRoundPerformances
} = require('../controllers/kataPerformanceController');
const authenticate = require('../middlewares/authMiddleware');

// Public routes
router.get('/scoreboard/:category_id', getKataScoreboard);

// All other routes require authentication
router.use(authenticate);

// Get all Kata performances
router.get('/', getKataPerformances);

// Get single Kata performance
router.get('/:id', getKataPerformance);

// Create round performances (Organizer only)
router.post('/create-round', createRoundPerformances);

// Submit Kata score (Judge only)
router.post('/:id/score', submitKataScore);

// Calculate final score
router.post('/:id/calculate-final', calculateFinalScore);

// Assign rankings for Final 4 round (Organizer only)
router.post('/assign-rankings', assignRankings);

// Delete all performances for a round (Organizer only) - Must be before /:id route
router.delete('/round/:category_id', deleteRoundPerformances);

// Delete Kata performance (Organizer only)
router.delete('/:id', deleteKataPerformance);

module.exports = router;

