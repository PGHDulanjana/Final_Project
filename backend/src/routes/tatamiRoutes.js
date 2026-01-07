const express = require('express');
const router = express.Router();
const {
  getTatamis,
  getTatami,
  createTatami,
  updateTatami,
  assignJudges,
  confirmJudgeAssignment,
  grantTableWorkerAccess,
  submitResults,
  approveResults,
  getAssignedEventsForJudge
} = require('../controllers/tatamiController');
const authenticate = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(authenticate);

// Get events assigned to judge
router.get('/judge/assigned-events', getAssignedEventsForJudge);

// Get all tatamis
router.get('/', getTatamis);

// Get single tatami
router.get('/:id', getTatami);

// Create tatami (Organizer only)
router.post('/', createTatami);

// Update tatami (Organizer only)
router.put('/:id', updateTatami);

// Assign judges to tatami (Organizer only)
router.post('/:id/assign-judges', assignJudges);

// Confirm judge assignment (Judge only)
router.post('/:id/confirm-judge/:judgeId', confirmJudgeAssignment);

// Grant table worker access (Organizer only)
router.post('/:id/grant-table-worker-access', grantTableWorkerAccess);

// Submit results (Table Worker or Organizer)
router.post('/:id/submit-results', submitResults);

// Approve results (Organizer only)
router.post('/:id/approve-results', approveResults);

module.exports = router;

