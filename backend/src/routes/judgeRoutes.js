const express = require('express');
const router = express.Router();
const {
  getJudges,
  getJudge,
  createJudge,
  updateJudge,
  deleteJudge
} = require('../controllers/judgeController');
const authenticate = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.get('/', getJudges);
router.get('/:id', getJudge);
router.post('/', authenticate, createJudge);
router.put('/:id', authenticate, updateJudge);
router.delete('/:id', authenticate, roleMiddleware('Admin'), deleteJudge);

module.exports = router;

