const request = require('supertest');
const app = require('../../src/app');
const mongoose = require('mongoose');
const { createTestUser, createAdminUser } = require('../helpers');

describe('User Controller Integration Tests', () => {
    let admin, adminToken;
    let user, userToken;

    beforeEach(async () => {
        const adminData = await createAdminUser();
        admin = adminData.user;
        adminToken = adminData.token;

        const userData = await createTestUser();
        user = userData.user;
        userToken = userData.token;
    });

    describe('GET /api/users', () => {
        it('should allow admin to get all users', async () => {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.count).toBeGreaterThanOrEqual(2); // Admin + User
        });

        it('should deny non-admin users', async () => {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.statusCode).toBe(403);
        });
    });

    describe('GET /api/users/:id', () => {
        it('should get user by id', async () => {
            const res = await request(app)
                .get(`/api/users/${user._id}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data._id).toBe(user._id.toString());
        });

        it('should return 404 for non-existent user', async () => {
            // Generate a valid mongoose ID that doesn't exist
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .get(`/api/users/${fakeId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(404);
        });
    });

    describe('PUT /api/users/:id', () => {
        it('should allow user to update their own profile', async () => {
            const res = await request(app)
                .put(`/api/users/${user._id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    first_name: 'UpdatedName'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.data.first_name).toBe('UpdatedName');
        });

        it('should deny user updating another user', async () => {
            const res = await request(app)
                .put(`/api/users/${admin._id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    first_name: 'Hacked'
                });

            expect(res.statusCode).toBe(403);
        });
    });

    describe('DELETE /api/users/:id', () => {
        it('should allow admin to delete a user', async () => {
            const res = await request(app)
                .delete(`/api/users/${user._id}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toMatch(/deleted successfully/i);
        });

        it('should deny non-admin from deleting users', async () => {
            const res = await request(app)
                .delete(`/api/users/${admin._id}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.statusCode).toBe(403);
        });
    });
});
