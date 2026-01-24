const User = require('../src/models/User');
const { generateToken } = require('../src/utils/generateToken');

const createTestUser = async (overrides = {}) => {
    const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'password123',
        first_name: 'Test',
        last_name: 'User',
        user_type: 'Player',
        ...overrides
    };

    const user = await User.create(userData);
    const token = generateToken(user._id, user.user_type);

    return { user, token };
};

const createAdminUser = async (overrides = {}) => {
    return createTestUser({
        username: 'adminuser',
        email: 'admin@example.com',
        user_type: 'Admin',
        ...overrides
    });
};

module.exports = {
    createTestUser,
    createAdminUser
};
