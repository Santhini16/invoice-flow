const { query } = require('../config/db');

// GET /api/notifications
const list = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where  = 'user_id = $1';
    let params = [req.user.id];

    if (unreadOnly === 'true') {
      where += ' AND is_read = false';
    }

    const [notifs, countRes, unreadRes] = await Promise.all([
      query(
        `SELECT * FROM notifications WHERE ${where}
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [...params, parseInt(limit), offset]
      ),
      query(`SELECT COUNT(*) FROM notifications WHERE ${where}`, params),
      query(`SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`, [req.user.id]),
    ]);

    res.json({
      success:     true,
      notifications: notifs.rows,
      total:       parseInt(countRes.rows[0].count),
      unreadCount: parseInt(unreadRes.rows[0].count),
    });
  } catch (err) { next(err); }
};

// PATCH /api/notifications/:id/read
const markRead = async (req, res, next) => {
  try {
    await query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Marked as read' });
  } catch (err) { next(err); }
};

// PATCH /api/notifications/read-all
const markAllRead = async (req, res, next) => {
  try {
    await query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) { next(err); }
};

// DELETE /api/notifications/:id
const remove = async (req, res, next) => {
  try {
    await query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) { next(err); }
};

// Helper: create a notification for a user
const createNotification = async ({ userId, title, message, type, link }) => {
  try {
    await query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, title, message, type || 'info', link || null]
    );
  } catch (err) {
    console.error('Notification create error:', err.message);
  }
};

module.exports = { list, markRead, markAllRead, remove, createNotification };