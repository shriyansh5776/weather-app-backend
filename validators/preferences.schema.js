import mongoose from "mongoose";

const preferencesSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      unique: true,
      required: true,
      ref: "Users",
    },
    temperature_unit: {
      type: String,
      enum: ["celsius", "fahrenheit"],
      required: true,
    },
    wind_speed_unit: {
      type: String,
      enum: ["kmh", "mph", "ms"],
      required: true,
    },
    precipitation_unit: {
      type: String,
      enum: ["mm", "inch"],
      required: true,
    },
    pressure_unit: {
      type: String,
      enum: ["hpa", "inhg"],
      required: true,
    },
    time_format: {
      type: String,
      enum: ["12h", "24h"],
      required: true,
    },
    language: {
      type: String,
      maxlength: 8,
      required: true,
      validate: {
        validator: (v) => /^[a-z]{2}(-[A-Z]{2})?$/.test(v),
        message: "Invalid language tag",
      },
    },
    theme: {
      type: String,
      enum: ["system", "dark", "light"],
      required: true,
    },
    default_latitude: {
      type: Number,
      required: false,
      min: -90,
      max: 90,
    },
    default_longitude: {
      type: Number,
      required: false,
      min: -180,
      max: 180,
    },
  },
  {
    timestamps: {
      updatedAt: "updated_at",
      createdAt: false,
    },
  },
);

const UserPreferences = mongoose.model("UserPreferences", preferencesSchema);

export default UserPreferences;
