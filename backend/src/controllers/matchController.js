const Match = require('../models/Match');
const MatchParticipant = require('../models/MatchParticipant');
const Score = require('../models/Score');
const { generateDrawsForCategory, generateSimpleBracket } = require('../services/drawGenerationService');
const TournamentCategory = require('../models/TournamentCategory');
const Tournament = require('../models/Tournament');

// @desc    Get all matches
// @route   GET /api/matches
// @access  Public
const getMatches = async (req, res, next) => {
  try {
    const { tournament_id, category_id, status } = req.query;
    const query = {};

    if (tournament_id) query.tournament_id = tournament_id;
    if (category_id) query.category_id = category_id;
    if (status) query.status = status;

    const matches = await Match.find(query)
      .populate('tournament_id', 'tournament_name')
      .populate('category_id', 'category_name')
      .populate('winner_id', 'user_id')
      .sort({ scheduled_time: 1 });

    // Get participants for all matches
    const matchIds = matches.map(m => m._id);
    const allParticipants = await MatchParticipant.find({ match_id: { $in: matchIds } })
      .populate({
        path: 'player_id',
        select: 'user_id belt_rank dojo_name',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username'
        }
      })
      .populate({
        path: 'team_id',
        select: 'team_name dojo_id',
        populate: {
          path: 'dojo_id',
          select: 'dojo_name'
        }
      });

    // Group participants by match_id
    const participantsByMatch = {};
    allParticipants.forEach(participant => {
      const matchId = participant.match_id.toString();
      if (!participantsByMatch[matchId]) {
        participantsByMatch[matchId] = [];
      }
      participantsByMatch[matchId].push(participant);
    });

    // Get judges for all matches
    const MatchJudge = require('../models/MatchJudge');
    const allMatchJudges = await MatchJudge.find({ match_id: { $in: matchIds } })
      .populate({
        path: 'judge_id',
        select: 'user_id certification_level',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username'
        }
      });

    // Group judges by match_id
    const judgesByMatch = {};
    allMatchJudges.forEach(matchJudge => {
      const matchId = matchJudge.match_id.toString();
      if (!judgesByMatch[matchId]) {
        judgesByMatch[matchId] = [];
      }
      judgesByMatch[matchId].push(matchJudge);
    });

    // Attach participants and judges to matches
    const matchesWithParticipants = matches.map(match => {
      const matchObj = match.toObject();
      matchObj.participants = participantsByMatch[match._id.toString()] || [];
      matchObj.judges = judgesByMatch[match._id.toString()] || [];
      return matchObj;
    });

    res.status(200).json({
      success: true,
      count: matchesWithParticipants.length,
      data: matchesWithParticipants
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single match
// @route   GET /api/matches/:id
// @access  Public
const getMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('tournament_id')
      .populate('category_id')
      .populate('winner_id');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Get participants with full population
    const participants = await MatchParticipant.find({ match_id: match._id })
      .populate({
        path: 'player_id',
        select: 'user_id belt_rank dojo_name',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username'
        }
      })
      .populate({
        path: 'team_id',
        select: 'team_name dojo_id',
        populate: {
          path: 'dojo_id',
          select: 'dojo_name'
        }
      });

    // Get judges for this match
    const MatchJudge = require('../models/MatchJudge');
    const matchJudges = await MatchJudge.find({ match_id: match._id })
      .populate({
        path: 'judge_id',
        select: 'user_id certification_level',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username'
        }
      });

    res.status(200).json({
      success: true,
      data: {
        ...match.toObject(),
        participants,
        judges: matchJudges
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create match
// @route   POST /api/matches
// @access  Private/Organizer
const createMatch = async (req, res, next) => {
  try {
    const match = await Match.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Match created successfully',
      data: match
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update match
// @route   PUT /api/matches/:id
// @access  Private
const updateMatch = async (req, res, next) => {
  try {
    let match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // If status is being updated to Completed, set completed_at
    if (req.body.status === 'Completed' && match.status !== 'Completed') {
      req.body.completed_at = new Date();
    }

    // Handle participant result update (for bye matches)
    if (req.body.participant_result) {
      const { participant_id, result } = req.body.participant_result;
      if (participant_id && result) {
        try {
          await MatchParticipant.updateOne(
            { _id: participant_id },
            { result: result }
          );
        } catch (error) {
          console.error('Error updating participant result:', error);
          // Continue with match update even if participant update fails
        }
      }
      // Remove from req.body as it's not a match field
      delete req.body.participant_result;
    }

    match = await Match.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // If match was just completed, check if we need to generate next round
    if (req.body.status === 'Completed' && match.match_level) {
      // Check and generate next round if needed (async, don't wait)
      checkAndGenerateNextRound(match.category_id, match.match_level).catch(err => 
        console.error('Error generating next round:', err)
      );
    }

    res.status(200).json({
      success: true,
      message: 'Match updated successfully',
      data: match
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete match
// @route   DELETE /api/matches/:id
// @access  Private
const deleteMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Delete participants
    await MatchParticipant.deleteMany({ match_id: match._id });

    await match.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Match deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate match draws using Gemini AI
// @route   POST /api/matches/generate-draws
// @access  Private/Organizer
const generateDraws = async (req, res, next) => {
  try {
    const { tournament_id, category_id, useGemini = true } = req.body;

    if (!tournament_id || !category_id) {
      return res.status(400).json({
        success: false,
        message: 'Tournament ID and Category ID are required'
      });
    }

    // Verify tournament and category exist
    const tournament = await Tournament.findById(tournament_id);
    const category = await TournamentCategory.findById(category_id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check authorization - only organizer of the tournament can generate draws
    if (req.user.user_type !== 'Admin') {
      const Organizer = require('../models/Organizer');
      const organizer = await Organizer.findById(tournament.organizer_id);
      if (!organizer || organizer.user_id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to generate draws for this tournament'
        });
      }
    }

    // Kata events don't use matches - they use individual performances
    if (category.category_type === 'Kata' || category.category_type === 'Team Kata') {
      return res.status(400).json({
        success: false,
        message: 'Kata events do not use match draws. Players perform individually. Use the Event Scoring tab to create Kata performances for rounds.'
      });
    }

    let result;
    const hasGeminiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '';
    
    console.log('🔵 Generate Draws Request:', {
      tournament_id,
      category_id,
      useGemini,
      hasGeminiKey: !!hasGeminiKey,
      geminiKeyLength: hasGeminiKey ? process.env.GEMINI_API_KEY.length : 0
    });

    try {
      if (useGemini && hasGeminiKey) {
        // Use Gemini AI to generate intelligent draws
        console.log('🤖 Attempting to generate draws using Gemini AI...');
        result = await generateDrawsForCategory(category_id, tournament_id);
        console.log('✅ Match draws generated successfully using Gemini AI');
      } else {
        // Fallback to simple bracket generation
        if (!hasGeminiKey) {
          console.log('⚠️ GEMINI_API_KEY not found in environment variables');
        }
        console.log('⚠️ Using simple bracket generation (Gemini not available)');
        result = await generateSimpleBracket(category_id, tournament_id);
        result.warning = 'Used fallback bracket generation. Gemini AI was not configured.';
      }
    } catch (geminiError) {
      console.error('❌ Gemini generation failed:', {
        message: geminiError.message,
        stack: geminiError.stack,
        name: geminiError.name
      });
      // Fallback to simple bracket if Gemini fails
      try {
        result = await generateSimpleBracket(category_id, tournament_id);
        result.warning = `Used fallback bracket generation. Gemini AI error: ${geminiError.message}`;
      } catch (fallbackError) {
        console.error('❌ Fallback bracket generation also failed:', fallbackError);
        throw new Error(`Both Gemini and fallback generation failed: ${geminiError.message}`);
      }
    }

    // Enhance response with judge assignment summary
    const responseMessage = result.judgesAssigned 
      ? `Match draws generated successfully! Created ${result.matchesCreated || result.data?.matchesCreated || 0} matches. ${result.judgesAssigned.totalJudges} confirmed judge(s) assigned to all matches.`
      : `Match draws generated successfully! Created ${result.matchesCreated || result.data?.matchesCreated || 0} matches.`;

    res.status(200).json({
      success: true,
      message: responseMessage,
      data: result
    });
  } catch (error) {
    console.error('❌ Error generating match draws:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Return more detailed error message
    const errorMessage = error.message || 'Failed to generate match draws';
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function to check if all matches in a round are completed and generate next round
const checkAndGenerateNextRound = async (categoryId, currentRoundLevel) => {
  try {
    // Define round progression
    const roundProgression = {
      'Preliminary': 'Quarterfinal',
      'Quarterfinal': 'Semifinal',
      'Semifinal': 'Final'
    };

    const nextRound = roundProgression[currentRoundLevel];
    if (!nextRound) {
      return; // No next round (e.g., Final or Bronze)
    }

    // Get all matches in the current round for this category
    const currentRoundMatches = await Match.find({
      category_id: categoryId,
      match_level: currentRoundLevel
    });

    if (currentRoundMatches.length === 0) {
      return; // No matches in current round
    }

    // Check if all matches are completed
    const allCompleted = currentRoundMatches.every(m => m.status === 'Completed');
    if (!allCompleted) {
      return; // Not all matches completed yet
    }

    // Check if next round matches already exist
    const existingNextRoundMatches = await Match.find({
      category_id: categoryId,
      match_level: nextRound
    });

    if (existingNextRoundMatches.length > 0) {
      return; // Next round already generated
    }

    // Get all winners from current round
    const winners = [];
    for (const completedMatch of currentRoundMatches) {
      if (completedMatch.winner_id) {
        // Get the winner participant record
        const winnerParticipant = await MatchParticipant.findOne({
          match_id: completedMatch._id,
          $or: [
            { player_id: completedMatch.winner_id },
            { team_id: completedMatch.winner_id }
          ]
        }).populate('player_id').populate('team_id');

        if (winnerParticipant) {
          winners.push({
            player_id: winnerParticipant.player_id?._id || null,
            team_id: winnerParticipant.team_id?._id || null,
            participant_type: winnerParticipant.participant_type
          });
        }
      }
    }

    if (winners.length === 0) {
      console.log(`⚠️ No winners found for ${currentRoundLevel} round in category ${categoryId}`);
      return;
    }

    // Get category and tournament info
    const category = await TournamentCategory.findById(categoryId)
      .populate('tournament_id');
    
    if (!category) {
      console.error(`Category ${categoryId} not found`);
      return;
    }

    const tournament = category.tournament_id;
    const tournamentId = tournament._id || tournament;

    // Generate next round matches
    const nextRoundMatches = [];
    let matchNumber = 1;

    // Pair winners for next round (1st vs 2nd, 3rd vs 4th, etc.)
    for (let i = 0; i < winners.length; i += 2) {
      const participant1 = winners[i];
      const participant2 = winners[i + 1] || null; // Bye if odd number

      // Calculate scheduled time
      const scheduledTime = new Date(tournament.start_date);
      scheduledTime.setHours(9 + (matchNumber * 0.5), (matchNumber % 2) * 30, 0, 0);

      // Create match
      const newMatch = await Match.create({
        tournament_id: tournamentId,
        category_id: categoryId,
        match_name: `${category.category_name} - ${nextRound} ${matchNumber}`,
        match_type: category.category_type,
        match_level: nextRound,
        scheduled_time: scheduledTime,
        venue_area: `Area ${String.fromCharCode(65 + (matchNumber % 3))}`,
        status: 'Scheduled'
      });

      // Create participants
      if (participant1) {
        await MatchParticipant.create({
          match_id: newMatch._id,
          player_id: participant1.participant_type === 'Individual' ? participant1.player_id : null,
          team_id: participant1.participant_type === 'Team' ? participant1.team_id : null,
          participant_type: participant1.participant_type,
          position: 'Player 1'
        });
      }

      if (participant2) {
        await MatchParticipant.create({
          match_id: newMatch._id,
          player_id: participant2.participant_type === 'Individual' ? participant2.player_id : null,
          team_id: participant2.participant_type === 'Team' ? participant2.team_id : null,
          participant_type: participant2.participant_type,
          position: 'Player 2'
        });
      }

      nextRoundMatches.push(newMatch);
      matchNumber++;
    }

    // Assign judges to new matches if tatami exists
    const Tatami = require('../models/Tatami');
    const MatchJudge = require('../models/MatchJudge');
    const tatami = await Tatami.findOne({ category_id: categoryId })
      .populate({
        path: 'assigned_judges.judge_id',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username'
        }
      });

    if (tatami) {
      const confirmedJudges = tatami.assigned_judges?.filter(j => j.is_confirmed) || [];
      if (confirmedJudges.length > 0) {
        for (const newMatch of nextRoundMatches) {
          for (const judgeAssignment of confirmedJudges) {
            try {
              const judgeId = judgeAssignment.judge_id._id || judgeAssignment.judge_id;
              await MatchJudge.create({
                match_id: newMatch._id,
                judge_id: judgeId,
                judge_role: judgeAssignment.judge_role || 'Judge',
                is_confirmed: true
              });
            } catch (error) {
              // Ignore duplicate key errors
              if (error.code !== 11000) {
                console.error(`Error assigning judge to match ${newMatch._id}:`, error);
              }
            }
          }
        }
      }
    }

    console.log(`✅ Generated ${nextRoundMatches.length} ${nextRound} match(es) for category ${category.category_name}`);
  } catch (error) {
    console.error('Error generating next round:', error);
    // Don't throw - this is a background operation
  }
};

// @desc    Calculate Kumite match winner and update match
// @route   POST /api/matches/:id/calculate-winner
// @access  Private
const calculateKumiteMatchWinner = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('category_id');
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Get all participants
    const participants = await MatchParticipant.find({ match_id: match._id })
      .populate('player_id')
      .populate('team_id');

    if (participants.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Match must have at least 2 participants'
      });
    }

    // Get all scores for this match
    const scores = await Score.find({ match_id: match._id });

    if (scores.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No scores found for this match'
      });
    }

    // Calculate scores for each participant
    const participantScores = {};
    participants.forEach(participant => {
      const participantId = participant._id.toString();
      const participantScoresList = scores.filter(s => 
        s.participant_id?.toString() === participantId
      );

      let totalYuko = 0;
      let totalWazaAri = 0;
      let totalIppon = 0;
      let totalChukoku = 0;
      let totalKeikoku = 0;
      let totalHansokuChui = 0;
      let totalHansoku = 0;
      let firstScoreTime = null;

      participantScoresList.forEach(score => {
        totalYuko += score.yuko || 0;
        totalWazaAri += score.waza_ari || 0;
        totalIppon += score.ippon || 0;
        totalChukoku += score.chukoku || 0;
        totalKeikoku += score.keikoku || 0;
        totalHansokuChui += score.hansoku_chui || 0;
        totalHansoku += score.hansoku || 0;
        
        if (score.scored_at && (!firstScoreTime || score.scored_at < firstScoreTime)) {
          firstScoreTime = score.scored_at;
        }
      });

      // Calculate points: Yuko (1), Waza-ari (2), Ippon (3)
      const points = (totalYuko * 1) + (totalWazaAri * 2) + (totalIppon * 3);
      
      participantScores[participantId] = {
        participant,
        totalPoints: points,
        yuko: totalYuko,
        waza_ari: totalWazaAri,
        ippon: totalIppon,
        chukoku: totalChukoku,
        keikoku: totalKeikoku,
        hansoku_chui: totalHansokuChui,
        hansoku: totalHansoku,
        firstScoreTime,
        disqualified: totalHansoku > 0
      };
    });

    // Get opponent scores for penalty points
    const participantIds = Object.keys(participantScores);
    const participant1Id = participantIds[0];
    const participant2Id = participantIds[1];
    
    const participant1Data = participantScores[participant1Id];
    const participant2Data = participantScores[participant2Id];

    // Check for disqualification (Hansoku)
    if (participant1Data.disqualified) {
      // Participant 2 wins
      const winnerParticipant = participant2Data.participant;
      const winnerId = winnerParticipant.participant_type === 'Individual' 
        ? winnerParticipant.player_id 
        : winnerParticipant.team_id;

      match.winner_id = winnerId;
      match.status = 'Completed';
      match.completed_at = new Date();
      await match.save();

      // Update participant results
      await MatchParticipant.updateOne(
        { _id: winnerParticipant._id },
        { result: 'Win' }
      );
      await MatchParticipant.updateMany(
        { match_id: match._id, _id: { $ne: winnerParticipant._id } },
        { result: 'Loss' }
      );

      // Check and generate next round if needed (async, don't wait)
      checkAndGenerateNextRound(match.category_id, match.match_level).catch(err => 
        console.error('Error generating next round:', err)
      );

      return res.status(200).json({
        success: true,
        message: 'Match completed - Participant 1 disqualified',
        data: {
          winner: winnerId,
          reason: 'Disqualification (Hansoku)',
          scores: {
            participant1: participant1Data,
            participant2: participant2Data
          }
        }
      });
    }

    if (participant2Data.disqualified) {
      // Participant 1 wins
      const winnerParticipant = participant1Data.participant;
      const winnerId = winnerParticipant.participant_type === 'Individual' 
        ? winnerParticipant.player_id 
        : winnerParticipant.team_id;

      match.winner_id = winnerId;
      match.status = 'Completed';
      match.completed_at = new Date();
      await match.save();

      // Update participant results
      await MatchParticipant.updateOne(
        { _id: winnerParticipant._id },
        { result: 'Win' }
      );
      await MatchParticipant.updateMany(
        { match_id: match._id, _id: { $ne: winnerParticipant._id } },
        { result: 'Loss' }
      );

      // Check and generate next round if needed (async, don't wait)
      checkAndGenerateNextRound(match.category_id, match.match_level).catch(err => 
        console.error('Error generating next round:', err)
      );

      return res.status(200).json({
        success: true,
        message: 'Match completed - Participant 2 disqualified',
        data: {
          winner: winnerId,
          reason: 'Disqualification (Hansoku)',
          scores: {
            participant1: participant1Data,
            participant2: participant2Data
          }
        }
      });
    }

    // Add opponent penalty points (Keikoku gives opponent 1 point)
    const participant1FinalScore = participant1Data.totalPoints + (participant2Data.keikoku || 0);
    const participant2FinalScore = participant2Data.totalPoints + (participant1Data.keikoku || 0);

    // 8-point difference rule (Senshu) - match stops
    if (Math.abs(participant1FinalScore - participant2FinalScore) >= 8) {
      const winnerParticipant = participant1FinalScore > participant2FinalScore 
        ? participant1Data.participant 
        : participant2Data.participant;
      const winnerId = winnerParticipant.participant_type === 'Individual' 
        ? winnerParticipant.player_id 
        : winnerParticipant.team_id;

      match.winner_id = winnerId;
      match.status = 'Completed';
      match.completed_at = new Date();
      await match.save();

      // Update participant results
      await MatchParticipant.updateOne(
        { _id: winnerParticipant._id },
        { result: 'Win' }
      );
      await MatchParticipant.updateMany(
        { match_id: match._id, _id: { $ne: winnerParticipant._id } },
        { result: 'Loss' }
      );

      // Check and generate next round if needed (async, don't wait)
      checkAndGenerateNextRound(match.category_id, match.match_level).catch(err => 
        console.error('Error generating next round:', err)
      );

      return res.status(200).json({
        success: true,
        message: 'Match completed - 8-point difference',
        data: {
          winner: winnerId,
          reason: '8-point difference (Senshu)',
          scores: {
            participant1: { ...participant1Data, finalScore: participant1FinalScore },
            participant2: { ...participant2Data, finalScore: participant2FinalScore }
          }
        }
      });
    }

    // Higher score wins
    if (participant1FinalScore > participant2FinalScore) {
      const winnerParticipant = participant1Data.participant;
      const winnerId = winnerParticipant.participant_type === 'Individual' 
        ? winnerParticipant.player_id 
        : winnerParticipant.team_id;

      match.winner_id = winnerId;
      match.status = 'Completed';
      match.completed_at = new Date();
      await match.save();

      // Update participant results
      await MatchParticipant.updateOne(
        { _id: winnerParticipant._id },
        { result: 'Win' }
      );
      await MatchParticipant.updateMany(
        { match_id: match._id, _id: { $ne: winnerParticipant._id } },
        { result: 'Loss' }
      );

      // Check and generate next round if needed (async, don't wait)
      checkAndGenerateNextRound(match.category_id, match.match_level).catch(err => 
        console.error('Error generating next round:', err)
      );

      return res.status(200).json({
        success: true,
        message: 'Match completed',
        data: {
          winner: winnerId,
          reason: 'Higher score',
          scores: {
            participant1: { ...participant1Data, finalScore: participant1FinalScore },
            participant2: { ...participant2Data, finalScore: participant2FinalScore }
          }
        }
      });
    }

    if (participant2FinalScore > participant1FinalScore) {
      const winnerParticipant = participant2Data.participant;
      const winnerId = winnerParticipant.participant_type === 'Individual' 
        ? winnerParticipant.player_id 
        : winnerParticipant.team_id;

      match.winner_id = winnerId;
      match.status = 'Completed';
      match.completed_at = new Date();
      await match.save();

      // Update participant results
      await MatchParticipant.updateOne(
        { _id: winnerParticipant._id },
        { result: 'Win' }
      );
      await MatchParticipant.updateMany(
        { match_id: match._id, _id: { $ne: winnerParticipant._id } },
        { result: 'Loss' }
      );

      // Check and generate next round if needed (async, don't wait)
      checkAndGenerateNextRound(match.category_id, match.match_level).catch(err => 
        console.error('Error generating next round:', err)
      );

      return res.status(200).json({
        success: true,
        message: 'Match completed',
        data: {
          winner: winnerId,
          reason: 'Higher score',
          scores: {
            participant1: { ...participant1Data, finalScore: participant1FinalScore },
            participant2: { ...participant2Data, finalScore: participant2FinalScore }
          }
        }
      });
    }

    // Tie: Player who scored first wins
    if (participant1FinalScore === participant2FinalScore) {
      const participant1FirstTime = participant1Data.firstScoreTime;
      const participant2FirstTime = participant2Data.firstScoreTime;
      
      let winnerParticipant;
      if (participant1FirstTime && participant2FirstTime) {
        winnerParticipant = participant1FirstTime < participant2FirstTime 
          ? participant1Data.participant 
          : participant2Data.participant;
      } else if (participant1FirstTime) {
        winnerParticipant = participant1Data.participant;
      } else if (participant2FirstTime) {
        winnerParticipant = participant2Data.participant;
      } else {
        // No first score time available, default to participant 1
        winnerParticipant = participant1Data.participant;
      }

      const winnerId = winnerParticipant.participant_type === 'Individual' 
        ? winnerParticipant.player_id 
        : winnerParticipant.team_id;

      match.winner_id = winnerId;
      match.status = 'Completed';
      match.completed_at = new Date();
      await match.save();

      // Update participant results
      await MatchParticipant.updateOne(
        { _id: winnerParticipant._id },
        { result: 'Win' }
      );
      await MatchParticipant.updateMany(
        { match_id: match._id, _id: { $ne: winnerParticipant._id } },
        { result: 'Loss' }
      );

      // Check and generate next round if needed (async, don't wait)
      checkAndGenerateNextRound(match.category_id, match.match_level).catch(err => 
        console.error('Error generating next round:', err)
      );

      return res.status(200).json({
        success: true,
        message: 'Match completed - Tie broken by first score',
        data: {
          winner: winnerId,
          reason: 'Tie - first score wins',
          scores: {
            participant1: { ...participant1Data, finalScore: participant1FinalScore },
            participant2: { ...participant2Data, finalScore: participant2FinalScore }
          }
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMatches,
  getMatch,
  createMatch,
  updateMatch,
  deleteMatch,
  generateDraws,
  calculateKumiteMatchWinner
};

