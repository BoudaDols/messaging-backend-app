/**
 * User controller - handles profile management and user search.
 * All routes require authentication.
 */

const User = require("../models/User");
const { validateDisplayName } = require("../utils/validators");
const { ValidationError, NotFoundError } = require("../utils/errors");

/**
 * GET /api/users/:id/profile
 * Retourne le profil public d'un utilisateur
 */
async function getPublicProfile(req, res, next) {
   try{
      const { id } = req.params;
      const user = await User.findById(id).select(
         "displayName avatar presence createAt",
      );

      if(!user){
         throw new NotFoundError("User not found");
      }

      res.json({
         user: {
            id: user._id,
            displayName: user.displayName,
            avatar: user.avatar,
            presence: user.presence,
            createAt: user.createAt,
         },
      });
   } catch(error) {
      next(error);
   }
}

/**
 * PUT /api/users/profile
 * Met à jour le profil de l'utilisateur connecté
 */
async function updateProfile(req, res, next) {
   try {
      const { displayName } = req.body;

      // Valider le displayName
      const validation = validateDisplayName(displayName);
      if(!validation.valid) {
         throw new ValidationError(validation.error, { field: "displayNAme" });
      }

      // Mettre à jour
      const user = await User.findByIdAndUpdate(
         req.user.userId,
         { displayName: displayName.trim() },
         { returnDocument: "after" },
      );

      if(!user) {
         throw new NotFoundError("User not found");
      }

      res.json({
         message: "Profile updated successfully",
         user: {
            id: user._id,
            email: user.email,
            displayName: user.displayName,
            avatar: user.avatar,
         },
      });
   } catch (error) {
      next(error);
   }
}


/**
 * GET /api/users/search?q=
 * Recherche des utilisateurs par display name ou email
 */
async function searchUsers(req, res, next) {
   try {
      const { q } = req.query;

      // Minimum 2 caracteeres
      if(!q || q.length <2 ) {
         throw new ValidationError(
            "Search query must be at least 2 characters",
            { field: "q", min: 2 },
         );
      }

      // Recherche case-insensitive avec regex
      const regex = new RegExp(q, "i");

      const users = await User.find({ 
         $or: [{ displayName: regex }, { email: regex }],
         _id: { $ne: req.user.userId },
       })
       .select("displayNAme email avatar presence")
       .limit(20);

       res.json({
         results: users.map((user) => ({
            id: user._id,
            displayNAme: user.displayName,
            email: user.email,
            avatar: user.avatar,
            presence: user.presence,
         })),
         count: users.length,
       });
   } catch (error) {
      next(error);
   }
}

module.exports = {
   getPublicProfile,
   updateProfile,
   searchUsers,
};