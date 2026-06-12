import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function protect(req, res, next) {
  try {
    const h = req.headers.authorization || "";
    const t = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!t) return res.status(401).json({ message: "Authentication required" });
    const d = jwt.verify(t, process.env.JWT_SECRET);
    const user = await User.findById(d.id).select("-password");
    if (!user) return res.status(401).json({ message: "User not found" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export async function optionalProtect(req, _, next) {
  try {
    const h = req.headers.authorization || "";
    const t = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (t) {
      const d = jwt.verify(t, process.env.JWT_SECRET);
      req.user = await User.findById(d.id).select("-password");
    }
  } catch {
    req.user = null;
  }
  next();
}

export const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role)
    ? next()
    : res.status(403).json({ message: "Permission denied" });
