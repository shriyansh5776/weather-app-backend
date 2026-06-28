import mongoose from "mongoose";
import { v4 as uuidv4, validate } from "uuid";
import validator from "validator";
const usersSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: uuidv4,
      unique : true ,
      validate:{
        validator:validate,
        message:"Invalid uuid"
      }
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      maxLength: 255,
      trim: true,
      validate: {
        validator: (value) => validator.isEmail(value),
        message: "Please provide a valid , RFC 5322 complaint email",
      },
    },
    password_hash: {
      type: String,
      required: true,
      select:false
    },
    display_name: {
      type: String,
      maxLength: 80,
      required: true,
      minLength: 2,
      trim: true,
    },
    avatar_url: {
      type: String,
      maxLength: 500,
      trim : true ,
      validate:{
        validator:(value)=>!value|| validator.isURL(value),
        message : "Invalid avatar URL"
      }
    },
    email_verified_at: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["active", "locked", "suspended", "deleted"],
      required: true,
      default:"active"
    },
    failed_login_count: {
      type: Number,
      required: true,
      default: 0,
    },
    locked_until: {
      type: Date,
    },
  },
  { timestamps: {
    createdAt : "created_at",
    updatedAt : "updated_at"
  } },
);


const Users = mongoose.model("Users",usersSchema);
export default Users