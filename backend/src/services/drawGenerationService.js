const Match = require('../models/Match');
const MatchParticipant = require('../models/MatchParticipant');
const MatchJudge = require('../models/MatchJudge');
const Tatami = require('../models/Tatami');
const Registration = require('../models/Registration');
const TournamentCategory = require('../models/TournamentCategory');
const Tournament = require('../models/Tournament');
const Player = require('../models/Player');
const Team = require('../models/Team');
const { generateMatchDraws } = require('../utils/geminiService');

/**
 * Generate match draws for a tournament category using Gemini AI
 * @param {String} categoryId - Tournament category ID
 * @param {String} tournamentId - Tournament ID
 * @returns {Promise<Object>} Generated matches and participants
 */
const generateDrawsForCategory = async (categoryId, tournamentId) => {
  try {
    // Get category details
    const category = await TournamentCategory.findById(categoryId)
      .populate('tournament_id');
    
    if (!category) {
      throw new Error('Category not found');
    }

    // Get tournament details
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    // Get all approved and paid registrations for this category
    // Use lean() and sort to ensure we get the latest registrations
    const registrations = await Registration.find({
      tournament_id: tournamentId,
      category_id: categoryId,
      approval_status: 'Approved',
      payment_status: 'Paid',
      registration_type: category.participation_type
    })
      .sort({ createdAt: -1 }) // Get newest registrations first
      .lean() // Use lean for better performance and to ensure fresh data
      .populate({
        path: 'player_id',
        populate: {
          path: 'user_id',
          select: 'first_name last_name'
        }
      })
      .populate({
        path: 'team_id',
        populate: {
          path: 'members',
          populate: {
            path: 'player_id',
            populate: {
              path: 'user_id',
              select: 'first_name last_name'
            }
          }
        }
      });
    
    console.log(`📊 Draw Generation: Found ${registrations.length} approved and paid registrations for category ${category.category_name}`);

    if (registrations.length === 0) {
      throw new Error('No approved registrations found for this category');
    }

    // Prepare participant data for Gemini
    const participants = registrations.map((reg, index) => {
      if (category.participation_type === 'Individual' && reg.player_id) {
        const player = reg.player_id;
        const user = player.user_id;
        return {
          id: reg._id.toString(),
          registrationId: reg._id.toString(),
          playerId: player._id.toString(),
          name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Unknown',
          belt: player.belt || null,
          age: player.age || null,
          dojo: player.dojo_name || null,
          type: 'Individual'
        };
      } else if (category.participation_type === 'Team' && reg.team_id) {
        const team = reg.team_id;
        return {
          id: reg._id.toString(),
          registrationId: reg._id.toString(),
          teamId: team._id.toString(),
          name: team.team_name || 'Unknown Team',
          members: team.members?.length || 0,
          type: 'Team'
        };
      }
      return null;
    }).filter(p => p !== null);

    if (participants.length === 0) {
      throw new Error('No valid participants found');
    }

    // Prepare tournament data for Gemini
    const tournamentData = {
      tournamentName: tournament.tournament_name,
      categoryName: category.category_name,
      categoryType: category.category_type,
      participationType: category.participation_type,
      startDate: tournament.start_date,
      participants: participants
    };

    console.log('🔵 Generating match draws with Gemini AI for:', {
      category: category.category_name,
      participants: participants.length,
      type: category.participation_type
    });

    // Generate draws using Gemini
    console.log('🔵 Calling Gemini AI service...');
    let drawStructure;
    try {
      drawStructure = await generateMatchDraws(tournamentData);
      console.log('✅ Gemini AI returned draw structure:', {
        bracketType: drawStructure.bracketType,
        totalRounds: drawStructure.totalRounds,
        matchesCount: drawStructure.matches?.length || 0
      });
    } catch (error) {
      console.error('❌ Gemini AI service error:', error);
      throw error;
    }

    // Validate that all participants are included in the matches
    const participantIdsInMatches = new Set();
    drawStructure.matches.forEach(match => {
      if (match.participant1Id) participantIdsInMatches.add(match.participant1Id);
      if (match.participant2Id) participantIdsInMatches.add(match.participant2Id);
    });

    const missingParticipants = participants.filter(p => !participantIdsInMatches.has(p.id));
    if (missingParticipants.length > 0) {
      console.warn('⚠️ Some participants not included in Gemini-generated matches:', missingParticipants.map(p => p.name));
      // Add missing participants to preliminary matches with byes
      const preliminaryMatches = drawStructure.matches.filter(m => m.matchLevel === 'Preliminary');
      missingParticipants.forEach((participant, index) => {
        if (preliminaryMatches[index]) {
          // Add as a bye match
          preliminaryMatches[index].participant2Id = participant.id;
        } else {
          // Create new preliminary match for missing participant
          drawStructure.matches.push({
            matchNumber: drawStructure.matches.length + 1,
            matchLevel: 'Preliminary',
            round: 1,
            participant1Id: participant.id,
            participant2Id: null,
            suggestedTime: '09:00',
            venueArea: 'Area A'
          });
        }
      });
    }

    console.log(`✅ Validated ${participants.length} participants in ${drawStructure.matches.length} matches`);

    // Get tatami for this category to assign judges to matches
    const tatami = await Tatami.findOne({ category_id: categoryId })
      .populate({
        path: 'assigned_judges.judge_id',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username'
        }
      });
    
    // Get confirmed judges from tatami
    const confirmedJudges = tatami?.assigned_judges?.filter(j => j.is_confirmed) || [];
    const unconfirmedJudges = tatami?.assigned_judges?.filter(j => !j.is_confirmed) || [];
    
    console.log(`🔵 Judge Assignment Status for ${category.category_name}:`);
    console.log(`   ✅ Confirmed judges: ${confirmedJudges.length}`);
    if (unconfirmedJudges.length > 0) {
      console.log(`   ⚠️  Unconfirmed judges: ${unconfirmedJudges.length} (will not be assigned to matches)`);
    }
    
    if (confirmedJudges.length === 0 && tatami?.assigned_judges?.length > 0) {
      console.log(`   ⚠️  WARNING: Judges are assigned to this event but none have confirmed. Matches will be created without judges.`);
    }

    // Delete existing matches for this category (if regenerating)
    const existingMatches = await Match.find({ category_id: categoryId });
    const existingMatchIds = existingMatches.map(m => m._id);
    
    if (existingMatchIds.length > 0) {
      await MatchParticipant.deleteMany({ match_id: { $in: existingMatchIds } });
      await MatchJudge.deleteMany({ match_id: { $in: existingMatchIds } });
    }
    await Match.deleteMany({ category_id: categoryId });

    // Create matches based on Gemini's suggestions
    const createdMatches = [];
    const matchParticipants = [];

    for (const matchData of drawStructure.matches) {
      // Calculate scheduled time
      const scheduledTime = new Date(tournament.start_date);
      const [hours, minutes] = matchData.suggestedTime?.split(':') || ['09', '00'];
      scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Create match
      const match = await Match.create({
        tournament_id: tournamentId,
        category_id: categoryId,
        match_name: `${category.category_name} - ${matchData.matchLevel} ${matchData.matchNumber || ''}`.trim(),
        match_type: category.category_type,
        match_level: matchData.matchLevel,
        scheduled_time: scheduledTime,
        venue_area: matchData.venueArea || 'Main Area',
        status: 'Scheduled'
      });

      createdMatches.push(match);

      // Find participants - match by registration ID or participant ID
      const participant1 = participants.find(p => 
        p.id === matchData.participant1Id || 
        p.registrationId === matchData.participant1Id ||
        (matchData.participant1Id && p.id.includes(matchData.participant1Id))
      );
      const participant2 = matchData.participant2Id 
        ? participants.find(p => 
            p.id === matchData.participant2Id || 
            p.registrationId === matchData.participant2Id ||
            (matchData.participant2Id && p.id.includes(matchData.participant2Id))
          )
        : null;

      // Create match participants
      if (participant1) {
        const matchPart1 = await MatchParticipant.create({
          match_id: match._id,
          player_id: participant1.type === 'Individual' ? participant1.playerId : null,
          team_id: participant1.type === 'Team' ? participant1.teamId : null,
          participant_type: participant1.type,
          position: 'Player 1'
        });
        matchParticipants.push(matchPart1);
      }

      if (participant2) {
        const matchPart2 = await MatchParticipant.create({
          match_id: match._id,
          player_id: participant2.type === 'Individual' ? participant2.playerId : null,
          team_id: participant2.type === 'Team' ? participant2.teamId : null,
          participant_type: participant2.type,
          position: 'Player 2'
        });
        matchParticipants.push(matchPart2);
      } else if (participant1) {
        // Bye - participant1 advances automatically
        // Mark the match as having only one participant (bye)
        console.log(`⚠️ Match ${match._id} has a bye - participant ${participant1.name} advances`);
      }

      // Assign confirmed judges from tatami to this match
      const assignedJudgeIds = [];
      if (confirmedJudges.length > 0) {
        for (const judgeAssignment of confirmedJudges) {
          try {
            const judgeId = judgeAssignment.judge_id._id || judgeAssignment.judge_id;
            const judgeName = judgeAssignment.judge_id?.user_id 
              ? `${judgeAssignment.judge_id.user_id.first_name || ''} ${judgeAssignment.judge_id.user_id.last_name || ''}`.trim() || judgeAssignment.judge_id.user_id.username
              : 'Unknown';
            
            await MatchJudge.create({
              match_id: match._id,
              judge_id: judgeId,
              judge_role: judgeAssignment.judge_role || 'Judge',
              is_confirmed: true // Already confirmed at tatami level
            });
            assignedJudgeIds.push({
              judge_id: judgeId,
              judge_name: judgeName,
              role: judgeAssignment.judge_role || 'Judge'
            });
          } catch (error) {
            // Ignore duplicate key errors (judge already assigned)
            if (error.code !== 11000) {
              console.error(`❌ Error assigning judge to match ${match._id}:`, error);
            }
          }
        }
        console.log(`   ✅ Assigned ${assignedJudgeIds.length} confirmed judge(s) to match: ${match.match_name}`);
      } else {
        console.log(`   ⚠️  No confirmed judges to assign to match: ${match.match_name}`);
      }
    }

    // Count total judge assignments
    const totalJudgeAssignments = await MatchJudge.countDocuments({
      match_id: { $in: createdMatches.map(m => m._id) }
    });

    console.log(`✅ Generated ${createdMatches.length} matches using Gemini AI`);
    console.log(`✅ Assigned ${confirmedJudges.length} confirmed judge(s) to ${createdMatches.length} match(es)`);
    console.log(`   Total MatchJudge entries created: ${totalJudgeAssignments}`);

    return {
      success: true,
      bracketType: drawStructure.bracketType,
      totalRounds: drawStructure.totalRounds,
      matchesCreated: createdMatches.length,
      matches: createdMatches,
      explanation: drawStructure.explanation,
      seeding: drawStructure.seeding,
      judgesAssigned: {
        totalJudges: confirmedJudges.length,
        judgesPerMatch: confirmedJudges.length,
        totalAssignments: totalJudgeAssignments,
        unconfirmedJudges: unconfirmedJudges.length
      }
    };
  } catch (error) {
    console.error('Error generating draws:', error);
    throw error;
  }
};

