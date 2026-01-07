const express = require('express');
const router = express.Router();
const {
  generateKataReport,
  getKataReport,
  getTournamentKataReports,
  getPlayerKataReports
} = require('../controllers/kataReportController');
const authenticate = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(authenticate);

// Generate Kata report (Organizer only)
router.post('/generate', generateKataReport);

// Get Kata report for a category
router.get('/category/:category_id', getKataReport);

// Get all Kata reports for a tournament
router.get('/tournament/:tournament_id', getTournamentKataReports);

// Get Kata reports for a player
router.get('/player/:player_id', getPlayerKataReports);

module.exports = router;

