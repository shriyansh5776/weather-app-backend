import UserRole from "../validators/userRoles.schemas.js";
import { errorResponse } from "../utils/Response.js";

async function checkAdmin(req, res, next) {
  try {
    const role = await UserRole.findOne({
      user_id: req.user.id,
      role: "admin",
    });

    if (!role) {
      return errorResponse(res, 403, "Admin access required.");
    }

    next();
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}

export default checkAdmin;
