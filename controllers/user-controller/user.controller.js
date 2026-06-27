import Users from "../../validators/users.schema.js";
import bcrypt from "bcrypt";
import sendEmail from "../email-controller/email.controller.js";
import { errorResponse, successResponse } from "../../utils/Response.js";
import jwt from "jsonwebtoken";

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
    const userResponse = {
      user: {
        id: newUser.id,
        email: newUser.email,
        display_name: newUser.display_name,
        email_verified: !!newUser.email_verified_at,
      },
    };
    try {
      await sendEmail(
        email,
        "Verify your email",
        "Click the link to verify your account.",
      );
      console.log("Email sent!");
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
      return errorResponse(res, 423, "Login locked try after some time");
    }
    const pass = doesExists.password_hash;
    const checkPass = await bcrypt.compare(password, pass);

    if (!checkPass) {
      doesExists.failed_login_count += 1;
      if (doesExists.failed_login_count >= 5) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + 15);
        doesExists.locked_until = lockUntil;
        await doesExists.save()
        return errorResponse(
          res,
          423,
          "Too many failed login attempts. Account locked for 15 minutes.",
        );
      }
      await doesExists.save();
      return errorResponse(res, 401, "Invalid credentials");
    }
    const id = doesExists.id;
    if (!doesExists.email_verified_at) {
      await doesExists.save();
      return errorResponse(res, 403, "Email not verified");
    }
    const accessToken = jwt.sign(
      {
        id,
        email,
      },
      process.env.MY_SECRET_KEY,
      { expiresIn: "30m" },
    );
    const refreshToken = jwt.sign(
      {
        id,
        email,
      },
      process.env.MY_SECRET_KEY,
      { expiresIn: "7d" },
    );
    doesExists.failed_login_count = 0;
    doesExists.locked_until = null;
    await doesExists.save();
    const userResponse = {
      accessToken,
      refreshToken,
      expiresIn: "30 minutes",
      user: {
        id,
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

async function logoutUser(req,res) {
  try {
    
  } catch (error) {
    
  }
}

export { registerUser, loginUser };
