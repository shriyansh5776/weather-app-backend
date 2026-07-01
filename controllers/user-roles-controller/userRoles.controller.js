import Users from "../../validators/users.schema.js";
import UserRole from "../../validators/userRoles.schemas.js";
import UserSessions from "../../validators/userSessions.schema.js";
import favouriteModel from "../../validators/favourite.schema.js";
import RecentSearch from "../../validators/recentSearches.schema.js";

import { successResponse, errorResponse} from "../../utils/Response.js";

async function getUsers(req, res) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const users = await Users.find()
      .skip((page - 1) * limit)
      .limit(limit)
      .select("-password_hash");

    const total = await Users.countDocuments();

    return successResponse(res, 200, "Users fetched successfully", {
      users,
      page,
      limit,
      total,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}
async function patchUser(req, res) {
  try {
    const { id } = req.params;
    const { status, role } = req.body;

    const user = await Users.findOne({ id });

    if (!user) {
      return errorResponse(res, 404, "User not found.");
    }

    if (status) {
      user.status = status;
    }

    await user.save();

    if (role) {
      let userRole = await UserRole.findOne({
        user_id: id,
      });

      if (userRole) {
        userRole.role = role;
        userRole.granted_by = req.user.id;
        userRole.granted_at = new Date();
        await userRole.save();
      } else {
        await UserRole.create({
          user_id: id,
          role,
          granted_by: req.user.id,
        });
      }
    }

    return successResponse(
      res,
      200,
      "User updated successfully"
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}
async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    const user = await Users.findOne({ id });

    if (!user) {
      return errorResponse(res, 404, "User not found.");
    }

    await Users.deleteOne({ id });

    await UserRole.deleteMany({
      user_id: id,
    });

    await UserSessions.deleteMany({
      user_id: id,
    });

    await FavouriteModel.deleteMany({
      user_id: id,
    });

    await RecentSearch.deleteMany({
      user_id: id,
    });

    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}
async function invalidateCache(req, res) {
  try {
    // Clear cache here if using Redis or another cache.

    return successResponse(
      res,
      200,
      "Cache invalidated successfully"
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}
async function getMetrics(req, res) {
  try {
    const totalUsers = await Users.countDocuments();

    const verifiedUsers = await Users.countDocuments({
      email_verified_at: {
        $ne: null,
      },
    });

    const activeSessions = await UserSessions.countDocuments({
      revoked_at: null,
    });

    const favorites = await FavouriteModel.countDocuments();

    const recentSearches = await RecentSearch.countDocuments();

    return successResponse(
      res,
      200,
      "Metrics fetched successfully",
      {
        total_users: totalUsers,
        verified_users: verifiedUsers,
        active_sessions: activeSessions,
        favorites,
        recent_searches: recentSearches,
      }
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}
export {
  getUsers,
  patchUser,
  deleteUser,
  invalidateCache,
  getMetrics,
};