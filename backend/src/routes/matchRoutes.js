const express = require('express');
const router = express.Router();
const {
  getMatches,
  getMatch,
  createMatch,
  updateMatch,
  deleteMatch
} = require('../controllers/matchController');
const authenticate = require('../middlewares/authMiddleware');

router.get('/', getMatches);
router.get('/:id', getMatch);
router.post('/', authenticate, createMatch);
router.put('/:id', authenticate, updateMatch);
router.delete('/:id', authenticate, deleteMatch);

module.exports = router;

