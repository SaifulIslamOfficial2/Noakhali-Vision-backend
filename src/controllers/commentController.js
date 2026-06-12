import Comment from "../models/Comment.js";
import News from "../models/News.js";

export const getComments = async (req, res) => {
  try {
    const news = await News.findOne({ slug: req.params.slug, status: "published" });
    if (!news) return res.json({ comments: [] });
    const comments = await Comment.find({ news: news._id, approved: true }).sort({ createdAt: -1 });
    res.json({ comments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const addComment = async (req, res) => {
  try {
    const news = await News.findOne({ slug: req.params.slug, status: "published" });
    if (!news) return res.status(404).json({ message: "News not found" });
    const { name, content } = req.body;
    if (!name?.trim() || !content?.trim())
      return res.status(400).json({ message: "Name and content required" });
    const comment = await Comment.create({
      news: news._id,
      name: name.trim().slice(0, 60),
      content: content.trim().slice(0, 500),
    });
    res.status(201).json({ comment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteComment = async (req, res) => {
  try {
    await Comment.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
