import News from "../models/News.js";
import Company from "../models/Company.js";
import Ad from "../models/Ad.js";
import Visitor from "../models/Visitor.js";
import PremiumMember from "../models/PremiumMember.js";
import PremiumNewsSubmission from "../models/PremiumNewsSubmission.js";

export async function getStats(_, res) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    await PremiumMember.updateMany(
      { membershipStatus: "Active", expiryDate: { $lt: new Date() } },
      { $set: { membershipStatus: "Expired" } }
    );
    const [
      totalNews, publishedNews, draftNews,
      totalCompanies, totalAds,
      totalVisitors, todayVisitors,
      totalPremiumMembers, pendingPremiumMembers,
      activePremiumMembers, expiredPremiumMembers,
      totalPremiumNewsSubmitted,
    ] = await Promise.all([
      News.countDocuments(),
      News.countDocuments({ status: "published" }),
      News.countDocuments({ status: "draft" }),
      Company.countDocuments(),
      Ad.countDocuments(),
      Visitor.countDocuments(),
      Visitor.countDocuments({ dateKey: today }),
      PremiumMember.countDocuments(),
      PremiumMember.countDocuments({ membershipStatus: "Pending" }),
      PremiumMember.countDocuments({ membershipStatus: "Active" }),
      PremiumMember.countDocuments({ membershipStatus: "Expired" }),
      PremiumNewsSubmission.countDocuments(),
    ]);
    res.json({
      totalNews, publishedNews, draftNews,
      totalCompanies, totalAds,
      totalVisitors, todayVisitors,
      totalPremiumMembers, pendingPremiumMembers,
      activePremiumMembers, expiredPremiumMembers,
      totalPremiumNewsSubmitted,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
