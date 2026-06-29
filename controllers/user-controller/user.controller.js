import { errorResponse, successResponse } from "../../utils/Response.js";
import Users from "../../validators/users.schema.js";
import bcrypt from "bcrypt";

async function getMe(req, res) {
  try {
    const user = req.user;
    return successResponse(res, 200, "", {
      profile: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        email_verified: !!user.email_verified_at,
        status: user.status,
        created_at: user.created_at,
      },
      preferences_summary: {},
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}

async function setGetMe(req, res) {
  try {
    const { display_name, avatar_url } = req.body;
    if (!display_name && !avatar_url) {
      return errorResponse(res, 400);
    }
    const user = req.user;
    if (display_name) {
      user.display_name = display_name;
    }
    if (avatar_url) {
      user.avatar_url = avatar_url;
    }
    await user.save();
    return successResponse(res, 200, "details updated successfully", {
      profile: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        email_verified: !!user.email_verified_at,
        status: user.status,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}

async function changePassword(req, res) {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return errorResponse(
        res,
        400,
        "Current password and new password are required.",
      );
    }
    if (current_password === new_password) {
      return errorResponse(res, 400, "New password must be different.");
    }
    const user = await Users.findOne({ id: req.user.id }).select(
      "+password_hash",
    );
    const isAllowed = await bcrypt.compare(
      current_password,
      user.password_hash,
    );
    if (!isAllowed) {
      return errorResponse(res, 401, "wrong current password");
    }
    user.password_hash = await bcrypt.hash(new_password, 10);
    user.failed_login_count = 0;
    user.locked_until = null;
    await user.save();
    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}

async function getPref(req, res) {
  try {
    return successResponse(res, 200, "Preferences fetched successfully", {
      preferences: {},
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}

export { getMe, setGetMe, changePassword, getPref };
