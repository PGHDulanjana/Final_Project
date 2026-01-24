const request = require('supertest');
const app = require('../../src/app');
const Score = require('../../src/models/Score');
const Match = require('../../src/models/Match');
const MatchJudge = require('../../src/models/MatchJudge');
const Judge = require('../../src/models/Judge');
const Tournament = require('../../src/models/Tournament');
const TournamentCategory = require('../../src/models/TournamentCategory');
const MatchParticipant = require('../../src/models/MatchParticipant');
const Organizer = require('../../src/models/Organizer');
const User = require('../../src/models/User');
const { createTestUser } = require('../helpers');

describe('Score Controller Integration Tests', () => {
    let judgeUser, judgeToken, judgeProfile;
    let organizerUser, organizerToken, organizerProfile;
    let match, participant;
    let tournament, category;

    beforeEach(async () => {
        // 1. Create Judge
        const judgeData = await createTestUser({
            username: 'score_judge',
            email: 'score_judge@example.com',
            user_type: 'Judge'
        });
        judgeUser = judgeData.user;
        judgeToken = judgeData.token;

        judgeProfile = await Judge.create({
            user_id: judgeUser._id,
            certification_level: 'National',
            experience_years: 5
        });

        // 2. Create Organizer
        const orgData = await createTestUser({
            username: 'score_organizer',
            email: 'score_org@example.com',
            user_type: 'Organizer'
        });
        organizerUser = orgData.user;
        organizerToken = orgData.token;

        organizerProfile = await Organizer.create({
            user_id: organizerUser._id,
            organization_name: 'Score league',
            license_number: 'SCORE123'
        });

        // 3. Create Tournament & Category
        tournament = await Tournament.create({
            organizer_id: organizerProfile._id,
            tournament_name: 'Score Tournament',
            start_date: new Date(Date.now() + 86400000),
            end_date: new Date(Date.now() + 172800000),
            registration_deadline: new Date(Date.now() + 43200000),
            venue: 'Score Venue',
            venue_address: 'Score Address',
            status: 'Open'
        });

        category = await TournamentCategory.create({
            tournament_id: tournament._id,
            category_name: 'Score Category',
            category_type: 'Kumite',
            age_category: 'Senior',
            gender: 'Male',
            participation_type: 'Individual'
        });

        // 4. Create Match
        match = await Match.create({
            tournament_id: tournament._id,
            category_id: category._id,
            match_name: 'Final',
            match_type: 'Kumite',
            match_level: 'Final',
            scheduled_time: new Date(Date.now() + 90000000),
            status: 'Scheduled'
        });

        // 5. Assign Judge to Match
        await MatchJudge.create({
            match_id: match._id,
            judge_id: judgeProfile._id,
            judge_role: 'Judge',
            can_score: true
        });

        // 6. Create Participant
        const playerData = await createTestUser({
            username: 'score_player',
            email: 'score_player@example.com',
            user_type: 'Player'
        });

        participant = await MatchParticipant.create({
            match_id: match._id,
            participant_type: 'Individual',
            player_id: new (require('mongoose').Types.ObjectId)(),
            team_id: null
        });
    });

    describe('POST /api/scores', () => {
        it('should submit a score as assigned judge', async () => {
            const scoreData = {
                match_id: match._id,
                participant_id: participant._id,
                yuko: 1,
                waza_ari: 0,
                ippon: 0
            };

            const res = await request(app)
                .post('/api/scores')
                .set('Authorization', `Bearer ${judgeToken}`)
                .send(scoreData);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.final_score).toBe(1); // 1 Yuko = 1 point
        });

        it('should fail if judge is not assigned', async () => {
            // Create another judge
            const otherJudgeData = await createTestUser({ username: 'other_judge', email: 'other@judge.com', user_type: 'Judge' });
            await Judge.create({ user_id: otherJudgeData.user._id, certification_level: 'National', experience_years: 1 });

            const res = await request(app)
                .post('/api/scores')
                .set('Authorization', `Bearer ${otherJudgeData.token}`)
                .send({
                    match_id: match._id,
                    participant_id: participant._id,
                    yuko: 1
                });

            expect(res.statusCode).toBe(403);
        });

        it('should allow organizer to submit score for a judge', async () => {
            const scoreData = {
                match_id: match._id,
                participant_id: participant._id,
                judge_id: judgeProfile._id,
                yuko: 0,
                waza_ari: 1, // 2 points
                ippon: 0
            };

            const res = await request(app)
                .post('/api/scores')
                .set('Authorization', `Bearer ${organizerToken}`)
                .send(scoreData);

            expect(res.statusCode).toBe(201);
            expect(res.body.data.final_score).toBe(2);
        });
    });

    describe('GET /api/scores', () => {
        it('should get scores for a match', async () => {
            await Score.create({
                match_id: match._id,
                participant_id: participant._id,
                judge_id: judgeProfile._id,
                final_score: 3,
                technical_score: 3,
                performance_score: 3
            });

            const res = await request(app)
                .get(`/api/scores?match_id=${match._id}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.length).toBe(1);
        });
    });
});
