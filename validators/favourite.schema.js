import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const favouriteLocationsSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      ref: "Users",
    },
    id: {
      type: String,
      default: uuidv4,
      unique: true,
    },
    label: {
      type: String,
      maxLength: 120,
      required: true,
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    country_code: {
      type: String,
      required: true,
      uppercase: true,
      minlength: 2,
      maxlength: 2,
    },
    region: {
      type: String,
      maxLength: 120,
    },
    city: {
      type: String,
      maxLength: 120,
    },
    sort_order: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: false,
    },
  },
);
favouriteLocationsSchema.index(
  {
    user_id: 1,
    latitude: 1,
    longitude: 1,
  },
  {
    unique: true,
  },
);

const favouriteModel = mongoose.model(
  "favouriteModel",
  favouriteLocationsSchema,
);
export default favouriteModel;
