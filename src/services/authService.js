/**
 * Authentication service - handles registration, login, and account security.
 * Uses bcrypt for password hashing and JWT for token generation.
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getRedisClient } = require('../config/redis');
const { validateEmail, validatePassword } = require('../utils/validators');
const { ValidationError, UnauthorizedError, ConflictError, RateLimitError } = require('../utils/errors');
const logger = require('../utils/logger');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_REGISTRATION_EXPIRY = '24h';
const JWT_LOGIN_EXPIRY = '60m';

//Rate limiting config
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_SECONDS = 30 * 60;
const ATTEMPT_WINDOW_SECONDS = 15 * 60;

/**
 * Inscrit un nouvel utilisateur
 */
async function register(email, password) {
   // 1. Valider les entrées
   const emailCheck = validateEmail(email);
   if(!emailCheck.valid){
      throw new ValidationError(emailCheck.error, { field: 'email' });
   }

   const passwordCheck = validatePassword(password);
   if(!passwordCheck.valid){
      throw new ValidationError(passwordCheck.error, { field: 'password' });
   }
   // 2. Verifier si l'email existe deja
   const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
   if (existingUser) {
    throw new ConflictError('Email already registered');
  }

  // 3. Hasher le mot de passe
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // 4. Créer l'utilisateur en DB
  const user = await User.create({
   email: email.trim().toLowerCase(),
   passwordHash,
   displayName: email.split('@')[0]
  });

  // 5. Générer le JWT
  const token = generateToken(user, JWT_REGISTRATION_EXPIRY);

  logger.info('User registered', { userId: user._id, email: user.email });

  return {
   user: formatUserProfile(user),
   token
  };
}

/**
 * Connecte un utilisateur existant
 */
async function login(email, password) {
   // 1. valider les entrées
   if(!email || !password){
      throw new ValidationError('Email and Password are required');
   }

   const normalizedEmail = email.trim().toLowerCase();

   // 2. Verifier si le compte est verrouillé
   const isLocked = await checkAccountLock(normalizedEmail);
   if (isLocked) {
      throw new RateLimitError('Account temporarily locked. Please try again later.');
   }

   // 3. Chercher l'utilisateur
   const user = await User.findOne({ email: normalizedEmail });

   // 4. Vérifier les credentials (message identique que l'email soit bon ou pas)
   if (!user) {
      await recordFailedAttempt(normalizedEmail);
      throw new UnauthorizedError('Invalid email or password');
   }

   const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
   if (!isPasswordValid) {
      await recordFailedAttempt(normalizedEmail);
      throw new UnauthorizedError('Invalid email or password');
   }

   // 5. Succès ! Reset les tentatives et générer le token
   await resetFailedAttempts(normalizedEmail);

   const token = generateToken(user, JWT_LOGIN_EXPIRY);

   logger.info('User logged in', { userId: user._id });

   return {
      user: formatUserProfile(user),
      token
   };
}

/**
 * Vérifie si un compte est verrouillé
 */
async function checkAccountLock(email) {
   const redis = getRedisClient();
   const lockKey = `account_lock:${email}`;
   const isLocked = await redis.get(lockKey);
   return isLocked !== null;
}

/**
 * Enregistre une tentative de login échouée
 */
async function recordFailedAttempt(email) {
   const redis = getRedisClient();
   const attemptsKey = `login_attempts:${email}`;

   // Incrémenter le compteur
   const attempts = await redis.incr(attemptsKey);

   // Définir l'expiration au premier essai
   if (attempts === 1) {
      await redis.expire(attemptsKey, ATTEMPT_WINDOW_SECONDS);
   }

   // Verrouiller si trop de tentatives
   if (attempts >= MAX_LOGIN_ATTEMPTS) {
      const lockKey = `account_lock:${email}`;
      await redis.set(lockKey, 'locked', { EX: LOCK_DURATION_SECONDS });
      await redis.del(attemptsKey);  // Reset le compteur

      logger.warn('Account locked due to too many failed attempts', { email });
   }
}

/**
 * Réinitialise le compteur de tentatives échouées (après un login réussi)
 */
async function resetFailedAttempts(email) {
   const redis = getRedisClient();
   const attemptsKey = `login_attempts:${email}`;
   await redis.del(attemptsKey);
}

/**
 * Génère un JWT signé
 */
function generateToken(user, expiresIn) {
   return jwt.sign({
      userId: user._id,
      email: user.email,
      displayName: user.displayName
   },
   JWT_SECRET,
   { expiresIn }
   );
}

/**
 * Formate le profil utilisateur pour la réponse (sans données sensibles)
 */
function formatUserProfile(user) {
   return {
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      avatar: user.avatar,
      createdAt: user.createdAt
   };
}

module.exports = {
   register,
   login,
   checkAccountLock,
   recordFailedAttempt,
   resetFailedAttempts
};