import { errorResponse } from "../../../utils/Response.js";
import jwt from "jsonwebtoken";
import Users from "../../../validators/users.schema.js";

async function refreshAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(res, 401, "Refresh token required");
    }
    const refreshToken = authHeader.split(" ")[1];
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await Users.findOne({ id: decoded.id });
    if (!user) {
      return errorResponse(res, 401, "User not found");
    }
    if (user.status !== "active") {
      return errorResponse(res, 403, "Account not active");
    }

    req.user = user;
    req.refreshToken = refreshToken;
    next();
  } catch (error) {
    console.error(error);
    return errorResponse(res, 401, "Invalid or expired refresh token");
  }
}

export default refreshAuth;
