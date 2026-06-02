const { query } = require('../config/db');

/**
 * Log an activity AND create a notification for relevant users.
 */
const log = async ({
  companyId, userId, action, description,
  entityType, entityId, metadata, ip,
}) => {
  try {
    // 1. Insert activity row
    await query(
      `INSERT INTO activities
         (company_id, user_id, action, description, entity_type, entity_id, metadata, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        companyId, userId || null, action, description,
        entityType || null, entityId || null,
        metadata ? JSON.stringify(metadata) : null,
        ip || null,
      ]
    );

    // 2. Create notifications for admins in the same company
    const admins = await query(
      `SELECT id FROM users WHERE company_id = $1 AND role = 'admin' AND is_active = true`,
      [companyId]
    );

    // Map actions to friendly titles
    const notifMap = {
      invoice_paid:    { title: '💰 Payment Received',    type: 'payment'  },
      invoice_created: { title: '📄 New Invoice Created', type: 'invoice'  },
      invoice_sent:    { title: '📤 Invoice Sent',        type: 'invoice'  },
      invoice_viewed:  { title: '👀 Invoice Viewed',      type: 'invoice'  },
      invoice_overdue: { title: '⚠️ Invoice Overdue',     type: 'alert'    },
      client_created:  { title: '🤝 New Client Added',    type: 'client'   },
      employee_added:  { title: '👤 Employee Added',      type: 'employee' },
      user_login:      null, // don't notify on login
    };

    const notifConfig = notifMap[action];
    if (notifConfig) {
      for (const admin of admins.rows) {
        // Don't notify the admin about their own actions
        if (admin.id === userId) continue;
        await query(
          `INSERT INTO notifications (user_id, title, message, type)
           VALUES ($1,$2,$3,$4)`,
          [admin.id, notifConfig.title, description, notifConfig.type]
        );
      }

      // Also notify the employee who created the invoice if someone else paid it
      if (action === 'invoice_paid' && entityId) {
        const invRes = await query(
          `SELECT created_by FROM invoices WHERE invoice_number = $1`,
          [entityId]
        );
        if (invRes.rows[0]?.created_by && invRes.rows[0].created_by !== userId) {
          await query(
            `INSERT INTO notifications (user_id, title, message, type)
             VALUES ($1,$2,$3,'payment')`,
            [invRes.rows[0].created_by, '💰 Your invoice was paid!', description]
          );
        }
      }
    }
  } catch (err) {
    // Non-critical — never crash the request
    console.error('[activityService] error:', err.message);
  }
};

module.exports = { log };