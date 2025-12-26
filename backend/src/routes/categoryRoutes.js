const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');
const { createCategoryValidation } = require('../validations/tournamentValidation');
const validateRequest = require('../middlewares/validateRequest');
const authenticate = require('../middlewares/authMiddleware');

router.get('/', getCategories);
router.get('/:id', getCategory);
router.post('/', authenticate, createCategoryValidation, validateRequest, createCategory);
router.put('/:id', authenticate, updateCategory);
router.delete('/:id', authenticate, deleteCategory);

module.exports = router;

