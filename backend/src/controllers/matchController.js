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

    // Auto-check and generate next round if needed (async, don't wait for response)
    // Only check if category_id is provided and we have matches
    if (category_id && matchesWithParticipants.length > 0) {
      // Check if all preliminary matches are completed but quarterfinals don't exist
      const preliminaryMatches = matchesWithParticipants.filter(m => m.match_level === 'Preliminary');
      const quarterfinalMatches = matchesWithParticipants.filter(m => m.match_level === 'Quarterfinal');
      
      if (preliminaryMatches.length > 0 && 
          preliminaryMatches.every(m => m.status === 'Completed') && 
          quarterfinalMatches.length === 0) {
        // Trigger next round generation in background
        checkAndGenerateNextRound(category_id, 'Preliminary').catch(err => 
          console.error('Auto-check: Error generating next round:', err)
        );
      }
      
      // Check if all quarterfinal matches are completed but semifinals don't exist
      const semifinalMatches = matchesWithParticipants.filter(m => m.match_level === 'Semifinal');
      if (quarterfinalMatches.length > 0 && 
          quarterfinalMatches.every(m => m.status === 'Completed') && 
          semifinalMatches.length === 0) {
        checkAndGenerateNextRound(category_id, 'Quarterfinal').catch(err => 
          console.error('Auto-check: Error generating next round:', err)
        );
      }
      
      // Check if all semifinal matches are completed but final doesn't exist
      const finalMatches = matchesWithParticipants.filter(m => m.match_level === 'Final');
      if (semifinalMatches.length > 0 && 
          semifinalMatches.every(m => m.status === 'Completed') && 
          finalMatches.length === 0) {
        checkAndGenerateNextRound(category_id, 'Semifinal').catch(err => 
          console.error('Auto-check: Error generating next round:', err)
        );
      }
    }

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

    const wasCompleted = match.status === 'Completed';
    
    match = await Match.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // If match was just completed (transitioned from non-completed to completed), check if we need to generate next round
    if (!wasCompleted && match.status === 'Completed' && match.match_level && match.category_id) {
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
    const mongoose = require('mongoose');
    
    console.log(`🔄 Checking if next round should be generated for ${currentRoundLevel} in category ${categoryId}`);
    
    // Define round progression
    const roundProgression = {
      'Preliminary': 'Quarterfinal',
      'Quarterfinal': 'Semifinal',
      'Semifinal': 'Final'
    };

    const nextRound = roundProgression[currentRoundLevel];
    if (!nextRound) {
      console.log(`ℹ️ No next round after ${currentRoundLevel}`);
      return; // No next round (e.g., Final or Bronze)
    }

    // Ensure categoryId is ObjectId
    const categoryObjectId = mongoose.Types.ObjectId.isValid(categoryId) 
      ? new mongoose.Types.ObjectId(categoryId) 
      : categoryId;

    // Get all matches in the current round for this category
    // Sort by match_name to ensure proper pairing order (Match 1, Match 2, Match 3, etc.)
    const currentRoundMatches = await Match.find({
      category_id: categoryObjectId,
      match_level: currentRoundLevel
    }).sort({ match_name: 1, scheduled_time: 1 });

    if (currentRoundMatches.length === 0) {
      console.log(`ℹ️ No matches found for ${currentRoundLevel} round in category ${categoryId}`);
      return; // No matches in current round
    }

    console.log(`📊 Found ${currentRoundMatches.length} match(es) in ${currentRoundLevel} round`);
    console.log(`📋 Match order: ${currentRoundMatches.map(m => m.match_name).join(', ')}`);

    // Check if all matches are completed
    const allCompleted = currentRoundMatches.every(m => m.status === 'Completed');
    if (!allCompleted) {
      const incompleteCount = currentRoundMatches.filter(m => m.status !== 'Completed').length;
      const incompleteMatches = currentRoundMatches
        .filter(m => m.status !== 'Completed')
        .map(m => m.match_name);
      console.log(`⏳ Not all matches completed yet. ${incompleteCount} match(es) still pending: ${incompleteMatches.join(', ')}`);
      return; // Not all matches completed yet
    }

    // Check if next round matches already exist
    // Sort by match_name to ensure consistent ordering (Quarterfinal 1, Quarterfinal 2, etc.)
    const existingNextRoundMatches = await Match.find({
      category_id: categoryObjectId,
      match_level: nextRound
    }).sort({ match_name: 1, scheduled_time: 1 });

    // Check if existing matches have real participants (not just empty/Bye)
    let shouldUpdateExisting = false;
    if (existingNextRoundMatches.length > 0) {
      // Check if any existing match has participants
      for (const existingMatch of existingNextRoundMatches) {
        const existingParticipants = await MatchParticipant.find({
          match_id: existingMatch._id
        });
        
        // If match has no participants or all participants are null (Bye), we should update it
        if (existingParticipants.length === 0 || 
            existingParticipants.every(p => !p.player_id && !p.team_id)) {
          shouldUpdateExisting = true;
          break;
        }
      }
      
      // If all existing matches have real participants, don't update
      if (!shouldUpdateExisting) {
        console.log(`ℹ️ Next round (${nextRound}) already exists with participants - skipping update`);
        return;
      }
      
      console.log(`🔄 Next round (${nextRound}) exists but has empty/Bye participants - will update with winners`);
    }

    // Get all winners from current round in order (Match 1, Match 2, Match 3, etc.)
    const winners = [];
    for (let matchIndex = 0; matchIndex < currentRoundMatches.length; matchIndex++) {
      const completedMatch = currentRoundMatches[matchIndex];
      
      if (!completedMatch.winner_id) {
        console.warn(`⚠️ Match ${completedMatch.match_name} (${completedMatch._id}) is completed but has no winner_id`);
        continue;
      }

      // Get all participants for this match
      const allParticipants = await MatchParticipant.find({
        match_id: completedMatch._id
      }).populate('player_id').populate('team_id');

      // Find the participant that matches the winner_id
      let winnerParticipant = null;
      for (const participant of allParticipants) {
        const participantPlayerId = participant.player_id?._id?.toString() || participant.player_id?.toString();
        const participantTeamId = participant.team_id?._id?.toString() || participant.team_id?.toString();
        const winnerIdStr = completedMatch.winner_id.toString();

        if (participantPlayerId === winnerIdStr || participantTeamId === winnerIdStr) {
          winnerParticipant = participant;
          break;
        }
      }

      if (winnerParticipant) {
        // Extract player_id or team_id - handle both populated and unpopulated cases
        let playerId = null;
        let teamId = null;
        
        if (winnerParticipant.player_id) {
          // If populated, get _id, otherwise it's already an ObjectId
          playerId = winnerParticipant.player_id._id || winnerParticipant.player_id;
        }
        
        if (winnerParticipant.team_id) {
          // If populated, get _id, otherwise it's already an ObjectId
          teamId = winnerParticipant.team_id._id || winnerParticipant.team_id;
        }
        
        // Ensure we have valid ObjectIds
        if (playerId && !mongoose.Types.ObjectId.isValid(playerId)) {
          console.warn(`⚠️ Invalid player_id for winner: ${playerId}`);
          playerId = null;
        }
        if (teamId && !mongoose.Types.ObjectId.isValid(teamId)) {
          console.warn(`⚠️ Invalid team_id for winner: ${teamId}`);
          teamId = null;
        }
        
        winners.push({
          player_id: playerId,
          team_id: teamId,
          participant_type: winnerParticipant.participant_type
        });
        
        const winnerName = playerId 
          ? (winnerParticipant.player_id?.user_id ? 
              `${winnerParticipant.player_id.user_id.first_name || ''} ${winnerParticipant.player_id.user_id.last_name || ''}`.trim() 
              : 'Player') 
          : (teamId ? (winnerParticipant.team_id?.team_name || 'Team') : 'Unknown');
        
        console.log(`✅ Found winner #${matchIndex + 1} from ${completedMatch.match_name}: ${winnerName} (${winnerParticipant.participant_type})`);
      } else {
        console.warn(`⚠️ Could not find winner participant for match ${completedMatch._id} with winner_id ${completedMatch.winner_id}`);
      }
    }

    if (winners.length === 0) {
      console.log(`⚠️ No winners found for ${currentRoundLevel} round in category ${categoryId}`);
      return;
    }

    console.log(`🏆 Found ${winners.length} winner(s) from ${currentRoundLevel} round`);
    console.log(`📊 Winners will be paired as: Match 1 vs Match 2, Match 3 vs Match 4, etc.`);

    // Get category and tournament info
    const category = await TournamentCategory.findById(categoryObjectId)
      .populate('tournament_id');
    
    if (!category) {
      console.error(`❌ Category ${categoryId} not found`);
      return;
    }

    const tournament = category.tournament_id;
    const tournamentId = tournament._id || tournament;

    // Find the latest completion time from current round matches to schedule next round
    const latestCompletionTime = currentRoundMatches
      .filter(m => m.completed_at)
      .map(m => new Date(m.completed_at))
      .sort((a, b) => b - a)[0] || new Date();

    // Generate or update next round matches
    const nextRoundMatches = [];
    let matchNumber = 1;

    // Pair winners sequentially: 
    // - Match 1 winner vs Match 2 winner → Next Round Match 1
    // - Match 3 winner vs Match 4 winner → Next Round Match 2
    // - Match 5 winner vs Bye (if odd number) → Next Round Match 3
    // This ensures proper bracket progression
    for (let i = 0; i < winners.length; i += 2) {
      const participant1 = winners[i];      // Winner from match (i+1) - e.g., Match 1, Match 3, Match 5
      const participant2 = winners[i + 1] || null; // Winner from match (i+2) - e.g., Match 2, Match 4, or null (Bye)
      
      const match1Index = i;
      const match2Index = i + 1;
      const match1Name = currentRoundMatches[match1Index]?.match_name || `Match ${match1Index + 1}`;
      const match2Name = currentRoundMatches[match2Index]?.match_name || (match2Index < currentRoundMatches.length ? `Match ${match2Index + 1}` : 'Bye');
      console.log(`🔗 Pairing for ${nextRound} ${Math.floor(i/2) + 1}: Winner from ${match1Name} vs Winner from ${match2Name}`);

      let targetMatch;
      
      if (shouldUpdateExisting && existingNextRoundMatches[matchNumber - 1]) {
        // Update existing match
        targetMatch = existingNextRoundMatches[matchNumber - 1];
        console.log(`🔄 Updating existing match ${targetMatch._id} with winners`);
        
        // Delete existing participants (if any)
        await MatchParticipant.deleteMany({ match_id: targetMatch._id });
        
        // Update match scheduled time if needed
        const scheduledTime = new Date(latestCompletionTime);
        scheduledTime.setMinutes(scheduledTime.getMinutes() + 30 + (matchNumber - 1) * 30);
        targetMatch.scheduled_time = scheduledTime;
        targetMatch.status = 'Scheduled';
        await targetMatch.save();
      } else {
        // Create new match
        const scheduledTime = new Date(latestCompletionTime);
        scheduledTime.setMinutes(scheduledTime.getMinutes() + 30 + (matchNumber - 1) * 30);

        targetMatch = await Match.create({
          tournament_id: tournamentId,
          category_id: categoryObjectId,
          match_name: `${category.category_name} - ${nextRound} ${matchNumber}`,
          match_type: category.category_type,
          match_level: nextRound,
          scheduled_time: scheduledTime,
          venue_area: `Area ${String.fromCharCode(65 + (matchNumber % 3))}`,
          status: 'Scheduled'
        });
        console.log(`✅ Created new match ${targetMatch._id} for ${nextRound}`);
      }

      // Create participants for the match
      if (participant1) {
        const participant1Data = {
          match_id: targetMatch._id,
          participant_type: participant1.participant_type,
          position: 'Player 1'
        };
        
        if (participant1.participant_type === 'Individual' && participant1.player_id) {
          // Ensure player_id is a valid ObjectId
          const playerId = mongoose.Types.ObjectId.isValid(participant1.player_id) 
            ? new mongoose.Types.ObjectId(participant1.player_id) 
            : participant1.player_id;
          participant1Data.player_id = playerId;
          participant1Data.team_id = null;
          console.log(`📝 Setting participant 1 player_id: ${playerId}`);
        } else if (participant1.participant_type === 'Team' && participant1.team_id) {
          // Ensure team_id is a valid ObjectId
          const teamId = mongoose.Types.ObjectId.isValid(participant1.team_id) 
            ? new mongoose.Types.ObjectId(participant1.team_id) 
            : participant1.team_id;
          participant1Data.team_id = teamId;
          participant1Data.player_id = null;
          console.log(`📝 Setting participant 1 team_id: ${teamId}`);
        }
        
        const createdParticipant1 = await MatchParticipant.create(participant1Data);
        console.log(`✅ Created participant 1 for match ${targetMatch._id}: ${participant1.participant_type} - ID: ${createdParticipant1._id}`);
      }

      if (participant2) {
        const participant2Data = {
          match_id: targetMatch._id,
          participant_type: participant2.participant_type,
          position: 'Player 2'
        };
        
        if (participant2.participant_type === 'Individual' && participant2.player_id) {
          // Ensure player_id is a valid ObjectId
          const playerId = mongoose.Types.ObjectId.isValid(participant2.player_id) 
            ? new mongoose.Types.ObjectId(participant2.player_id) 
            : participant2.player_id;
          participant2Data.player_id = playerId;
          participant2Data.team_id = null;
          console.log(`📝 Setting participant 2 player_id: ${playerId}`);
        } else if (participant2.participant_type === 'Team' && participant2.team_id) {
          // Ensure team_id is a valid ObjectId
          const teamId = mongoose.Types.ObjectId.isValid(participant2.team_id) 
            ? new mongoose.Types.ObjectId(participant2.team_id) 
            : participant2.team_id;
          participant2Data.team_id = teamId;
          participant2Data.player_id = null;
          console.log(`📝 Setting participant 2 team_id: ${teamId}`);
        }
        
        const createdParticipant2 = await MatchParticipant.create(participant2Data);
        console.log(`✅ Created participant 2 for match ${targetMatch._id}: ${participant2.participant_type} - ID: ${createdParticipant2._id}`);
      }

      nextRoundMatches.push(targetMatch);
      matchNumber++;
    }

    // Assign judges to new matches if tatami exists
    const Tatami = require('../models/Tatami');
    const MatchJudge = require('../models/MatchJudge');
    const tatami = await Tatami.findOne({ category_id: categoryObjectId })
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

    // Log summary of what was created/updated
    console.log(`\n✅ ========================================`);
    console.log(`✅ Successfully generated/updated ${nextRoundMatches.length} ${nextRound} match(es) for category ${category.category_name}`);
    console.log(`✅ Winners paired as follows:`);
    for (let i = 0; i < winners.length; i += 2) {
      const matchNum = Math.floor(i / 2) + 1;
      const p1 = winners[i];
      const p2 = winners[i + 1];
      const p1Name = p1?.player_id ? 'Player' : (p1?.team_id ? 'Team' : 'N/A');
      const p2Name = p2 ? (p2.player_id ? 'Player' : (p2.team_id ? 'Team' : 'N/A')) : 'Bye';
      console.log(`   ${nextRound} ${matchNum}: ${p1Name} vs ${p2Name}`);
    }
    console.log(`✅ ========================================\n`);
    
    // Emit real-time update if socket.io is available
    try {
      const { getIO } = require('../utils/socket');
      const io = getIO();
      if (io) {
        // Emit to tournament room and category-specific room
        io.to(`tournament-${tournamentId.toString()}`).emit('matches:updated', {
          category_id: categoryObjectId.toString(),
          tournament_id: tournamentId.toString(),
          message: `Next round (${nextRound}) matches have been generated`,
          nextRound: nextRound,
          matchesCount: nextRoundMatches.length,
          action: 'round_progression'
        });
        // Also emit a general refresh event
        io.emit('refresh:matches', {
          category_id: categoryObjectId.toString(),
          tournament_id: tournamentId.toString()
        });
        console.log(`📡 Emitted real-time update for tournament ${tournamentId}`);
      }
    } catch (socketError) {
      // Socket.io might not be available, ignore silently
      console.log('ℹ️ Socket.IO not available for real-time updates');
    }
  } catch (error) {
    console.error('❌ Error generating next round:', error);
    console.error('Stack trace:', error.stack);
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

// @desc    Manually trigger next round generation for a category
// @route   POST /api/matches/generate-next-round
// @access  Private/Organizer
const generateNextRound = async (req, res, next) => {
  try {
    const { category_id, current_round_level } = req.body;

    if (!category_id || !current_round_level) {
      return res.status(400).json({
        success: false,
        message: 'Category ID and current round level are required'
      });
    }

    // Check authorization
    if (req.user.user_type !== 'Admin') {
      const TournamentCategory = require('../models/TournamentCategory');
      const category = await TournamentCategory.findById(category_id)
        .populate('tournament_id');
      
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      const Organizer = require('../models/Organizer');
      const tournament = category.tournament_id;
      const organizer = await Organizer.findById(tournament.organizer_id);
      if (!organizer || organizer.user_id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to generate next round for this category'
        });
      }
    }

    // Manually trigger next round generation
    await checkAndGenerateNextRound(category_id, current_round_level);

    res.status(200).json({
      success: true,
      message: `Next round generation triggered for ${current_round_level} round`
    });
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
  calculateKumiteMatchWinner,
  generateNextRound
};

