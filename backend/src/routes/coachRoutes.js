const express = require('express');
const router = express.Router();
const {
  getCoaches,
  getCoach,
  createCoach,
  updateCoach,
  deleteCoach
} = require('../controllers/coachController');
const authenticate = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.get('/', getCoaches);
router.get('/:id', getCoach);
router.post('/', authenticate, createCoach);
router.put('/:id', authenticate, updateCoach);
router.delete('/:id', authenticate, roleMiddleware('Admin'), deleteCoach);

module.exports = router;

