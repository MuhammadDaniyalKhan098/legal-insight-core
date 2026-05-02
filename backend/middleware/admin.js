/**
 * Admin Middleware
 * Checks if the authenticated user has the 'admin' role.
 * Must be used after the 'protect' middleware.
 */
export const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Not authorized as an admin" });
  }
};
