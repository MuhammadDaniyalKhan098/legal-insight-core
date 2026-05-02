import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import User from "../models/User.js";

// Load env vars
dotenv.config({ path: path.resolve("./.env") });

const findAndPromote = async () => {
  const targetEmail = process.argv[2];

  if (!targetEmail) {
    console.log("Usage: node utils/promoteToAdmin.js <email>");
    process.exit(1);
  }

  console.log("--- FUZZY SEARCH & PROMOTE ---");
  console.log(`Connecting to: ${process.env.MONGO_URI}`);
  console.log(`Searching for user like: '${targetEmail}'`);

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(
      `Connection successful. Database: '${mongoose.connection.name}'`
    );

    // This regex trims whitespace and ignores case.
    // It will find '  muaazsaeed911@gmail.com '
    const searchRegex = new RegExp(`^\\s*${targetEmail}\\s*$`, "i");

    const user = await User.findOne({ email: searchRegex });

    if (!user) {
      console.error(
        `\nFAILED: Could not find any user matching '${targetEmail}'.`
      );
      console.error(
        "Please log in to MongoDB Atlas and manually check the email string for typos."
      );
      process.exit(1);
    }

    console.log(`\nSUCCESS: Found user (ID: ${user._id})`);
    console.log(`Saved email was: "${user.email}"`);

    // 4. Promote them
    user.role = "admin";
    await user.save();

    console.log(`\n--- PROMOTION SUCCESSFUL ---`);
    console.log(`User: ${user.username}`);
    console.log(`Email: ${user.email}`);
    console.log(`New Role: ${user.role}`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

findAndPromote();
