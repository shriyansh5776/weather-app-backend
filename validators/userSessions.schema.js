import mongoose from "mongoose";

const userSessionsSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      ref: "Users",
    },
    id: {
      type: String,
      unique: true,
      required: true,
    },
    refresh_token_hash: {
      type: String,
      required: true,
      unique: true,
    },
    token_family_id: {
      type: String,
      required: true,
    },
    user_agent: {
      type: String,
      maxLength: 500,
      required: true,
    },
    ip_address: {
      type: String,
      required: true,
      maxLength: 45,
    },
    last_used_at: {
      type: Date,
      required: true,
    },
    expires_at: {
      type: Date,
      required: true,
      validate: {
        validator() {
          return this.expires_at > this.created_at;
        },
        message: "expires_at must be after created_at",
      },
    },
    revoked_at: {
      type: Date,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: false,
    },
  },
);

const UserSessions = mongoose.model("UserSessions", userSessionsSchema);

export default UserSessions;
