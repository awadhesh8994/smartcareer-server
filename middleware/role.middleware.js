// ── Restrict to specific roles ────────────────────────────────────
// Usage: router.get('/admin/users', protect, restrictTo('admin'), handler)

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }
    next();
  };
};
