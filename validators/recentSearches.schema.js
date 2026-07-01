import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const recentSearchesSchema = new mongoose.Schema(
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

    query: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true,
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

    resolved_name: {
      type: String,
      maxlength: 200,
      trim: true,
    },

    searched_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
    timestamps: false,
  },
);

recentSearchesSchema.index({
  user_id: 1,
  searched_at: -1,
});

const RecentSearch = mongoose.model(
  "RecentSearch",
  recentSearchesSchema,
);

export default RecentSearch;