import Users from "../../validators/users.schema.js";
import bcrypt from "bcrypt";
import sendEmail from "../email-controller/email.controller.js";
import { errorResponse, successResponse } from "../../utils/Response.js";
import jwt from "jsonwebtoken";
import UserSessions from "../../validators/userSessions.schema.js";
import { v4 as uuidv4 } from "uuid";

async function registerUser(req, res) {
  try {
    const { email, password, display_name } = req.body;
    if (!email || !password || !display_name) {
      return errorResponse(
        res,
        400,
        "Email, password and display_name are required.",
      );
    }
    const doesExists = await Users.findOne({ email });
    if (doesExists) {
      return errorResponse(res, 409, "Email taken");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await Users.create({
      email,
      password_hash: hashedPassword,
      display_name,
    });
    const verificationToken = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
      },
      process.env.EMAIL_VERIFICATION_SECRET,
      {
        expiresIn: "24h",
      },
    );
    const userResponse = {
      user: {
        id: newUser.id,
        email: newUser.email,
        display_name: newUser.display_name,
        email_verified: !!newUser.email_verified_at,
      },
    };
    try {
      await sendEmail(email, "Verify your email", verificationToken);
      console.error(error);
    } catch (error) {
      console.error(error);
      return successResponse(
        res,
        201,
        "Account created. Verification email cannot be sent. Please try again later",
        userResponse,
      );
    }
    return successResponse(
      res,
      201,
      "Account created. Verification email sent. ",
      userResponse,
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}

async function loginUser(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return errorResponse(res, 400, "Email and password are required.");
    }
    const doesExists = await Users.findOne({ email }).select("+password_hash");
    if (!doesExists) {
      return errorResponse(res, 401, "Invalid credentials");
    }
    if (doesExists.locked_until && doesExists.locked_until > new Date()) {
      return errorResponse(res, 423, "Login locked. Try again later.");
    }
    const checkPass = await bcrypt.compare(password, doesExists.password_hash);
    if (!checkPass) {
      doesExists.failed_login_count += 1;
      if (doesExists.failed_login_count >= 5) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + 15);
        doesExists.locked_until = lockUntil;
        await doesExists.save();
        return errorResponse(
          res,
          423,
          "Too many failed login attempts. Account locked for 15 minutes.",
        );
      }
      await doesExists.save();
      return errorResponse(res, 401, "Invalid credentials");
    }
    if (!doesExists.email_verified_at) {
      return errorResponse(res, 403, "Email not verified");
    }
    const userId = doesExists.id;
    const access_Token = jwt.sign(
      {
        id: userId,
        email,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "30m",
      },
    );
    const refresh_Token = jwt.sign(
      {
        id: userId,
        email,
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d",
      },
    );
    const sessionId = uuidv4();
    const tokenFamilyId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await UserSessions.create({
      user_id: userId,
      id: sessionId,
      refresh_token_hash: await bcrypt.hash(refresh_Token, 10),
      token_family_id: tokenFamilyId,
      user_agent: req.headers["user-agent"] || "Unknown",
      ip_address: req.ip,
      last_used_at: new Date(),
      expires_at: expiresAt,
    });
    doesExists.failed_login_count = 0;
    doesExists.locked_until = null;
    await doesExists.save();
    const userResponse = {
      access_Token,
      refresh_Token,
      expiresIn: "30 minutes",
      user: {
        id: userId,
        email,
        display_name: doesExists.display_name,
        email_verified: !!doesExists.email_verified_at,
      },
    };
    return successResponse(
      res,
      200,
      "User logged in successfully",
      userResponse,
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}

async function logoutUser(req, res) {
  try {
    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}

async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return errorResponse(res, 400, "Refresh token is required");
    }
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const { id } = decoded;
    const user = await Users.findOne({ id });
    if (!user) {
      return errorResponse(res, 401, "User not found");
    }
    if (!user.email_verified_at) {
      return errorResponse(res, 403, "Email not verified");
    }
    if (user.status !== "active") {
      return errorResponse(res, 403, "Account not active");
    }
    const new_refresh = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" },
    );
    const new_access = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "30min" },
    );
    const userResponse = {
      access_token: new_access,
      refresh_token: new_refresh,
      expires_in: "30m",
    };
    return successResponse(
      res,
      200,
      "Tokens refreshed successfully",
      userResponse,
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res, 401, "Invalid or expired refresh token");
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return errorResponse(res, 400, "Email is required");
    }
    const user = await Users.findOne({ email });
    if (!user) {
      return successResponse(
        res,
        202,
        "If an account exists, a password reset email has been sent.",
      );
    }
    if (user.status !== "active") {
      return successResponse(
        res,
        202,
        "If an account exists, a password reset email has been sent.",
      );
    }
    const reset_token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.PASSWORD_RESET_SECRET,
      { expiresIn: "5m" },
    );
    try {
      await sendEmail(email, "reset-password", reset_token);
    } catch (error) {
      console.error(error);
    }
    return successResponse(
      res,
      202,
      "If an account exists, a password reset email has been sent.",
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}

async function resetPassword(req, res) {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) {
      return errorResponse(res, 400, "Bad request");
    }
    const decoded = jwt.verify(token, process.env.PASSWORD_RESET_SECRET);
    const { id } = decoded;
    const user = await Users.findOne({ id });
    if (!user) {
      return errorResponse(res, 400, "Bad request");
    }
    if (user.status !== "active") {
      return errorResponse(res, 400, "Bad request");
    }
    const newHashed = await bcrypt.hash(new_password, 10);
    user.password_hash = newHashed;
    user.failed_login_count = 0;
    user.locked_until = null;
    await user.save();
    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError"
    ) {
      return errorResponse(res, 410, "Token expired or invalid");
    }
    return errorResponse(res);
  }
}

async function verifyEmail(req, res) {
  try {
    const { token } = req.body;
    if (!token) {
      return errorResponse(res, 400);
    }
    const decoded = jwt.verify(token, process.env.EMAIL_VERIFICATION_SECRET);
    const { id } = decoded;
    const user = await Users.findOne({ id });
    if (!user) {
      return errorResponse(res, 400, "Bad request");
    }
    if (user.email_verified_at !== null) {
      return successResponse(res, 204);
    }
    user.email_verified_at = new Date();
    await user.save();
    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}

async function resendEmail(req, res) {
  try {
    if (req.user.email_verified_at != null) {
      return successResponse(res, 202, "Email is already verified.");
    }
    const email_ver_token = jwt.sign(
      {
        id: req.user.id,
        email: req.user.email,
      },
      process.env.EMAIL_VERIFICATION_SECRET,
      {
        expiresIn: "1d",
      },
    );
    try {
      await sendEmail(req.user.email, "Verify your email", email_ver_token);
      return successResponse(res, 202);
    } catch (error) {
      return successResponse(
        res,
        202,
        "Verification email could not be sent. Please try again later.",
      );
    }
  } catch (error) {
    console.error(error);
    return errorResponse(res);
  }
}

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendEmail,
};
