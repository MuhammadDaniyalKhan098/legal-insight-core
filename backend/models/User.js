/**
 * User Model
 *
 * Defines the User schema with authentication fields and email verification.
 * Includes password hashing middleware and password comparison method.
 *
 * @module models/User
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
    },
    verificationTokenExpires: {
      type: Date,
    },

    resetPasswordToken: {
  type: String,
},
resetPasswordExpires: {
  type: Date,
},

    isSuspended: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ["public", "lawyer", "academic", "admin"],
      default: "public",
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/**
 * Compare the entered password with the hashed password in the DB.
 *
 * @param {string} enteredPassword - Plain text password
 * @returns {Promise<boolean>} True if passwords match, false otherwise
 */

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
