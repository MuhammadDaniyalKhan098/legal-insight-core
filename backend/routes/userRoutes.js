import express from "express";
import { protect } from "../middleware/auth.js";
import { updateProfile } from "../controllers/userController.js";

const router = express.Router();

router.put("/update-profile", protect, updateProfile);

export default router;
