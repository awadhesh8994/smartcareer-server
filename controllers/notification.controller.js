import { Notification } from "../models/index.models.js";

// ── GET /api/notifications ────────────────────────────────────────
export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ userId: req.user._id, read: false });
    res.json({ success: true, data: notifications, unreadCount });
  } catch (e) { next(e); }
};

// ── PATCH /api/notifications/:id/read ────────────────────────────
export const markAsRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true }
    );
    res.json({ success: true, message: "Marked as read." });
  } catch (e) { next(e); }
};

// ── PATCH /api/notifications/read-all ────────────────────────────
export const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
    res.json({ success: true, message: "All notifications marked as read." });
  } catch (e) { next(e); }
};

// ── DELETE /api/notifications/:id ────────────────────────────────
export const deleteNotification = async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true, message: "Notification deleted." });
  } catch (e) { next(e); }
};
