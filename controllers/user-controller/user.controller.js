import { errorResponse, successResponse } from "../../utils/Response.js";
import UserPreferences from "../../validators/preferences.schema.js";
import Users from "../../validators/users.schema.js";
import bcrypt from "bcrypt";
import UserSessions from "../../validators/userSessions.schema.js";

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
    const user_id = req.user.id;
    const myPref = await UserPreferences.findOne({ user_id });

    return successResponse(res, 200, "Preferences fetched successfully", {
      preferences: myPref,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}

async function putPrefrences(req, res) {
  try {
    const user_id = req.user.id;
    const {
      temperature_unit,
      wind_speed_unit,
      precipitation_unit,
      pressure_unit,
      time_format,
      language,
      theme,
      default_latitude,
      default_longitude,
    } = req.body;
    if (
      !temperature_unit ||
      !wind_speed_unit ||
      !precipitation_unit ||
      !pressure_unit ||
      !time_format ||
      !language ||
      !theme ||
      default_latitude === undefined ||
      default_longitude === undefined
    ) {
      return errorResponse(res, 400);
    }

    const newPref = await UserPreferences.findOneAndUpdate(
      { user_id },
      {
        temperature_unit: temperature_unit,
        wind_speed_unit: wind_speed_unit,
        precipitation_unit: precipitation_unit,
        pressure_unit: pressure_unit,
        time_format: time_format,
        language: language,
        theme: theme,
        default_latitude: default_latitude,
        default_longitude: default_longitude,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      },
    );
    return successResponse(res, 200, "Preference confirmed successfully", {
      preferences: newPref,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}

async function getSessions(req, res) {
  try {
    const user_id = req.user.id;

    const sessions = await UserSessions.find({
      user_id,
      revoked_at: null,
    }).sort({ last_used_at: -1 });
    if (sessions.length === 0) {
      return successResponse(res, 200, "No active sessions found", {
        sessions: [],
      });
    }
    const userResponse = sessions.map((session) => ({
      id: session.id,
      user_agent: session.user_agent,
      ip_address: session.ip_address,
      last_used_at: session.last_used_at,
      expires_at: session.expires_at,
      revoked_at: session.revoked_at,
      created_at: session.created_at,
    }));
    return successResponse(res, 200, "Sessions fetched successfully", {
      sessions: userResponse,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}

async function deleteSession(req, res) {
  try {
    const { session_id } = req.params;
    const session = await UserSessions.findOne({
      id: session_id,
      user_id: req.user.id,
    });
    if (!session) {
      return errorResponse(res, 404);
    }
    if (!!session.revoked_at) {
      return errorResponse(res, 409);
    }
    session.revoked_at = new Date();
    await session.save();
    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500);
  }
}

export {
  getMe,
  setGetMe,
  changePassword,
  getPref,
  putPrefrences,
  getSessions,
  deleteSession,
};
