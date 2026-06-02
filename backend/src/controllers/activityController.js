const { query } = require('../config/db');

// GET /api/activities
const list = async (req, res, next) => {
  try {
    const { entity, page = 1, limit = 50, userId, search, from, to } = req.query;
    const companyId = req.companyId;

    let where  = ['a.company_id = $1'];
    let params = [companyId];
    let idx    = 2;

    // Employees only see their own activity
    if (req.user.role === 'employee') {
      where.push(`a.user_id = $${idx++}`);
      params.push(req.user.id);
    } else if (userId) {
      where.push(`a.user_id = $${idx++}`);
      params.push(userId);
    }

    if (entity) {
      where.push(`a.entity_type = $${idx++}`);
      params.push(entity);
    }

    if (search) {
      where.push(`(a.description ILIKE $${idx} OR a.entity_id ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    if (from) {
      where.push(`a.created_at >= $${idx++}`);
      params.push(new Date(from));
    }

    if (to) {
      where.push(`a.created_at <= $${idx++}`);
      params.push(new Date(to));
    }

    const whereClause = 'WHERE ' + where.join(' AND ');
    const offset      = (parseInt(page) - 1) * parseInt(limit);

    const [activitiesRes, countRes] = await Promise.all([
      query(
        `SELECT a.id, a.action, a.description, a.entity_type, a.entity_id,
                a.metadata, a.ip_address, a.created_at,
                u.id AS user_id, u.name AS user_name, u.role AS user_role
         FROM activities a
         LEFT JOIN users u ON u.id = a.user_id
         ${whereClause}
         ORDER BY a.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, parseInt(limit), offset]
      ),
      query(
        `SELECT COUNT(*) FROM activities a LEFT JOIN users u ON u.id = a.user_id ${whereClause}`,
        params
      ),
    ]);

    res.json({
      success: true,
      activities: activitiesRes.rows.map(r => ({
        id:          r.id,
        action:      r.action,
        description: r.description,
        entityType:  r.entity_type,
        entityId:    r.entity_id,
        metadata:    r.metadata,
        ipAddress:   r.ip_address,
        createdAt:   r.created_at,
        user: {
          id:   r.user_id,
          name: r.user_name || 'System',
          role: r.user_role,
        },
      })),
      total: parseInt(countRes.rows[0].count),
      page:  parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) { next(err); }
};

module.exports = { list };