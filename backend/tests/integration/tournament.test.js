const request = require('supertest');
const app = require('../../src/app');
const Tournament = require('../../src/models/Tournament');
const Organizer = require('../../src/models/Organizer');
const { createTestUser } = require('../helpers');

describe('Tournament Controller Tests', () => {
    let organizerUser;
    let organizerToken;
    let otherUser;
    let otherToken;

    beforeEach(async () => {
        // Create an organizer user
        const orgData = await createTestUser({
            username: 'organizer',
            email: 'organizer@example.com',
            user_type: 'Organizer'
        });
        organizerUser = orgData.user;
        organizerToken = orgData.token;

        // Create a regular user (Player)
        const userData = await createTestUser({
            username: 'player',
            email: 'player@example.com',
            user_type: 'Player'
        });
        otherUser = userData.user;
        otherToken = userData.token;
    });

    describe('POST /api/tournaments', () => {
        it('should create a tournament as organizer', async () => {
            const tournamentData = {
                tournament_name: 'Test Tournament',
                start_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
                end_date: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
                registration_deadline: new Date(Date.now() + 43200000).toISOString(), // +12 hours (before start date)
                venue: 'Test Venue',
                venue_address: '123 Test St',
                status: 'Open'
            };

            const res = await request(app)
                .post('/api/tournaments')
                .set('Authorization', `Bearer ${organizerToken}`)
                .send(tournamentData);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.tournament_name).toBe(tournamentData.tournament_name);

            // Verify organizer profile was created/linked
            const savedTournament = await Tournament.findById(res.body.data._id);
            expect(savedTournament).toBeTruthy();
            expect(savedTournament.organizer_id).toBeDefined();
        });

        it('should fail to create tournament as regular user', async () => {
            const tournamentData = {
                tournament_name: 'Fail Test Tournament',
                start_date: new Date(Date.now() + 86400000).toISOString(),
                end_date: new Date(Date.now() + 172800000).toISOString(),
                registration_deadline: new Date(Date.now() + 43200000).toISOString(),
                venue: 'Fail Venue',
                venue_address: 'Fail Address',
                status: 'Open'
            };

            const res = await request(app)
                .post('/api/tournaments')
                .set('Authorization', `Bearer ${otherToken}`)
                .send(tournamentData);

            expect(res.statusCode).toBe(403);
        });
    });

    describe('GET /api/tournaments', () => {
        it('should get all tournaments', async () => {
            // Create a dummy tournament
            await Tournament.create({
                organizer_id: (await Organizer.create({ user_id: organizerUser._id, organization_name: 'Org', license_number: '123' }))._id,
                tournament_name: 'Get Test Tournament',
                start_date: new Date(),
                end_date: new Date(),
                registration_deadline: new Date(),
                venue: 'Venue',
                venue_address: 'Address',
                status: 'Open'
            });

            const res = await request(app)
                .get('/api/tournaments');

            expect(res.statusCode).toBe(200);
            expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    describe('GET /api/tournaments/:id', () => {
        it('should get a single tournament', async () => {
            // Create organizer and tournament
            const org = await Organizer.create({ user_id: organizerUser._id, organization_name: 'Org', license_number: '1234' });
            const tournament = await Tournament.create({
                tournament_name: 'Single Test',
                start_date: new Date(Date.now() + 86400000),
                end_date: new Date(Date.now() + 172800000),
                registration_deadline: new Date(Date.now() + 43200000),
                venue: 'Venue',
                venue_address: 'Address',
                status: 'Draft',
                organizer_id: org._id
            });

            const res = await request(app)
                .get(`/api/tournaments/${tournament._id}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data._id).toBe(tournament._id.toString());
        });
    });

    describe('PUT /api/tournaments/:id', () => {
        it('should update tournament as owner', async () => {
            // Create via endpoint to ensure proper linking for the test user
            const createRes = await request(app)
                .post('/api/tournaments')
                .set('Authorization', `Bearer ${organizerToken}`)
                .send({
                    tournament_name: 'Original Name',
                    start_date: new Date(Date.now() + 86400000),
                    end_date: new Date(Date.now() + 172800000),
                    registration_deadline: new Date(Date.now() + 43200000),
                    venue: 'Venue',
                    venue_address: 'Address'
                });

            const tournamentId = createRes.body.data._id;

            const res = await request(app)
                .put(`/api/tournaments/${tournamentId}`)
                .set('Authorization', `Bearer ${organizerToken}`)
                .send({ tournament_name: 'Updated Name' });

            expect(res.statusCode).toBe(200);
            expect(res.body.data.tournament_name).toBe('Updated Name');
        });
    });

    describe('DELETE /api/tournaments/:id', () => {
        it('should delete tournament as owner', async () => {
            const createRes = await request(app)
                .post('/api/tournaments')
                .set('Authorization', `Bearer ${organizerToken}`)
                .send({
                    tournament_name: 'To Delete',
                    start_date: new Date(Date.now() + 86400000),
                    end_date: new Date(Date.now() + 172800000),
                    registration_deadline: new Date(Date.now() + 43200000),
                    venue: 'Venue',
                    venue_address: 'Address'
                });

            const tournamentId = createRes.body.data._id;

            const res = await request(app)
                .delete(`/api/tournaments/${tournamentId}`)
                .set('Authorization', `Bearer ${organizerToken}`);

            expect(res.statusCode).toBe(200);

            const check = await Tournament.findById(tournamentId);
            expect(check).toBeNull();
        });
    });
});