/**
 * Generate simple bracket structure (fallback if Gemini fails)
 */
const generateSimpleBracket = async (categoryId, tournamentId) => {
  try {
    const category = await TournamentCategory.findById(categoryId);
    const tournament = await Tournament.findById(tournamentId);

    const registrations = await Registration.find({
      tournament_id: tournamentId,
      category_id: categoryId,
      approval_status: 'Approved',
      payment_status: 'Paid',
      registration_type: category.participation_type
    })
      .populate('player_id')
      .populate('team_id');

    if (registrations.length < 2) {
      throw new Error('Need at least 2 participants to generate draws');
    }

    // Simple single elimination bracket
    const participants = registrations;
    const totalRounds = Math.ceil(Math.log2(participants.length));
    
    // Shuffle participants for random seeding
    const shuffled = [...participants].sort(() => Math.random() - 0.5);

    const matches = [];
    let currentRound = shuffled;
    let matchNumber = 1;

    for (let round = 1; round <= totalRounds; round++) {
      const nextRound = [];
      const roundLevel = round === totalRounds ? 'Final' : 
                        round === totalRounds - 1 ? 'Semifinal' :
                        round === totalRounds - 2 ? 'Quarterfinal' : 'Preliminary';

      for (let i = 0; i < currentRound.length; i += 2) {
        const participant1 = currentRound[i];
        const participant2 = currentRound[i + 1] || null; // Bye if odd number

        const scheduledTime = new Date(tournament.start_date);
        scheduledTime.setHours(9 + (matchNumber * 0.5), (matchNumber % 2) * 30, 0, 0);

        const match = await Match.create({
          tournament_id: tournamentId,
          category_id: categoryId,
          match_name: `${category.category_name} - ${roundLevel} ${matchNumber}`,
          match_type: category.category_type,
          match_level: roundLevel,
          scheduled_time: scheduledTime,
          venue_area: `Area ${String.fromCharCode(65 + (matchNumber % 3))}`,
          status: 'Scheduled'
        });

        // Create participants
        if (participant1) {
          await MatchParticipant.create({
            match_id: match._id,
            player_id: category.participation_type === 'Individual' ? participant1.player_id : null,
            team_id: category.participation_type === 'Team' ? participant1.team_id : null,
            participant_type: category.participation_type,
            position: 'Player 1'
          });
        }

        if (participant2) {
          await MatchParticipant.create({
            match_id: match._id,
            player_id: category.participation_type === 'Individual' ? participant2.player_id : null,
            team_id: category.participation_type === 'Team' ? participant2.team_id : null,
            participant_type: category.participation_type,
            position: 'Player 2'
          });
          nextRound.push(null); // Placeholder for winner
        } else {
          // Bye - participant1 advances
          nextRound.push(participant1);
        }

        matches.push(match);

        matchNumber++;
      }

      currentRound = nextRound.filter(p => p !== null);
    }

    // Get tatami for this category to assign judges to all matches
    const tatami = await Tatami.findOne({ category_id: categoryId })
      .populate({
        path: 'assigned_judges.judge_id',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username'
        }
      });
    
    // Get confirmed judges from tatami
    const confirmedJudges = tatami?.assigned_judges?.filter(j => j.is_confirmed) || [];
    const unconfirmedJudges = tatami?.assigned_judges?.filter(j => !j.is_confirmed) || [];
    
    console.log(`🔵 Judge Assignment Status for ${category.category_name}:`);
    console.log(`   ✅ Confirmed judges: ${confirmedJudges.length}`);
    if (unconfirmedJudges.length > 0) {
      console.log(`   ⚠️  Unconfirmed judges: ${unconfirmedJudges.length} (will not be assigned to matches)`);
    }
    
    if (confirmedJudges.length === 0 && tatami?.assigned_judges?.length > 0) {
      console.log(`   ⚠️  WARNING: Judges are assigned to this event but none have confirmed. Matches will be created without judges.`);
    }

    // Assign confirmed judges to all matches
    let totalJudgeAssignments = 0;
    if (confirmedJudges.length > 0) {
      for (const match of matches) {
        for (const judgeAssignment of confirmedJudges) {
          try {
            const judgeId = judgeAssignment.judge_id._id || judgeAssignment.judge_id;
            await MatchJudge.create({
              match_id: match._id,
              judge_id: judgeId,
              judge_role: judgeAssignment.judge_role || 'Judge',
              is_confirmed: true // Already confirmed at tatami level
            });
            totalJudgeAssignments++;
          } catch (error) {
            // Ignore duplicate key errors (judge already assigned)
            if (error.code !== 11000) {
              console.error(`❌ Error assigning judge to match ${match._id}:`, error);
            }
          }
        }
      }
      console.log(`✅ Assigned ${confirmedJudges.length} confirmed judge(s) to ${matches.length} match(es)`);
      console.log(`   Total MatchJudge entries created: ${totalJudgeAssignments}`);
    } else {
      console.log(`⚠️  No confirmed judges to assign to matches`);
    }

    return {
      success: true,
      bracketType: 'single-elimination',
      totalRounds,
      matchesCreated: matches.length,
      matches,
      judgesAssigned: {
        totalJudges: confirmedJudges.length,
        judgesPerMatch: confirmedJudges.length,
        totalAssignments: totalJudgeAssignments,
        unconfirmedJudges: unconfirmedJudges.length
      }
    };
  } catch (error) {
    console.error('Error generating simple bracket:', error);
    throw error;
  }
};

module.exports = {
  generateDrawsForCategory,
  generateSimpleBracket
};

