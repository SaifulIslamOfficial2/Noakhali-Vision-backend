import fs from "fs";
import TeamMember from "../models/TeamMember.js";

export const getTeam = async (req, res) => {
  try {
    const filter = req.user ? {} : { active: true };
    const team = await TeamMember.find(filter).sort({ order: 1, createdAt: 1 });
    res.json({ team });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createMember = async (req, res) => {
  try {
    const { name, nameBn, role, roleBn, bio, email, facebook, order, active } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
    if (!role?.trim()) return res.status(400).json({ message: "Role is required" });
    const member = await TeamMember.create({
      name: name.trim(),
      nameBn: nameBn?.trim() || "",
      role: role.trim(),
      roleBn: roleBn?.trim() || "",
      bio: bio?.trim() || "",
      email: email?.trim() || "",
      facebook: facebook?.trim() || "",
      order: Number(order) || 0,
      active: active === "false" ? false : true,
      photo: req.file ? `/uploads/${req.file.filename}` : "",
    });
    res.status(201).json({ member });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateMember = async (req, res) => {
  try {
    const old = await TeamMember.findById(req.params.id);
    if (!old) return res.status(404).json({ message: "Member not found" });
    const u = { ...req.body };
    if (typeof u.active !== "undefined") u.active = u.active === "false" ? false : true;
    if (req.file) {
      if (old?.photo?.startsWith("/uploads/"))
        fs.rmSync(old.photo.replace("/uploads/", "uploads/"), { force: true });
      u.photo = `/uploads/${req.file.filename}`;
    }
    const member = await TeamMember.findByIdAndUpdate(req.params.id, u, { new: true, runValidators: true });
    res.json({ member });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteMember = async (req, res) => {
  try {
    const old = await TeamMember.findByIdAndDelete(req.params.id);
    if (!old) return res.status(404).json({ message: "Member not found" });
    if (old?.photo?.startsWith("/uploads/"))
      fs.rmSync(old.photo.replace("/uploads/", "uploads/"), { force: true });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
