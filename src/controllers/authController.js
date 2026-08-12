/**
 * Authentication controller - handles HTTP request/response
 * for registration and login endpoints.
 */

const authService = require('../services/authService');

/**
 * POST /api/auth/register
 * Body: { email, password }
 */
async function register(req, res, next) {
  try {
    const { email, password } = req.body;

    const result = await authService.register(email, password);

    res.status(201).json({
      message: 'User registered successfully',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    next(error);  // Passe l'erreur au errorHandler middleware
  }
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    res.json({
      message: 'Login successful',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    next(error);  // Passe l'erreur au errorHandler middleware
  }
}

module.exports = {
  register,
  login
};
