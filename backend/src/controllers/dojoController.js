const Dojo = require('../models/Dojo');
const Coach = require('../models/Coach');

// @desc    Get all dojos
// @route   GET /api/dojos
// @access  Public
const getDojos = async (req, res, next) => {
  try {
    const dojos = await Dojo.find()
      .populate('coach_id', 'user_id certification_level')
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      count: dojos.length,
      data: dojos
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single dojo
// @route   GET /api/dojos/:id
// @access  Public
const getDojo = async (req, res, next) => {
  try {
    const dojo = await Dojo.findById(req.params.id)
      .populate('coach_id');

    if (!dojo) {
      return res.status(404).json({
        success: false,
        message: 'Dojo not found'
      });
    }

    res.status(200).json({
      success: true,
      data: dojo
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create dojo
// @route   POST /api/dojos
// @access  Private/Coach
const createDojo = async (req, res, next) => {
  try {
    // Check if user is Coach
    if (req.user.user_type !== 'Coach') {
      return res.status(403).json({
        success: false,
        message: 'Only coaches can create dojos'
      });
    }

    // Find coach profile
    const coach = await Coach.findOne({ user_id: req.user._id });
    if (!coach) {
      return res.status(404).json({
        success: false,
        message: 'Coach profile not found'
      });
    }

    const dojo = await Dojo.create({
      ...req.body,
      coach_id: coach._id
    });

    res.status(201).json({
      success: true,
      message: 'Dojo created successfully',
      data: dojo
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update dojo
// @route   PUT /api/dojos/:id
// @access  Private
const updateDojo = async (req, res, next) => {
  try {
    let dojo = await Dojo.findById(req.params.id);

    if (!dojo) {
      return res.status(404).json({
        success: false,
        message: 'Dojo not found'
      });
    }

    // Check authorization
    const coach = await Coach.findById(dojo.coach_id);
    if (coach.user_id.toString() !== req.user._id.toString() && req.user.user_type !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this dojo'
      });
    }

    dojo = await Dojo.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('coach_id');

    res.status(200).json({
      success: true,
      message: 'Dojo updated successfully',
      data: dojo
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete dojo
// @route   DELETE /api/dojos/:id
// @access  Private
const deleteDojo = async (req, res, next) => {
  try {
    const dojo = await Dojo.findById(req.params.id);

    if (!dojo) {
      return res.status(404).json({
        success: false,
        message: 'Dojo not found'
      });
    }

    // Check authorization
    const coach = await Coach.findById(dojo.coach_id);
    if (coach.user_id.toString() !== req.user._id.toString() && req.user.user_type !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this dojo'
      });
    }

    await dojo.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Dojo deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDojos,
  getDojo,
  createDojo,
  updateDojo,
  deleteDojo
};

