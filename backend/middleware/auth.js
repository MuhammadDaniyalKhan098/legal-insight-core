/**
 * Authentication Middleware
 * 
 * Protects routes by verifying JWT tokens (from the request headers).
 * Attaches authenticated user object to request for use in protected routes.
 * 
 * @module middleware/auth
 */

import User from "../models/User.js";
import jwt from "jsonwebtoken";


/**
 * Middleware to protect the routes requiring authentication.
 * Verifies JWT token from Authorization header and attaches user to the request.
 * 
 * @param {Object} req -  request object
 * @param {Object} res -  response object
 * @param {Function} next -  next middleware function
 * @returns {void} Calls "next()" if authenticated, otherwise sends a 401 response
 */


export const protect = async (req, res, next) => {
  let token = null;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");

      return next();
    } catch (err) {
      
      
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired, please login again" });
      }
      if (err.name === "JsonWebTokenError") {
        return res.status(401).json({ message: "Invalid token" });
      }
      
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }
  return res.status(401).json({ message: "Not authorized, token failed" });
};
