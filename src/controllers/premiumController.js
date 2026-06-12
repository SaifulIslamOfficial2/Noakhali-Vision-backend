import PremiumMember from "../models/PremiumMember.js";
import PremiumNewsSubmission from "../models/PremiumNewsSubmission.js";
import { filePath, removeFile } from "../middleware/upload.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Set expiry = joinDate + 1 year */
const addOneYear = (date) => {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + 1);
  return d;
};

/** Auto-expire Active members whose expiryDate has passed */
const refreshExpired = () =>
  PremiumMember.updateMany(
    { membershipStatus: "Active", expiryDate: { $lt: new Date() } },
    { $set: { membershipStatus: "Expired" } }
  );

/** Build Mongoose query from request params (admin) */
const buildMemberQuery = (req) => {
  const q = {};
  if (req.query.status) q.membershipStatus = req.query.status;
  const s = req.query.search || req.query.q || "";
  if (s) {
    q.$or = [
      { memberId: { $regex: s, $options: "i" } },
      { name: { $regex: s, $options: "i" } },
      { phone: { $regex: s, $options: "i" } },
      { email: { $regex: s, $options: "i" } },
    ];
  }
  return q;
};

/** Find member by memberId string and auto-expire if needed */
const findByMemberId = async (memberId) => {
  const member = await PremiumMember.findOne({ memberId });
  if (!member) return null;
  if (
    member.membershipStatus === "Active" &&
    member.expiryDate &&
    member.expiryDate < new Date()
  ) {
    member.membershipStatus = "Expired";
    await member.save();
  }
  return member;
};

/** Recalculate newsCount / publishedNewsCount for a member */
const recalcNews = async (memberId) => {
  const [newsCount, publishedNewsCount] = await Promise.all([
    PremiumNewsSubmission.countDocuments({ member: memberId }),
    PremiumNewsSubmission.countDocuments({ member: memberId, status: "Approved" }),
  ]);
  await PremiumMember.findByIdAndUpdate(memberId, { newsCount, publishedNewsCount });
};

// ─── Membership CRUD ──────────────────────────────────────────────────────────

/** POST /premium/members  — Public: submit registration */
export const createMember = async (req, res) => {
  try {
    const b = req.body;
    const files = req.files || {};
    const photoFile = files.photo?.[0] || files.profilePhoto?.[0];
    const screenshotFile = files.paymentScreenshot?.[0];

    const member = await PremiumMember.create({
      name: b.name || b.fullName,
      facebookUrl: b.facebookUrl,
      phone: b.phone || b.mobile,
      email: b.email,
      address: b.address,
      bio: b.bio,
      bkashSenderNumber: b.bkashSenderNumber || b.bkashSender,
      transactionId: b.transactionId || b.bkashTransactionId,
      photo: filePath(photoFile),
      paymentScreenshot: filePath(screenshotFile),
    });

    res.status(201).json({ member });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0];
      return res.status(409).json({ message: `${field} already exists` });
    }
    res.status(400).json({ message: err.message });
  }
};

