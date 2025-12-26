const Payment = require('../models/Payment');
const Registration = require('../models/Registration');
const Tournament = require('../models/Tournament');
const { sendPaymentConfirmation } = require('../utils/emailService');
const { generatePayHereHash, verifyPayHereCallback } = require('../services/paymentService');

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private
const getPayments = async (req, res, next) => {
  try {
    const { tournament_id, registration_id, payment_status } = req.query;
    const query = {};

    if (tournament_id) query.tournament_id = tournament_id;
    if (registration_id) query.registration_id = registration_id;
    if (payment_status) query.payment_status = payment_status;

    const payments = await Payment.find(query)
      .populate('registration_id')
      .populate('tournament_id', 'tournament_name')
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single payment
// @route   GET /api/payments/:id
// @access  Private
const getPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('registration_id')
      .populate('tournament_id');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create payment (PayHere integration)
// @route   POST /api/payments
// @access  Private
const createPayment = async (req, res, next) => {
  try {
    const { registration_id, tournament_id, category_id, player_id, coach_id, amount, transaction_method } = req.body;

    let registration = null;
    let tournament = null;
    let category = null;
    let eventFee = 0;

    // If registration_id is provided, use existing registration flow
    if (registration_id) {
      registration = await Registration.findById(registration_id)
        .populate('tournament_id')
        .populate('player_id');

      if (!registration) {
        return res.status(404).json({
          success: false,
          message: 'Registration not found'
        });
      }

      tournament = registration.tournament_id;
      
      // Get category to get entry fee
      const TournamentCategory = require('../models/TournamentCategory');
      category = await TournamentCategory.findById(registration.category_id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found for this registration'
        });
      }

      // Determine fee based on participation type
      if (registration.registration_type === 'Individual') {
        eventFee = category.individual_player_fee || 0;
      } else if (registration.registration_type === 'Team') {
        eventFee = category.team_event_fee || 0;
      }
    } else {
      // New flow: Payment first, then registration
      if (!tournament_id || !category_id || !player_id) {
        return res.status(400).json({
          success: false,
          message: 'tournament_id, category_id, and player_id are required when registration_id is not provided'
        });
      }

      tournament = await Tournament.findById(tournament_id);
      if (!tournament) {
        return res.status(404).json({
          success: false,
          message: 'Tournament not found'
        });
      }

      const TournamentCategory = require('../models/TournamentCategory');
      category = await TournamentCategory.findById(category_id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Event (category) not found'
        });
      }

      // Verify category belongs to tournament
      const catTournamentId = category.tournament_id?._id || category.tournament_id;
      if (catTournamentId.toString() !== tournament_id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Event does not belong to the selected tournament'
        });
      }

      // Verify authorization: If coach is making payment, verify they can pay for this player
      if (req.user.user_type === 'Coach') {
        const Player = require('../models/Player');
        const Coach = require('../models/Coach');
        const User = require('../models/User');
        
        const player = await Player.findById(player_id).populate('coach_id');
        if (!player) {
          return res.status(404).json({
            success: false,
            message: 'Player not found'
          });
        }

        const coachProfile = await Coach.findOne({ user_id: req.user._id });
        if (!coachProfile) {
          return res.status(403).json({
            success: false,
            message: 'Coach profile not found'
          });
        }

        // Verify coach has permission to pay for this player
        const playerCoachId = player.coach_id?._id || player.coach_id;
        let isAuthorized = playerCoachId && playerCoachId.toString() === coachProfile._id.toString();
        
        // Also check by coach_name if coach_id doesn't match
        if (!isAuthorized && player.coach_name) {
          const coachUser = await User.findById(req.user._id);
          if (coachUser) {
            const coachFullName = `${coachUser.first_name || ''} ${coachUser.last_name || ''}`.trim().toLowerCase();
            const playerCoachName = (player.coach_name || '').toLowerCase();
            isAuthorized = playerCoachName.includes(coachFullName) || 
                          coachFullName.includes(playerCoachName) ||
                          playerCoachName.includes(coachUser.first_name?.toLowerCase() || '') ||
                          playerCoachName.includes(coachUser.last_name?.toLowerCase() || '');
          }
        }

        if (!isAuthorized) {
          return res.status(403).json({
            success: false,
            message: 'You are not authorized to make payments for this player. Player must be under your coaching.'
          });
        }
      } else if (req.user.user_type === 'Player') {
        // If player is making payment, verify it's for their own player profile
        const Player = require('../models/Player');
        const player = await Player.findById(player_id);
        if (!player) {
          return res.status(404).json({
            success: false,
            message: 'Player not found'
          });
        }
        
        if (player.user_id.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'You can only make payments for your own registrations'
          });
        }
      }

      // Get fee based on participation type
      if (category.participation_type === 'Individual') {
        eventFee = category.individual_player_fee || 0;
      } else {
        eventFee = category.team_event_fee || 0;
      }
    }

    // Generate unique transaction ID
    const transaction_id = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const payment = await Payment.create({
      registration_id: registration?._id || null,
      tournament_id: tournament._id,
      category_id: category._id,
      player_id: player_id || registration?.player_id?._id || null,
      coach_id: coach_id || null,
      amount: amount || eventFee,
      transaction_method: transaction_method || 'PayHere',
      transaction_id,
      payment_gateway: 'PayHere'
    });

    // PayHere payment hash generation (using shared service helper)
    const merchant_id = process.env.PAYHERE_MERCHANT_ID;
    const order_id = payment._id.toString();
    const payhere_amount = payment.amount.toFixed(2);
    const currency = 'LKR';
    const hash = generatePayHereHash(order_id, payment.amount);

    res.status(201).json({
      success: true,
      message: 'Payment initiated',
      data: {
        payment,
        payhere: {
          merchant_id,
          order_id,
          amount: payhere_amount,
          currency,
          hash
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    PayHere callback handler
// @route   POST /api/payments/payhere-callback
// @access  Public
const payhereCallback = async (req, res, next) => {
  try {
    const {
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig
    } = req.body;

    // Verify MD5 signature using shared helper
    const isValid = verifyPayHereCallback({
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    // Update payment status
    const payment = await Payment.findById(order_id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (status_code === '2') {
      payment.payment_status = 'Completed';
      payment.payment_date = new Date();
      await payment.save();

      let registration = null;

      // If payment has registration_id, update existing registration
      if (payment.registration_id) {
        registration = await Registration.findById(payment.registration_id);
        if (registration) {
          registration.payment_status = 'Paid';
          await registration.save();
        }
      } else {
        // New flow: Create registration after successful payment
        if (payment.category_id && payment.player_id) {
          const TournamentCategory = require('../models/TournamentCategory');
          const category = await TournamentCategory.findById(payment.category_id);
          
          if (category) {
            registration = await Registration.create({
              tournament_id: payment.tournament_id,
              category_id: payment.category_id,
              player_id: payment.player_id,
              coach_id: payment.coach_id || null,
              registration_type: category.participation_type,
              payment_status: 'Paid',
              approval_status: 'Pending'
            });

            // Update payment with registration_id
            payment.registration_id = registration._id;
            await payment.save();
          }
        }
      }

      // Send confirmation email
      const tournament = await Tournament.findById(payment.tournament_id);
      const Player = require('../models/Player');
      const player = await Player.findById(payment.player_id).populate('user_id');

      if (player && player.user_id && player.user_id.email) {
        await sendPaymentConfirmation(
          player.user_id.email,
          payment.amount,
          tournament.tournament_name
        );
      }
    } else {
      payment.payment_status = 'Failed';
      await payment.save();
    }

    res.status(200).json({
      success: true,
      message: 'Payment status updated'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment
// @route   PUT /api/payments/:id
// @access  Private/Admin
const updatePayment = async (req, res, next) => {
  try {
    let payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    payment = await Payment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Payment updated successfully',
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPayments,
  getPayment,
  createPayment,
  payhereCallback,
  updatePayment
};

