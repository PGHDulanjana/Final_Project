import React, { useState, useEffect } from 'react';
import { scoreService } from '../services/scoreService';
import { matchService } from '../services/matchService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiUser, FiUsers, FiAward, FiCheck, FiX } from 'react-icons/fi';

const KumiteMatchScoring = ({ match, onScoreUpdate }) => {
  const { user } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [judges, setJudges] = useState([]); // All assigned judges for this match
  const [scores, setScores] = useState({}); // { judgeId: { participantId: { yuko, waza_ari, ippon, penalties } } }
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState({}); // Track which judge is submitting
  const [matchWinner, setMatchWinner] = useState(null);

  // Determine AKA (first participant, red) and AO (second participant, blue)
  const akaParticipant = participants[0] || null;
  const aoParticipant = participants[1] || null;

  useEffect(() => {
    if (match) {
      if (match.participants) {
        setParticipants(match.participants);
      }
      if (match.judges) {
        setJudges(match.judges);
      }
      loadMatchScores();
    }
  }, [match]);

  const loadMatchScores = async () => {
    if (!match || !match._id) return;

    setLoading(true);
    try {
      // Load scores for this match
      const scoresRes = await scoreService.getMatchScores(match._id);
      const matchScores = scoresRes.data || [];

      // Group scores by judge and participant
      // Structure: { judgeId: { participantId: { scores } } }
      const scoresByJudgeAndParticipant = {};
      
      matchScores.forEach(score => {
        const judgeId = score.judge_id?._id || score.judge_id;
        const participantId = score.participant_id?._id || score.participant_id;
        if (!judgeId || !participantId) return;
        
        if (!scoresByJudgeAndParticipant[judgeId]) {
          scoresByJudgeAndParticipant[judgeId] = {};
        }
        
        scoresByJudgeAndParticipant[judgeId][participantId] = {
          yuko: score.yuko || 0,
          waza_ari: score.waza_ari || 0,
          ippon: score.ippon || 0,
          chukoku_cat1: score.chukoku || 0,
          keikoku_cat1: score.keikoku || 0,
          hansoku_chui_cat1: score.hansoku_chui || 0,
          hansoku_cat1: score.hansoku || 0,
          chukoku_cat2: 0,
          keikoku_cat2: 0,
          hansoku_chui_cat2: 0,
          hansoku_cat2: 0,
          firstScoreTime: score.scored_at ? new Date(score.scored_at) : null
        };
      });

      setScores(scoresByJudgeAndParticipant);
      calculateWinnerFromAllJudges(scoresByJudgeAndParticipant);
    } catch (error) {
      console.error('Error loading match scores:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate total score from all judges (aggregate)
  const calculateTotalScoreFromJudges = (judgeScores, participantId) => {
    let totalYuko = 0;
    let totalWazaAri = 0;
    let totalIppon = 0;
    let totalChukoku = 0;
    let totalKeikoku = 0;
    let totalHansokuChui = 0;
    let totalHansoku = 0;
    let firstScoreTime = null;

    Object.values(judgeScores).forEach(judgeScore => {
      const participantScore = judgeScore[participantId] || {};
      totalYuko += participantScore.yuko || 0;
      totalWazaAri += participantScore.waza_ari || 0;
      totalIppon += participantScore.ippon || 0;
      totalChukoku += (participantScore.chukoku_cat1 || 0) + (participantScore.chukoku_cat2 || 0);
      totalKeikoku += (participantScore.keikoku_cat1 || 0) + (participantScore.keikoku_cat2 || 0);
      totalHansokuChui += (participantScore.hansoku_chui_cat1 || 0) + (participantScore.hansoku_chui_cat2 || 0);
      totalHansoku += (participantScore.hansoku_cat1 || 0) + (participantScore.hansoku_cat2 || 0);
      
      if (participantScore.firstScoreTime && (!firstScoreTime || participantScore.firstScoreTime < firstScoreTime)) {
        firstScoreTime = participantScore.firstScoreTime;
      }
    });

    // Calculate points: Yuko (1), Waza-ari (2), Ippon (3)
    const points = (totalYuko * 1) + (totalWazaAri * 2) + (totalIppon * 3);
    
    // Hansoku = disqualification
    if (totalHansoku > 0) {
      return { total: -1, firstScoreTime };
    }
    
    return { 
      total: points, 
      yuko: totalYuko,
      waza_ari: totalWazaAri,
      ippon: totalIppon,
      keikoku: totalKeikoku,
      firstScoreTime 
    };
  };

  const calculateWinnerFromAllJudges = (scoresData) => {
    if (!akaParticipant || !aoParticipant) return;

    const akaId = akaParticipant._id || akaParticipant;
    const aoId = aoParticipant._id || aoParticipant;

    const akaAggregate = calculateTotalScoreFromJudges(scoresData, akaId);
    const aoAggregate = calculateTotalScoreFromJudges(scoresData, aoId);

    // Check for disqualification
    if (akaAggregate.total === -1) {
      setMatchWinner(aoId);
      return;
    }
    if (aoAggregate.total === -1) {
      setMatchWinner(akaId);
      return;
    }

    // Add opponent points from Keikoku penalties
    const akaFinalScore = akaAggregate.total + (aoAggregate.keikoku || 0);
    const aoFinalScore = aoAggregate.total + (akaAggregate.keikoku || 0);

    // 8-point difference rule (Senshu)
    if (Math.abs(akaFinalScore - aoFinalScore) >= 8) {
      setMatchWinner(akaFinalScore > aoFinalScore ? akaId : aoId);
      return;
    }

    // Higher score wins
    if (akaFinalScore > aoFinalScore) {
      setMatchWinner(akaId);
      return;
    }
    if (aoFinalScore > akaFinalScore) {
      setMatchWinner(aoId);
      return;
    }

    // Tie: Player who scored first wins
    if (akaFinalScore === aoFinalScore) {
      const akaFirstTime = akaAggregate.firstScoreTime;
      const aoFirstTime = aoAggregate.firstScoreTime;
      
      if (akaFirstTime && aoFirstTime) {
        setMatchWinner(akaFirstTime < aoFirstTime ? akaId : aoId);
      } else if (akaFirstTime) {
        setMatchWinner(akaId);
      } else if (aoFirstTime) {
        setMatchWinner(aoId);
      }
    }
  };

  const handleScoreClick = async (judgeId, participantId, scoreType, value) => {
    if (submitting[judgeId]) return;

    setSubmitting(prev => ({ ...prev, [judgeId]: true }));
    try {
      const participant = participants.find(p => (p._id || p) === participantId);
      if (!participant) return;

      // Get current score for this judge and participant
      const currentScore = (scores[judgeId] && scores[judgeId][participantId]) || {
        yuko: 0,
        waza_ari: 0,
        ippon: 0,
        chukoku_cat1: 0,
        keikoku_cat1: 0,
        hansoku_chui_cat1: 0,
        hansoku_cat1: 0,
        chukoku_cat2: 0,
        keikoku_cat2: 0,
        hansoku_chui_cat2: 0,
        hansoku_cat2: 0,
        firstScoreTime: null
      };

      // Update score (increment)
      const updatedScore = { ...currentScore };
      if (scoreType === 'yuko') {
        updatedScore.yuko = (updatedScore.yuko || 0) + value;
      } else if (scoreType === 'waza_ari') {
        updatedScore.waza_ari = (updatedScore.waza_ari || 0) + value;
      } else if (scoreType === 'ippon') {
        updatedScore.ippon = (updatedScore.ippon || 0) + value;
      } else if (scoreType.startsWith('penalty_')) {
        const parts = scoreType.split('_');
        if (parts.length >= 3) {
          const category = parts[1]; // '1' or '2'
          const penaltyType = parts.slice(2).join('_'); // 'chukoku', 'keikoku', etc.
          const key = `${penaltyType}_cat${category}`;
          updatedScore[key] = (updatedScore[key] || 0) + value;
        }
      }

      // Track first score time for tie-breaking
      if (!updatedScore.firstScoreTime && (scoreType === 'yuko' || scoreType === 'waza_ari' || scoreType === 'ippon')) {
        updatedScore.firstScoreTime = new Date();
      }

      const scorePayload = {
        match_id: match._id,
        participant_id: participantId,
        judge_id: judgeId,
        yuko: updatedScore.yuko || 0,
        waza_ari: updatedScore.waza_ari || 0,
        ippon: updatedScore.ippon || 0,
        chukoku: ((updatedScore.chukoku_cat1 || 0) + (updatedScore.chukoku_cat2 || 0)),
        keikoku: ((updatedScore.keikoku_cat1 || 0) + (updatedScore.keikoku_cat2 || 0)),
        hansoku_chui: ((updatedScore.hansoku_chui_cat1 || 0) + (updatedScore.hansoku_chui_cat2 || 0)),
        hansoku: ((updatedScore.hansoku_cat1 || 0) + (updatedScore.hansoku_cat2 || 0)),
        jogai: 0
      };

      await scoreService.submitScore(scorePayload);
      
      // Update local state
      setScores(prev => ({
        ...prev,
        [judgeId]: {
          ...(prev[judgeId] || {}),
          [participantId]: updatedScore
        }
      }));

      // Recalculate winner from all judges
      const newScores = {
        ...scores,
        [judgeId]: {
          ...(scores[judgeId] || {}),
          [participantId]: updatedScore
        }
      };
      calculateWinnerFromAllJudges(newScores);

      toast.success('Score updated');
      if (onScoreUpdate) onScoreUpdate();
    } catch (error) {
      console.error('Error updating score:', error);
      toast.error(error.response?.data?.message || 'Failed to update score');
    } finally {
      setSubmitting(prev => ({ ...prev, [judgeId]: false }));
    }
  };

  const handleFinalizeMatch = async () => {
    if (!matchWinner) {
      toast.error('Please determine a winner first');
      return;
    }

    try {
      await matchService.updateMatch(match._id, {
        winner_id: matchWinner,
        status: 'Completed',
        completed_at: new Date()
      });

      toast.success('Match finalized');
      if (onScoreUpdate) onScoreUpdate();
    } catch (error) {
      console.error('Error finalizing match:', error);
      toast.error('Failed to finalize match');
    }
  };

  const getParticipantName = (participant) => {
    if (!participant) return 'TBD';
    if (participant.player_id?.user_id) {
      const user = participant.player_id.user_id;
      return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Unknown';
    }
    if (participant.team_id) {
      return participant.team_id.team_name || 'Unknown Team';
    }
    return 'TBD';
  };

  const getParticipantScore = (participantId) => {
    // Aggregate scores from all judges
    const aggregate = calculateTotalScoreFromJudges(scores, participantId);
    const opponentId = participantId === (akaParticipant?._id || akaParticipant)
      ? (aoParticipant?._id || aoParticipant)
      : (akaParticipant?._id || akaParticipant);
    const opponentAggregate = calculateTotalScoreFromJudges(scores, opponentId);
    
    // Add opponent Keikoku points
    const finalScore = aggregate.total === -1 ? -1 : aggregate.total + (opponentAggregate.keikoku || 0);
    
    return {
      ...aggregate,
      total: finalScore,
      displayTotal: finalScore === -1 ? 'DQ' : finalScore
    };
  };

  const getJudgeName = (judge) => {
    if (!judge) return 'Unknown Judge';
    const judgeData = judge.judge_id || judge;
    const user = judgeData.user_id || {};
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.username || 'Judge';
  };

  const getJudgeScore = (judgeId, participantId) => {
    if (!scores[judgeId] || !scores[judgeId][participantId]) {
      return {
        yuko: 0,
        waza_ari: 0,
        ippon: 0,
        chukoku_cat1: 0,
        keikoku_cat1: 0,
        hansoku_chui_cat1: 0,
        hansoku_cat1: 0,
        chukoku_cat2: 0,
        keikoku_cat2: 0,
        hansoku_chui_cat2: 0,
        hansoku_cat2: 0
      };
    }
    return scores[judgeId][participantId];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const akaId = akaParticipant?._id || akaParticipant;
  const aoId = aoParticipant?._id || aoParticipant;
  const akaScore = getParticipantScore(akaId);
  const aoScore = getParticipantScore(aoId);
  const akaIsWinner = matchWinner === akaId;
  const aoIsWinner = matchWinner === aoId;

  if (judges.length === 0) {
    return (
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white p-4">
        <div className="bg-gray-800 text-white px-4 py-2 text-center font-semibold mb-4">
          {match.match_name || match.match_level}
        </div>
        <p className="text-center text-gray-600">No judges assigned to this match yet.</p>
      </div>
    );
  }

  return (
    <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
      {/* Match Header */}
      <div className="bg-gray-800 text-white px-4 py-2 text-center font-semibold">
        {match.match_name || match.match_level}
      </div>

      {/* Players Header */}
      <div className="grid grid-cols-2 divide-x divide-gray-300 bg-gray-100">
        <div className="p-3 text-center bg-red-50">
          <div className="inline-block bg-red-600 text-white px-4 py-1 rounded font-bold text-sm mb-1">
            AKA (Red)
          </div>
          <h3 className="font-bold text-lg text-gray-800">{getParticipantName(akaParticipant)}</h3>
          {akaParticipant?.player_id?.belt_rank && (
            <p className="text-xs text-gray-600">Belt: {akaParticipant.player_id.belt_rank}</p>
          )}
        </div>
        <div className="p-3 text-center bg-blue-50">
          <div className="inline-block bg-blue-600 text-white px-4 py-1 rounded font-bold text-sm mb-1">
            AO (Blue)
          </div>
          <h3 className="font-bold text-lg text-gray-800">{getParticipantName(aoParticipant)}</h3>
          {aoParticipant?.player_id?.belt_rank && (
            <p className="text-xs text-gray-600">Belt: {aoParticipant.player_id.belt_rank}</p>
          )}
        </div>
      </div>

      {/* Total Score Display */}
      <div className="grid grid-cols-2 divide-x divide-gray-300 bg-gray-50 border-b border-gray-300">
        <div className="p-3 text-center">
          <div className="text-3xl font-bold text-gray-800">{akaScore.displayTotal}</div>
          <div className="text-xs text-gray-600 mt-1">
            Y: {akaScore.yuko || 0} W: {akaScore.waza_ari || 0} I: {akaScore.ippon || 0}
          </div>
        </div>
        <div className="p-3 text-center">
          <div className="text-3xl font-bold text-gray-800">{aoScore.displayTotal}</div>
          <div className="text-xs text-gray-600 mt-1">
            Y: {aoScore.yuko || 0} W: {aoScore.waza_ari || 0} I: {aoScore.ippon || 0}
          </div>
        </div>
      </div>

      {/* Judges with Scoring Buttons */}
      <div className="divide-y divide-gray-200">
        {judges.map((judge, judgeIndex) => {
          const judgeId = judge.judge_id?._id || judge.judge_id || judge._id;
          const judgeName = getJudgeName(judge);
          const judgeRole = judge.judge_role || 'Judge';
          const akaJudgeScore = getJudgeScore(judgeId, akaId);
          const aoJudgeScore = getJudgeScore(judgeId, aoId);
          const isSubmitting = submitting[judgeId] || false;

          return (
            <div key={judgeId || judgeIndex} className="p-4 bg-white hover:bg-gray-50">
              {/* Judge Header */}
              <div className="mb-3 pb-2 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700">
                      {judgeIndex + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">{judgeName}</h4>
                      <p className="text-xs text-gray-500">{judgeRole}</p>
                    </div>
                  </div>
                  {/* Judge Flag/Identifier - can be enhanced later */}
                  <div className="text-xs text-gray-500">Judge {judgeIndex + 1}</div>
                </div>
              </div>

              {/* Scoring Buttons for Both Players */}
              <div className="grid grid-cols-2 gap-4">
                {/* AKA Scoring */}
                <div className="border-2 border-red-200 rounded-lg p-3 bg-red-50">
                  <div className="text-center mb-2">
                    <span className="text-xs font-semibold text-red-700">AKA</span>
                    <div className="text-sm font-bold text-gray-800 mt-1">
                      Y: {akaJudgeScore.yuko} W: {akaJudgeScore.waza_ari} I: {akaJudgeScore.ippon}
                    </div>
                  </div>
                  
                  {/* Scoring Buttons */}
                  <div className="grid grid-cols-3 gap-1 mb-2">
                    <button
                      onClick={() => handleScoreClick(judgeId, akaId, 'yuko', 1)}
                      disabled={isSubmitting}
                      className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 disabled:opacity-50 font-semibold"
                    >
                      Yuko
                    </button>
                    <button
                      onClick={() => handleScoreClick(judgeId, akaId, 'waza_ari', 1)}
                      disabled={isSubmitting}
                      className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600 disabled:opacity-50 font-semibold"
                    >
                      Waza-ari
                    </button>
                    <button
                      onClick={() => handleScoreClick(judgeId, akaId, 'ippon', 1)}
                      disabled={isSubmitting}
                      className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 disabled:opacity-50 font-semibold"
                    >
                      Ippon
                    </button>
                  </div>

                  {/* Penalties */}
                  <div className="space-y-1">
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => handleScoreClick(judgeId, akaId, 'penalty_1_chukoku', 1)}
                        disabled={isSubmitting}
                        className="bg-orange-200 text-orange-800 px-1 py-0.5 rounded text-xs hover:bg-orange-300 disabled:opacity-50"
                      >
                        C1
                      </button>
                      <button
                        onClick={() => handleScoreClick(judgeId, akaId, 'penalty_1_keikoku', 1)}
                        disabled={isSubmitting}
                        className="bg-orange-300 text-orange-900 px-1 py-0.5 rounded text-xs hover:bg-orange-400 disabled:opacity-50"
                      >
                        K1
                      </button>
                      <button
                        onClick={() => handleScoreClick(judgeId, akaId, 'penalty_2_chukoku', 1)}
                        disabled={isSubmitting}
                        className="bg-orange-200 text-orange-800 px-1 py-0.5 rounded text-xs hover:bg-orange-300 disabled:opacity-50"
                      >
                        C2
                      </button>
                      <button
                        onClick={() => handleScoreClick(judgeId, akaId, 'penalty_2_keikoku', 1)}
                        disabled={isSubmitting}
                        className="bg-orange-300 text-orange-900 px-1 py-0.5 rounded text-xs hover:bg-orange-400 disabled:opacity-50"
                      >
                        K2
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => handleScoreClick(judgeId, akaId, 'penalty_1_hansoku_chui', 1)}
                        disabled={isSubmitting}
                        className="bg-red-200 text-red-800 px-1 py-0.5 rounded text-xs hover:bg-red-300 disabled:opacity-50"
                      >
                        HC1
                      </button>
                      <button
                        onClick={() => handleScoreClick(judgeId, akaId, 'penalty_1_hansoku', 1)}
                        disabled={isSubmitting}
                        className="bg-red-500 text-white px-1 py-0.5 rounded text-xs hover:bg-red-600 disabled:opacity-50"
                      >
                        H1
                      </button>
                      <button
                        onClick={() => handleScoreClick(judgeId, akaId, 'penalty_2_hansoku_chui', 1)}
                        disabled={isSubmitting}
                        className="bg-red-200 text-red-800 px-1 py-0.5 rounded text-xs hover:bg-red-300 disabled:opacity-50"
                      >
                        HC2
                      </button>
                      <button
                        onClick={() => handleScoreClick(judgeId, akaId, 'penalty_2_hansoku', 1)}
                        disabled={isSubmitting}
                        className="bg-red-500 text-white px-1 py-0.5 rounded text-xs hover:bg-red-600 disabled:opacity-50"
                      >
                        H2
                      </button>
                    </div>
                  </div>
                </div>

                {/* AO Scoring */}
                <div className="border-2 border-blue-200 rounded-lg p-3 bg-blue-50">
                  <div className="text-center mb-2">
                    <span className="text-xs font-semibold text-blue-700">AO</span>
                    <div className="text-sm font-bold text-gray-800 mt-1">
                      Y: {aoJudgeScore.yuko} W: {aoJudgeScore.waza_ari} I: {aoJudgeScore.ippon}
                    </div>
                  </div>
                  
                  {/* Scoring Buttons */}
                  <div className="grid grid-cols-3 gap-1 mb-2">
                    <button
                      onClick={() => handleScoreClick(judgeId, aoId, 'yuko', 1)}
                      disabled={isSubmitting}
                      className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 disabled:opacity-50 font-semibold"
                    >
                      Yuko
                    </button>
                    <button
                      onClick={() => handleScoreClick(judgeId, aoId, 'waza_ari', 1)}
                      disabled={isSubmitting}
                      className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600 disabled:opacity-50 font-semibold"
                    >
                      Waza-ari
                    </button>
                    <button
                      onClick={() => handleScoreClick(judgeId, aoId, 'ippon', 1)}
                      disabled={isSubmitting}
                      className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 disabled:opacity-50 font-semibold"
                    >
                      Ippon
                    </button>
                  </div>

                  {/* Penalties */}
                  <div className="space-y-1">
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => handleScoreClick(judgeId, aoId, 'penalty_1_chukoku', 1)}
                        disabled={isSubmitting}
                        className="bg-orange-200 text-orange-800 px-1 py-0.5 rounded text-xs hover:bg-orange-300 disabled:opacity-50"
                      >
                        C1
                      </button>
                      <button
                        onClick={() => handleScoreClick(judgeId, aoId, 'penalty_1_keikoku', 1)}
                        disabled={isSubmitting}
                        className="bg-orange-300 text-orange-900 px-1 py-0.5 rounded text-xs hover:bg-orange-400 disabled:opacity-50"
                      >
                        K1
                      </button>
                      <button
                        onClick={() => handleScoreClick(judgeId, aoId, 'penalty_2_chukoku', 1)}
                        disabled={isSubmitting}
                        className="bg-orange-200 text-orange-800 px-1 py-0.5 rounded text-xs hover:bg-orange-300 disabled:opacity-50"
                      >
                        C2
                      </button>
                      <button
                        onClick={() => handleScoreClick(judgeId, aoId, 'penalty_2_keikoku', 1)}
                        disabled={isSubmitting}
                        className="bg-orange-300 text-orange-900 px-1 py-0.5 rounded text-xs hover:bg-orange-400 disabled:opacity-50"
                      >
                        K2
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => handleScoreClick(judgeId, aoId, 'penalty_1_hansoku_chui', 1)}
                        disabled={isSubmitting}
                        className="bg-red-200 text-red-800 px-1 py-0.5 rounded text-xs hover:bg-red-300 disabled:opacity-50"
                      >
                        HC1
                      </button>
                      <button
                        onClick={() => handleScoreClick(judgeId, aoId, 'penalty_1_hansoku', 1)}
                        disabled={isSubmitting}
                        className="bg-red-500 text-white px-1 py-0.5 rounded text-xs hover:bg-red-600 disabled:opacity-50"
                      >
                        H1
                      </button>
                      <button
                        onClick={() => handleScoreClick(judgeId, aoId, 'penalty_2_hansoku_chui', 1)}
                        disabled={isSubmitting}
                        className="bg-red-200 text-red-800 px-1 py-0.5 rounded text-xs hover:bg-red-300 disabled:opacity-50"
                      >
                        HC2
                      </button>
                      <button
                        onClick={() => handleScoreClick(judgeId, aoId, 'penalty_2_hansoku', 1)}
                        disabled={isSubmitting}
                        className="bg-red-500 text-white px-1 py-0.5 rounded text-xs hover:bg-red-600 disabled:opacity-50"
                      >
                        H2
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Winner Display */}
      {(akaIsWinner || aoIsWinner) && (
        <div className="bg-green-50 border-t-2 border-green-300 p-3 text-center">
          <span className="text-green-700 font-bold">
            🏆 Winner: {akaIsWinner ? getParticipantName(akaParticipant) : getParticipantName(aoParticipant)}
          </span>
        </div>
      )}

      {/* Match Footer - Finalize Button */}
      {matchWinner && match.status !== 'Completed' && (
        <div className="bg-gray-100 px-4 py-3 border-t border-gray-300">
          <button
            onClick={handleFinalizeMatch}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold"
          >
            <FiCheck className="inline mr-2" />
            Finalize Match
          </button>
        </div>
      )}
    </div>
  );
};

export default KumiteMatchScoring;

