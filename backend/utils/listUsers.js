import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import User from "../models/User.js"; // Adjust path if model is elsewhere

// Load .env file
dotenv.config({ path: path.resolve("./.env") });

const listUsers = async () => {
  if (!process.env.MONGO_URI) {
    console.error("ERROR: MONGO_URI is not defined in .env file.");
    process.exit(1);
  }

  try {
    console.log(`Connecting to: ${process.env.MONGO_URI}`);
    await mongoose.connect(process.env.MONGO_URI);

    console.log(
      `Connection successful. Database: '${mongoose.connection.name}'`
    );
    console.log("Fetching users from 'users' collection...");

    // Find all users and select only the 'email' and 'username' fields
    const users = await User.find({}, "email username");

    if (users.length === 0) {
      console.log("\nNo users found in this collection.");
    } else {
      console.log(`\nFound ${users.length} users:`);

      // Print each user, wrapping email in quotes to show spaces
      users.forEach((user, index) => {
        console.log(
          `  ${index + 1}. Username: ${user.username}, Email: "${user.email}"`
        );
      });
    }
  } catch (error) {
    console.error("\n--- SCRIPT FAILED ---");
    console.error(error);
  } finally {
    // Ensure we disconnect from the database
    await mongoose.disconnect();
    console.log("\nDatabase connection closed.");
    process.exit(0);
  }
};

listUsers();