/** GET /premium/members  — Admin: all members | Public: Active only */
export const listMembers = async (req, res) => {
  try {
    await refreshExpired();
    const isAdmin = !!req.user;
    const query = isAdmin ? buildMemberQuery(req) : { membershipStatus: "Active" };
    const members = await PremiumMember.find(query).sort({ createdAt: -1 });
    res.json({ members });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /premium/members/search  — Admin search */
export const searchMembers = async (req, res) => {
  try {
    await refreshExpired();
    const q = buildMemberQuery(req);
    const members = await PremiumMember.find(q).sort({ createdAt: -1 }).limit(50);
    res.json({ members });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /premium/members/:memberId */
export const getMember = async (req, res) => {
  try {
    const member = await findByMemberId(req.params.memberId);
    if (!member) return res.status(404).json({ message: "Premium member not found" });

    const isAdmin = !!req.user;
    // Public users only see active members
    if (!isAdmin && member.membershipStatus !== "Active") {
      return res.status(404).json({ message: "Premium member not found" });
    }

    const submissionsQuery = isAdmin
      ? { member: member._id }
      : { member: member._id, status: "Approved" };

    const submissions = await PremiumNewsSubmission.find(submissionsQuery).sort({
      createdAt: -1,
    });

    res.json({ member, submissions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** PUT /premium/members/:memberId  — Admin: edit profile */
export const updateMember = async (req, res) => {
  try {
    const member = await findByMemberId(req.params.memberId);
    if (!member) return res.status(404).json({ message: "Premium member not found" });

    const b = req.body;
    const files = req.files || {};
    const update = {};

    const editableFields = [
      "name", "facebookUrl", "phone", "email", "address", "bio",
      "bkashSenderNumber", "transactionId", "membershipStatus",
    ];
    editableFields.forEach((k) => {
      if (b[k] !== undefined) update[k] = b[k];
    });

    if (b.resetNewsCount === "true") {
      update.newsCount = 0;
      update.publishedNewsCount = 0;
    }

    if (files.photo?.[0]) {
      removeFile(member.photo);
      update.photo = filePath(files.photo[0]);
    }

    if (files.paymentScreenshot?.[0]) {
      update.paymentScreenshot = filePath(files.paymentScreenshot[0]);
    }

    const updated = await PremiumMember.findByIdAndUpdate(member._id, update, {
      new: true,
      runValidators: true,
    });

    res.json({ member: updated });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/** DELETE /premium/members/:memberId  — Admin */
export const deleteMember = async (req, res) => {
  try {
    const member = await findByMemberId(req.params.memberId);
    if (!member) return res.status(404).json({ message: "Premium member not found" });

    removeFile(member.photo);
    removeFile(member.paymentScreenshot);
    await PremiumNewsSubmission.deleteMany({ member: member._id });
    await member.deleteOne();

    res.json({ message: "Premium member and all their submissions deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Status Actions ───────────────────────────────────────────────────────────

/** PATCH /premium/members/:memberId/approve */
export const approveMember = async (req, res) => {
  try {
    const member = await findByMemberId(req.params.memberId);
    if (!member) return res.status(404).json({ message: "Premium member not found" });

    member.membershipStatus = "Active";
    member.joinDate = member.joinDate || new Date();
    member.expiryDate = addOneYear(member.joinDate);
    await member.save();

    res.json({ member });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** PATCH /premium/members/:memberId/reject */
export const rejectMember = async (req, res) => {
  try {
    const member = await findByMemberId(req.params.memberId);
    if (!member) return res.status(404).json({ message: "Premium member not found" });

    member.membershipStatus = "Rejected";
    await member.save();
    res.json({ member });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** PATCH /premium/members/:memberId/suspend */
export const suspendMember = async (req, res) => {
  try {
    const member = await findByMemberId(req.params.memberId);
    if (!member) return res.status(404).json({ message: "Premium member not found" });

    member.membershipStatus = "Suspended";
    await member.save();
    res.json({ member });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** PATCH /premium/members/:memberId/activate */
export const activateMember = async (req, res) => {
  try {
    const member = await findByMemberId(req.params.memberId);
    if (!member) return res.status(404).json({ message: "Premium member not found" });

    member.membershipStatus = "Active";
    member.joinDate = member.joinDate || new Date();
    // Keep existing expiry if still in the future; otherwise set 1 year from now
    if (!member.expiryDate || member.expiryDate <= new Date()) {
      member.expiryDate = addOneYear(new Date());
    }
    await member.save();
    res.json({ member });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** PATCH /premium/members/:memberId/renew  — Extends by 1 year from current expiry (or today) */
export const renewMember = async (req, res) => {
  try {
    const member = await findByMemberId(req.params.memberId);
    if (!member) return res.status(404).json({ message: "Premium member not found" });

    const base =
      member.expiryDate && member.expiryDate > new Date()
        ? member.expiryDate
        : new Date();

    member.membershipStatus = "Active";
    member.joinDate = member.joinDate || new Date();
    member.expiryDate = addOneYear(base);
    member.newsCount = 0;
    member.publishedNewsCount = 0;
    await member.save();

    // Reset submission counts in DB (keep submissions but reset counter)
    res.json({ member });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /premium/members/:memberId/payment-screenshot  — Admin: replace screenshot */
export const uploadScreenshot = async (req, res) => {
  try {
    const member = await findByMemberId(req.params.memberId);
    if (!member) return res.status(404).json({ message: "Premium member not found" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    removeFile(member.paymentScreenshot);
    member.paymentScreenshot = filePath(req.file);
    await member.save();
    res.json({ member });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Premium News ─────────────────────────────────────────────────────────────

/** GET /premium/news  — Admin: all news submissions */
export const listPremiumNews = async (req, res) => {
  try {
    const q = {};
    if (req.query.status) q.status = req.query.status;
    if (req.query.memberId) q.memberId = req.query.memberId;

    const submissions = await PremiumNewsSubmission.find(q)
      .populate("member", "memberId name phone photo membershipStatus")
      .sort({ createdAt: -1 });

    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /premium/members/:memberId/news  — Member submits news */
export const submitNews = async (req, res) => {
  try {
    const member = await findByMemberId(req.params.memberId);
    if (!member) return res.status(404).json({ message: "Premium member not found" });

    if (member.membershipStatus !== "Active") {
      return res.status(403).json({ message: "Membership must be Active to submit news" });
    }

    // Count submissions in the current calendar year
    const year = new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    const yearCount = await PremiumNewsSubmission.countDocuments({
      member: member._id,
      createdAt: { $gte: start, $lt: end },
    });

    if (yearCount >= 12) {
      return res
        .status(400)
        .json({ message: "You have reached the 12 news submissions limit for this year" });
    }

    const { title, location, shortNews } = req.body;
    if (!title || !location || !shortNews) {
      return res.status(400).json({ message: "title, location, and shortNews are required" });
    }

    const submission = await PremiumNewsSubmission.create({
      member: member._id,
      memberId: member.memberId,
      title,
      location,
      shortNews,
      featuredImage: filePath(req.file),
    });

    await recalcNews(member._id);
    res.status(201).json({ submission, remaining: 12 - yearCount - 1 });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/** PUT /premium/news/:newsId  — Admin: edit news */
export const updatePremiumNews = async (req, res) => {
  try {
    const update = {};
    ["title", "location", "shortNews", "status", "adminNote"].forEach((k) => {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    });
    if (req.file) update.featuredImage = filePath(req.file);

    const submission = await PremiumNewsSubmission.findByIdAndUpdate(
      req.params.newsId,
      update,
      { new: true, runValidators: true }
    );
    if (!submission) return res.status(404).json({ message: "Premium news not found" });

    await recalcNews(submission.member);
    res.json({ submission });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/** PATCH /premium/news/:newsId/approve  — Admin */
export const approveNews = async (req, res) => {
  try {
    const submission = await PremiumNewsSubmission.findByIdAndUpdate(
      req.params.newsId,
      { status: "Approved" },
      { new: true }
    );
    if (!submission) return res.status(404).json({ message: "Premium news not found" });

    await recalcNews(submission.member);
    res.json({ submission });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** PATCH /premium/news/:newsId/reject  — Admin */
export const rejectNews = async (req, res) => {
  try {
    const submission = await PremiumNewsSubmission.findByIdAndUpdate(
      req.params.newsId,
      { status: "Rejected" },
      { new: true }
    );
    if (!submission) return res.status(404).json({ message: "Premium news not found" });

    await recalcNews(submission.member);
    res.json({ submission });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** DELETE /premium/news/:newsId  — Admin */
export const deletePremiumNews = async (req, res) => {
  try {
    const submission = await PremiumNewsSubmission.findByIdAndDelete(req.params.newsId);
    if (!submission) return res.status(404).json({ message: "Premium news not found" });

    removeFile(submission.featuredImage);
    await recalcNews(submission.member);
    res.json({ message: "Premium news deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /premium/stats  — Admin dashboard stats for premium */
export const getPremiumStats = async (_req, res) => {
  try {
    await refreshExpired();
    const [total, pending, active, rejected, suspended, expired, totalNewsSubmitted] =
      await Promise.all([
        PremiumMember.countDocuments(),
        PremiumMember.countDocuments({ membershipStatus: "Pending" }),
        PremiumMember.countDocuments({ membershipStatus: "Active" }),
        PremiumMember.countDocuments({ membershipStatus: "Rejected" }),
        PremiumMember.countDocuments({ membershipStatus: "Suspended" }),
        PremiumMember.countDocuments({ membershipStatus: "Expired" }),
        PremiumNewsSubmission.countDocuments(),
      ]);

    res.json({ total, pending, active, rejected, suspended, expired, totalNewsSubmitted });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
