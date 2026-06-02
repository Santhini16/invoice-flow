const { query } = require('../config/db');

// GET /api/dashboard/admin
const adminStats = async (req, res, next) => {
  try {
    const companyId = req.companyId;

    const [
      revenue, outstanding, invoiceCounts, clientCount,
      recentInvoices, statusBreakdown, monthlyRevenue, topClients
    ] = await Promise.all([
      // Total revenue (paid invoices)
      query(`SELECT COALESCE(SUM(total), 0) as total FROM invoices
             WHERE company_id = $1 AND status = 'paid'`, [companyId]),

      // Outstanding (sent + viewed + overdue)
      query(`SELECT COALESCE(SUM(total), 0) as total FROM invoices
            WHERE company_id = $1
AND status IN ('draft','sent','viewed')`, [companyId]),

      // Invoice counts
      query(`SELECT
         COUNT(*) FILTER (WHERE status = 'paid') as paid,

         COUNT(*) FILTER (
           WHERE status != 'paid'
           AND due_date < CURRENT_DATE
         ) as overdue,

         COUNT(*) as total
       FROM invoices
       WHERE company_id = $1`, [companyId]),
      // Client count
      query(`SELECT COUNT(*) as total FROM clients WHERE company_id = $1`, [companyId]),

      // Recent 10 invoices
      query(`SELECT i.id, i.invoice_number, i.status, i.total, i.issue_date, i.due_date,
                    c.name as client_name, u.name as created_by_name
             FROM invoices i
             JOIN clients c ON c.id = i.client_id
             JOIN users u ON u.id = i.created_by
             WHERE i.company_id = $1
             ORDER BY i.created_at DESC LIMIT 10`, [companyId]),

      // Status breakdown
      query(`SELECT status, COUNT(*) as count, COALESCE(SUM(total), 0) as amount
             FROM invoices WHERE company_id = $1
             GROUP BY status`, [companyId]),

      // Monthly revenue (last 12 months)
      query(`SELECT
               TO_CHAR(DATE_TRUNC('month', issue_date), 'Mon') as month,
               DATE_TRUNC('month', issue_date) as month_date,
               COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0) as collected,
               COALESCE(SUM(total), 0) as invoiced
             FROM invoices
             WHERE company_id = $1 AND issue_date >= NOW() - INTERVAL '12 months'
             GROUP BY DATE_TRUNC('month', issue_date)
             ORDER BY month_date`, [companyId]),

      // Top 5 clients by revenue
      query(`SELECT c.name, COALESCE(SUM(i.total) FILTER (WHERE i.status = 'paid'), 0) as revenue
             FROM clients c
             LEFT JOIN invoices i ON i.client_id = c.id
             WHERE c.company_id = $1
             GROUP BY c.id, c.name
             ORDER BY revenue DESC LIMIT 5`, [companyId]),
    ]);

    res.json({
      success: true,
      totalRevenue: parseFloat(revenue.rows[0].total),
      totalOutstanding: parseFloat(outstanding.rows[0].total),
      totalInvoices: parseInt(invoiceCounts.rows[0].total),
      paidInvoices: parseInt(invoiceCounts.rows[0].paid),
      overdueInvoices: parseInt(invoiceCounts.rows[0].overdue),
      totalClients: parseInt(clientCount.rows[0].total),
      recentInvoices: recentInvoices.rows.map(r => ({
        id: r.id,
        invoiceNumber: r.invoice_number,
       status:
  r.status !== 'paid' &&
  new Date(r.due_date) < new Date()
    ? 'overdue'
    : r.status,
        total: parseFloat(r.total),
        issueDate: r.issue_date,
        dueDate: r.due_date,
        client: { name: r.client_name },
        createdBy: { name: r.created_by_name },
      })),
      statusBreakdown: statusBreakdown.rows.map(r => ({
        name: r.status.charAt(0).toUpperCase() + r.status.slice(1),
        value: parseInt(r.count),
        amount: parseFloat(r.amount),
        color: { paid: '#10b981', sent: '#3b82f6', draft: '#94a3b8', overdue: '#ef4444', viewed: '#8b5cf6' }[r.status] || '#94a3b8',
      })),
      monthlyRevenue: monthlyRevenue.rows.map(r => ({
        month: r.month,
        revenue: parseFloat(r.invoiced),
        collected: parseFloat(r.collected),
      })),
      topClients: topClients.rows.map(r => ({ name: r.name, revenue: parseFloat(r.revenue) })),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/employee
const employeeStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const companyId = req.companyId;

    const [totals, recentInvoices, monthly] = await Promise.all([
      query(`SELECT
               COUNT(*) as total_invoices,
               COALESCE(SUM(total), 0) as total_billed,
               COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0) as collected,
               COALESCE(SUM(total) FILTER (WHERE status IN ('sent','viewed','overdue')), 0) as outstanding
             FROM invoices WHERE created_by = $1`, [userId]),

      query(`SELECT i.id, i.invoice_number, i.status, i.total, i.issue_date, i.due_date,
                    c.name as client_name
             FROM invoices i
             JOIN clients c ON c.id = i.client_id
             WHERE i.created_by = $1
             ORDER BY i.created_at DESC LIMIT 5`, [userId]),

      query(`SELECT
               TO_CHAR(DATE_TRUNC('month', issue_date), 'Mon') as month,
               COUNT(*) as invoices,
               COALESCE(SUM(total), 0) as amount
             FROM invoices
             WHERE created_by = $1 AND issue_date >= NOW() - INTERVAL '6 months'
             GROUP BY DATE_TRUNC('month', issue_date)
             ORDER BY DATE_TRUNC('month', issue_date)`, [userId]),
    ]);

    const t = totals.rows[0];
    res.json({
      success: true,
      totalInvoices: parseInt(t.total_invoices),
      totalBilled: parseFloat(t.total_billed),
      collected: parseFloat(t.collected),
      outstanding: parseFloat(t.outstanding),
      recentInvoices: recentInvoices.rows.map(r => ({
        id: r.id,
        invoiceNumber: r.invoice_number,
        status: r.status,
        total: parseFloat(r.total),
        issueDate: r.issue_date,
        dueDate: r.due_date,
        client: { name: r.client_name },
      })),
      monthly: monthly.rows.map(r => ({
        month: r.month,
        invoices: parseInt(r.invoices),
        amount: parseFloat(r.amount),
      })),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { adminStats, employeeStats };