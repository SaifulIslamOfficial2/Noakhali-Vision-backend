import fs from "fs";
import Ad from "../models/Ad.js";

const q = req => {
  const x = {};
  if (!req.user) x.status = "active";
  if (req.user && req.query.status) x.status = req.query.status;
  if (req.query.placement) x.placement = { $in: [req.query.placement, "all"] };
  return x;
};

export const getAds = async (req, res) => {
  try {
    res.json({ ads: await Ad.find(q(req)).sort({ createdAt: -1 }) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const getAdById = async (req, res) => {
  try {
    res.json({ ad: await Ad.findById(req.params.id) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const createAd = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Ad image required" });
    res.status(201).json({ ad: await Ad.create({ ...req.body, image: `/uploads/${req.file.filename}`, createdBy: req.user._id }) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const updateAd = async (req, res) => {
  try {
    const u = { ...req.body };
    if (req.file) u.image = `/uploads/${req.file.filename}`;
    res.json({ ad: await Ad.findByIdAndUpdate(req.params.id, u, { new: true, runValidators: true }) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const deleteAd = async (req, res) => {
  try {
    const old = await Ad.findByIdAndDelete(req.params.id);
    if (old?.image?.startsWith("/uploads/"))
      fs.rmSync(old.image.replace("/uploads/", "uploads/"), { force: true });
    res.json({ message: "Ad deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
