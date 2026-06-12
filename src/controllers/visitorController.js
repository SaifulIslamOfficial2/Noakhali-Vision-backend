import Visitor from "../models/Visitor.js";

export async function trackVisit(req, res) {
  try {
    await Visitor.create({
      path: req.body.path || "/",
      ip: req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "unknown",
      userAgent: req.headers["user-agent"] || "",
      dateKey: new Date().toISOString().slice(0, 10),
    });
    res.status(201).json({ message: "Visit tracked" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
