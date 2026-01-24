const request = require('supertest');
const app = require('../../src/app');
const Match = require('../../src/models/Match');
const Tournament = require('../../src/models/Tournament');
const TournamentCategory = require('../../src/models/TournamentCategory');
const Organizer = require('../../src/models/Organizer');
const { createTestUser } = require('../helpers');

describe('Match Controller Tests', () => {
    let organizerUser, organizerToken;
    let tournament, category;

    beforeEach(async () => {
        // 1. Setup Organizer
        const orgData = await createTestUser({
            username: 'match_organizer',
            email: 'match_org@example.com',
            user_type: 'Organizer'
        });
        organizerUser = orgData.user;
        organizerToken = orgData.token;

        // Create Organizer profile
        const organizerProfile = await Organizer.create({
            user_id: organizerUser._id,
            organization_name: 'Match Org',
            license_number: 'MATCH123'
        });

        // 2. Create Tournament
        tournament = await Tournament.create({
            organizer_id: organizerProfile._id,
            tournament_name: 'Match Tournament',
            start_date: new Date(Date.now() + 86400000),
            end_date: new Date(Date.now() + 172800000),
            registration_deadline: new Date(Date.now() + 43200000),
            venue: 'Match Venue',
            venue_address: 'Match Address',
            status: 'Open'
        });

        // 3. Create Category
        category = await TournamentCategory.create({
            tournament_id: tournament._id,
            category_name: 'Men Kumite',
            category_type: 'Kumite',
            age_category: 'Senior',
            gender: 'Male',
            participation_type: 'Individual'
        });
    });

    describe('POST /api/matches', () => {
        it('should create a match', async () => {
            const matchData = {
                tournament_id: tournament._id,
                category_id: category._id,
                match_name: 'Match 1',
                match_type: 'Kumite',
                match_level: 'Preliminary',
                scheduled_time: new Date().toISOString(),
                venue_area: 'Mat A',
                status: 'Scheduled'
            };

            const res = await request(app)
                .post('/api/matches')
                .set('Authorization', `Bearer ${organizerToken}`)
                .send(matchData);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.match_name).toBe('Match 1');

            const savedMatch = await Match.findById(res.body.data._id);
            expect(savedMatch).toBeTruthy();
        });
    });

    describe('GET /api/matches', () => {
        it('should get all matches and filter by tournament', async () => {
            // Create matches in different tournaments
            const otherTournament = await Tournament.create({
                organizer_id: organizerUser._id, // reuse same organizer or create new
                tournament_name: 'Other Tournament',
                start_date: new Date(Date.now() + 86400000),
                end_date: new Date(Date.now() + 172800000),
                registration_deadline: new Date(Date.now() + 43200000),
                venue: 'Other Venue',
                venue_address: 'Other Address',
                status: 'Open'
            });

            await Match.create({
                tournament_id: tournament._id,
                category_id: category._id,
                match_name: 'Target Match',
                match_type: 'Kumite',
                match_level: 'Preliminary',
                scheduled_time: new Date(),
                status: 'Scheduled'
            });

            await Match.create({
                tournament_id: otherTournament._id,
                category_id: category._id,
                match_name: 'Other Match',
                match_type: 'Kumite',
                match_level: 'Preliminary',
                scheduled_time: new Date(),
                status: 'Scheduled'
            });

            // Filter by first tournament
            const res = await request(app)
                .get(`/api/matches?tournament_id=${tournament._id}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].match_name).toBe('Target Match');
        });

        it('should filter matches by status', async () => {
            await Match.create({
                tournament_id: tournament._id,
                category_id: category._id,
                match_name: 'Scheduled Match',
                match_type: 'Kumite',
                match_level: 'Preliminary',
                scheduled_time: new Date(),
                status: 'Scheduled'
            });
            await Match.create({
                tournament_id: tournament._id,
                category_id: category._id,
                match_name: 'Completed Match',
                match_type: 'Kumite',
                match_level: 'Preliminary',
                scheduled_time: new Date(),
                status: 'Completed'
            });

            const res = await request(app)
                .get('/api/matches?status=Completed');

            expect(res.statusCode).toBe(200);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].match_name).toBe('Completed Match');
        });
    });

    describe('GET /api/matches/:id', () => {
        it('should get a single match', async () => {
            const match = await Match.create({
                tournament_id: tournament._id,
                category_id: category._id,
                match_name: 'Single Match',
                match_type: 'Kumite',
                match_level: 'Final',
                scheduled_time: new Date(),
                status: 'Scheduled'
            });

            const res = await request(app)
                .get(`/api/matches/${match._id}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.match_name).toBe('Single Match');
        });
    });

    describe('PUT /api/matches/:id', () => {
        it('should update a match', async () => {
            const match = await Match.create({
                tournament_id: tournament._id,
                category_id: category._id,
                match_name: 'To Update',
                match_type: 'Kumite',
                match_level: 'Preliminary',
                scheduled_time: new Date(),
                status: 'Scheduled'
            });

            const res = await request(app)
                .put(`/api/matches/${match._id}`)
                .set('Authorization', `Bearer ${organizerToken}`)
                .send({ status: 'Completed' });

            expect(res.statusCode).toBe(200);
            expect(res.body.data.status).toBe('Completed');
        });
    });

    describe('DELETE /api/matches/:id', () => {
        it('should delete a match', async () => {
            const match = await Match.create({
                tournament_id: tournament._id,
                category_id: category._id,
                match_name: 'To Delete',
                match_type: 'Kumite',
                match_level: 'Preliminary',
                scheduled_time: new Date(),
                status: 'Scheduled'
            });

            const res = await request(app)
                .delete(`/api/matches/${match._id}`)
                .set('Authorization', `Bearer ${organizerToken}`);

            expect(res.statusCode).toBe(200);

            const check = await Match.findById(match._id);
            expect(check).toBeNull();
        });
    });
});
