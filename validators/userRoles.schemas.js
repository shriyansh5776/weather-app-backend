import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const userRolesSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: uuidv4,
      unique: true,
      required: true,
    },

    user_id: {
      type: String,
      required: true,
      ref: "Users",
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      required: true,
    },

    granted_at: {
      type: Date,
      default: Date.now,
    },

    granted_by: {
      type: String,
      ref: "Users",
      default: null,
    },
  },
  {
    versionKey: false,
    timestamps: false,
  },
);

userRolesSchema.index(
  {
    user_id: 1,
    role: 1,
  },
  {
    unique: true,
  },
);

const UserRole = mongoose.model("UserRole", userRolesSchema);

export default UserRole;
