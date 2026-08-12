/**
 * Input validation functions for the messaging platform.
 * Pure functions that return { valid: boolean, error?: string }
 */


/**
 * Valide un email : doit contenir exactement un "@" suivi d'un domaine avec au moins un point
 */
function validateEmail(email) {
   if(!email || typeof email !== 'string'){
      return { valid: false, error: 'Email is required.'}
   }

   const trimmed = email.trim().toLowerCase();

   //Regex simple : quelquechose@domaine.extension
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

   if(!emailRegex.test(trimmed)) {
      return { valid: false, error: 'Email must contain exactly one @ symbol followed by a domain with at least one dot' };
   }

   return { valid: true };
}

/**
 * Valide un mot de passe : entre 8 et 128 caractères
 */
function validatePassword(password){
   if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password must not exceed 128 characters' };
  }

  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  
  if(!strongPasswordRegex.test(password)){
   return { valid: false, error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, one special character, and a minimum length of 8 characters.'}
  }

  return { valid: true };
}

/**
 * Valide un display name : 1-50 caractères, au moins un non-whitespace
 */
function validateDisplayName(displayName) {
  if (!displayName || typeof displayName !== 'string') {
    return { valid: false, error: 'Display name is required' };
  }

  if (displayName.length > 50) {
    return { valid: false, error: 'Display name must not exceed 50 characters' };
  }

  // Vérifie qu'il y a au moins un caractère non-espace
  if (displayName.trim().length === 0) {
    return { valid: false, error: 'Display name must contain at least one non-whitespace character' };
  }

  return { valid: true };
}

module.exports = {
  validateEmail,
  validatePassword,
  validateDisplayName
};