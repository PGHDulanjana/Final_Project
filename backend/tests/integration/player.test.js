const request = require('supertest');
const app = require('../../src/app');
const Player = require('../../src/models/Player');
const User = require('../../src/models/User');
const { createTestUser, createAdminUser } = require('../helpers');

describe('Player Controller Tests', () => {
    let playerUser, playerToken;
    let otherUser, otherToken;
    let adminUser, adminToken;

    beforeEach(async () => {
        // Player User
        const pData = await createTestUser({
            username: 'player_ctrl_test',
            email: 'player_ctrl@example.com',
            user_type: 'Player'
        });
        playerUser = pData.user;
        playerToken = pData.token;

        // Other User
        const oData = await createTestUser({
            username: 'other_player',
            email: 'other@example.com',
            user_type: 'Player'
        });
        otherUser = oData.user;
        otherToken = oData.token;

        // Admin User
        const aData = await createAdminUser();
        adminUser = aData.user;
        adminToken = aData.token;
    });

    describe('POST /api/players', () => {
        it('should create player profile', async () => {
            const playerData = {
                date_of_birth: new Date('2000-01-01').toISOString(),
                gender: 'Male',
                belt_rank: 'Black',
                weight: 75,
                height: 180,
                dojo_name: 'Test Dojo'
            };

            const res = await request(app)
                .post('/api/players')
                .set('Authorization', `Bearer ${playerToken}`)
                .send(playerData);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.dojo_name).toBe('Test Dojo');
            expect(res.body.data.user_id).toBe(playerUser._id.toString());
        });

        it('should prevent duplicate profile', async () => {
            await Player.create({
                user_id: playerUser._id,
                date_of_birth: new Date(),
                gender: 'Female'
            });

            const res = await request(app)
                .post('/api/players')
                .set('Authorization', `Bearer ${playerToken}`)
                .send({ gender: 'Male' });

            expect(res.statusCode).toBe(400);
        });
    });

    describe('GET /api/players', () => {
        it('should list players', async () => {
            await Player.create({ user_id: playerUser._id, gender: 'Male' });
            await Player.create({ user_id: otherUser._id, gender: 'Female' });

            const res = await request(app).get('/api/players');

            expect(res.statusCode).toBe(200);
            expect(res.body.count).toBeGreaterThanOrEqual(2);
        });
    });

    describe('GET /api/players/:id', () => {
        it('should get single player', async () => {
            const player = await Player.create({ user_id: playerUser._id, gender: 'Male' });

            const res = await request(app).get(`/api/players/${player._id}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data._id).toBe(player._id.toString());
        });
    });

    describe('PUT /api/players/:id', () => {
        it('should update own profile', async () => {
            const player = await Player.create({ user_id: playerUser._id, gender: 'Male', belt_rank: 'White' });

            const res = await request(app)
                .put(`/api/players/${player._id}`)
                .set('Authorization', `Bearer ${playerToken}`)
                .send({ belt_rank: 'Yellow' });

            expect(res.statusCode).toBe(200);
            expect(res.body.data.belt_rank).toBe('Yellow');
        });

        it('should fail to update others profile', async () => {
            const player = await Player.create({ user_id: playerUser._id, gender: 'Male' });

            const res = await request(app)
                .put(`/api/players/${player._id}`)
                .set('Authorization', `Bearer ${otherToken}`)
                .send({ belt_rank: 'Green' });

            expect(res.statusCode).toBe(403);
        });
    });

    describe('DELETE /api/players/:id', () => {
        it('should allow admin to delete player', async () => {
            const player = await Player.create({ user_id: playerUser._id, gender: 'Male' });

            const res = await request(app)
                .delete(`/api/players/${player._id}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);

            const check = await Player.findById(player._id);
            expect(check).toBeNull();
        });

        it('should prevent regular user from deleting', async () => {
            const player = await Player.create({ user_id: playerUser._id, gender: 'Male' });

            const res = await request(app)
                .delete(`/api/players/${player._id}`)
                .set('Authorization', `Bearer ${playerToken}`);

            expect(res.statusCode).toBe(403);
        });
    });
});
