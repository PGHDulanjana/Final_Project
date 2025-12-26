const Judge = require('../models/Judge');
const User = require('../models/User');

// @desc    Get all judges
// @route   GET /api/judges
// @access  Public
const getJudges = async (req, res, next) => {
  try {
    const judges = await Judge.find()
      .populate('user_id', 'username email first_name last_name profile_picture')
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      count: judges.length,
      data: judges
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single judge
// @route   GET /api/judges/:id
// @access  Public
const getJudge = async (req, res, next) => {
  try {
    const judge = await Judge.findById(req.params.id)
      .populate('user_id', 'username email first_name last_name phone profile_picture');

    if (!judge) {
      return res.status(404).json({
        success: false,
        message: 'Judge not found'
      });
    }

    res.status(200).json({
      success: true,
      data: judge
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create judge profile
// @route   POST /api/judges
// @access  Private
const createJudge = async (req, res, next) => {
  try {
    // Check if user is Judge type
    if (req.user.user_type !== 'Judge') {
      return res.status(403).json({
        success: false,
        message: 'Only users with Judge type can create judge profile'
      });
    }

    // Check if judge profile already exists
    const existingJudge = await Judge.findOne({ user_id: req.user._id });
    if (existingJudge) {
      return res.status(400).json({
        success: false,
        message: 'Judge profile already exists'
      });
    }

    const judge = await Judge.create({
      ...req.body,
      user_id: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Judge profile created successfully',
      data: judge
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update judge
// @route   PUT /api/judges/:id
// @access  Private
const updateJudge = async (req, res, next) => {
  try {
    let judge = await Judge.findById(req.params.id);

    if (!judge) {
      return res.status(404).json({
        success: false,
        message: 'Judge not found'
      });
    }

    // Check authorization
    if (judge.user_id.toString() !== req.user._id.toString() && req.user.user_type !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this judge'
      });
    }

    judge = await Judge.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('user_id', 'username email first_name last_name profile_picture');

    res.status(200).json({
      success: true,
      message: 'Judge updated successfully',
      data: judge
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete judge
// @route   DELETE /api/judges/:id
// @access  Private/Admin
const deleteJudge = async (req, res, next) => {
  try {
    const judge = await Judge.findById(req.params.id);

    if (!judge) {
      return res.status(404).json({
        success: false,
        message: 'Judge not found'
      });
    }

    await judge.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Judge deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getJudges,
  getJudge,
  createJudge,
  updateJudge,
  deleteJudge
};

