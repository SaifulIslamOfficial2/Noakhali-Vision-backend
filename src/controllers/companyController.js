import fs from "fs";
import Company from "../models/Company.js";

const q = req => {
  const x = {};
  if (!req.user) x.status = "active";
  if (req.user && req.query.status) x.status = req.query.status;
  return x;
};

export const getCompanies = async (req, res) => {
  try {
    res.json({ companies: await Company.find(q(req)).sort({ createdAt: -1 }) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const getCompanyById = async (req, res) => {
  try {
    res.json({ company: await Company.findById(req.params.id) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const createCompany = async (req, res) => {
  try {
    res.status(201).json({ company: await Company.create({ ...req.body, logo: req.file ? `/uploads/${req.file.filename}` : "", createdBy: req.user._id }) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const updateCompany = async (req, res) => {
  try {
    const u = { ...req.body };
    if (req.file) u.logo = `/uploads/${req.file.filename}`;
    res.json({ company: await Company.findByIdAndUpdate(req.params.id, u, { new: true, runValidators: true }) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const deleteCompany = async (req, res) => {
  try {
    const old = await Company.findByIdAndDelete(req.params.id);
    if (old?.logo?.startsWith("/uploads/"))
      fs.rmSync(old.logo.replace("/uploads/", "uploads/"), { force: true });
    res.json({ message: "Company deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
