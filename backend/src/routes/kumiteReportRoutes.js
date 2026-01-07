const express = require('express');
const router = express.Router();
const {
  generateKumiteReport,
  getKumiteReport,
  getTournamentKumiteReports,
  getPlayerKumiteReports
} = require('../controllers/kumiteReportController');
const authenticate = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(authenticate);

// Generate Kumite report (Organizer only)
router.post('/generate', generateKumiteReport);

// Get Kumite report for a category
router.get('/category/:category_id', getKumiteReport);

// Get all Kumite reports for a tournament
router.get('/tournament/:tournament_id', getTournamentKumiteReports);

// Get Kumite reports for a player
router.get('/player/:player_id', getPlayerKumiteReports);

module.exports = router;

