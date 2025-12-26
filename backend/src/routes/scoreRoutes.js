const express = require('express');
const router = express.Router();
const {
  getScores,
  getScore,
  createScore,
  updateScore,
  deleteScore
} = require('../controllers/scoreController');
const authenticate = require('../middlewares/authMiddleware');

router.get('/', getScores);
router.get('/:id', getScore);
router.post('/', authenticate, createScore);
router.put('/:id', authenticate, updateScore);
router.delete('/:id', authenticate, deleteScore);

module.exports = router;

