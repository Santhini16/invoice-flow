const { query } = require('../config/db');

// GET /api/reports/revenue
const revenue = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const companyId = req.companyId;

    const [monthly, topClients, summary, byEmployee] = await Promise.all([

      // Monthly invoiced vs collected
      query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', issue_date), 'Mon') AS month,
          DATE_TRUNC('month', issue_date)                 AS month_date,
          COALESCE(SUM(total), 0)                         AS invoiced,
          COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0) AS collected,
          COUNT(*)                                        AS invoice_count
        FROM invoices
        WHERE company_id = $1
          AND EXTRACT(YEAR FROM issue_date) = $2
        GROUP BY DATE_TRUNC('month', issue_date)
        ORDER BY month_date`,
        [companyId, year]),

      // Top 10 clients by revenue
      query(`
        SELECT
          c.name,
          COALESCE(SUM(i.total), 0)                         AS total_billed,
          COALESCE(SUM(i.total) FILTER (WHERE i.status = 'paid'), 0) AS collected,
          COUNT(i.id)                                       AS invoice_count
        FROM clients c
        LEFT JOIN invoices i
          ON i.client_id = c.id
          AND EXTRACT(YEAR FROM i.issue_date) = $2
        WHERE c.company_id = $1
        GROUP BY c.id, c.name
        ORDER BY total_billed DESC
        LIMIT 10`,
        [companyId, year]),

      // Full-year summary
      query(`
        SELECT
          COALESCE(SUM(total), 0)                         AS total_invoiced,
          COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0)    AS total_collected,
          COALESCE(SUM(gst_amount), 0)                    AS total_gst,
          COALESCE(SUM(discount_amount), 0)               AS total_discount,
          COUNT(*)                                        AS total_invoices,
          COUNT(*) FILTER (WHERE status = 'paid')         AS paid_count,
          COUNT(*) FILTER (WHERE status = 'overdue')      AS overdue_count,
          COUNT(*) FILTER (WHERE status = 'draft')        AS draft_count,
          COUNT(*) FILTER (WHERE status = 'sent')         AS sent_count
        FROM invoices
        WHERE company_id = $1
          AND EXTRACT(YEAR FROM issue_date) = $2`,
        [companyId, year]),

      // Revenue by employee
      query(`
        SELECT
          u.name                                          AS employee,
          COALESCE(SUM(i.total), 0)                       AS total_billed,
          COALESCE(SUM(i.total) FILTER (WHERE i.status = 'paid'), 0) AS collected,
          COUNT(i.id)                                     AS invoice_count
        FROM users u
        LEFT JOIN invoices i
          ON i.created_by = u.id
          AND EXTRACT(YEAR FROM i.issue_date) = $2
        WHERE u.company_id = $1
          AND u.role = 'employee'
        GROUP BY u.id, u.name
        ORDER BY total_billed DESC`,
        [companyId, year]),
    ]);

    res.json({
      success: true,
      year: parseInt(year),
      monthly: monthly.rows.map(r => ({
        month:        r.month,
        invoiced:     parseFloat(r.invoiced),
        collected:    parseFloat(r.collected),
        invoiceCount: parseInt(r.invoice_count),
      })),
      topClients: topClients.rows.map(r => ({
        name:         r.name,
        totalBilled:  parseFloat(r.total_billed),
        collected:    parseFloat(r.collected),
        invoiceCount: parseInt(r.invoice_count),
      })),
      summary: {
        totalInvoiced:   parseFloat(summary.rows[0].total_invoiced),
        totalCollected:  parseFloat(summary.rows[0].total_collected),
        totalGST:        parseFloat(summary.rows[0].total_gst),
        totalDiscount:   parseFloat(summary.rows[0].total_discount),
        totalInvoices:   parseInt(summary.rows[0].total_invoices),
        paidCount:       parseInt(summary.rows[0].paid_count),
        overdueCount:    parseInt(summary.rows[0].overdue_count),
        draftCount:      parseInt(summary.rows[0].draft_count),
        sentCount:       parseInt(summary.rows[0].sent_count),
        collectionRate:  summary.rows[0].total_invoiced > 0
          ? Math.round((summary.rows[0].total_collected / summary.rows[0].total_invoiced) * 100)
          : 0,
      },
      byEmployee: byEmployee.rows.map(r => ({
        employee:     r.employee,
        totalBilled:  parseFloat(r.total_billed),
        collected:    parseFloat(r.collected),
        invoiceCount: parseInt(r.invoice_count),
      })),
    });
  } catch (err) { next(err); }
};

// GET /api/reports/gst
const gst = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const companyId = req.companyId;

    const [monthly, summary, byType] = await Promise.all([

      // Monthly GST breakdown
      query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', issue_date), 'Mon') AS month,
          DATE_TRUNC('month', issue_date)                 AS month_date,
          COALESCE(SUM(taxable_amount), 0)                AS taxable,
          COALESCE(SUM(igst_amount), 0)                   AS igst,
          COALESCE(SUM(cgst_amount), 0)                   AS cgst,
          COALESCE(SUM(sgst_amount), 0)                   AS sgst,
          COALESCE(SUM(gst_amount), 0)                    AS total_gst,
          COUNT(*)                                        AS invoice_count
        FROM invoices
        WHERE company_id = $1
          AND EXTRACT(YEAR FROM issue_date) = $2
        GROUP BY DATE_TRUNC('month', issue_date)
        ORDER BY month_date`,
        [companyId, year]),

      // Annual GST summary
      query(`
        SELECT
          COALESCE(SUM(taxable_amount), 0) AS total_taxable,
          COALESCE(SUM(igst_amount), 0)    AS total_igst,
          COALESCE(SUM(cgst_amount), 0)    AS total_cgst,
          COALESCE(SUM(sgst_amount), 0)    AS total_sgst,
          COALESCE(SUM(gst_amount), 0)     AS total_gst
        FROM invoices
        WHERE company_id = $1
          AND EXTRACT(YEAR FROM issue_date) = $2`,
        [companyId, year]),

      // GST by rate slab
      query(`
        SELECT
          gst_rate,
          COUNT(*)                         AS invoice_count,
          COALESCE(SUM(taxable_amount), 0) AS taxable,
          COALESCE(SUM(gst_amount), 0)     AS gst_collected
        FROM invoices
        WHERE company_id = $1
          AND EXTRACT(YEAR FROM issue_date) = $2
        GROUP BY gst_rate
        ORDER BY gst_rate`,
        [companyId, year]),
    ]);

    res.json({
      success: true,
      year: parseInt(year),
      monthly: monthly.rows.map(r => ({
        month:        r.month,
        taxable:      parseFloat(r.taxable),
        igst:         parseFloat(r.igst),
        cgst:         parseFloat(r.cgst),
        sgst:         parseFloat(r.sgst),
        totalGST:     parseFloat(r.total_gst),
        invoiceCount: parseInt(r.invoice_count),
      })),
      summary: {
        totalTaxable: parseFloat(summary.rows[0].total_taxable),
        totalIGST:    parseFloat(summary.rows[0].total_igst),
        totalCGST:    parseFloat(summary.rows[0].total_cgst),
        totalSGST:    parseFloat(summary.rows[0].total_sgst),
        totalGST:     parseFloat(summary.rows[0].total_gst),
      },
      bySlabs: byType.rows.map(r => ({
        rate:         parseFloat(r.gst_rate),
        invoiceCount: parseInt(r.invoice_count),
        taxable:      parseFloat(r.taxable),
        gstCollected: parseFloat(r.gst_collected),
      })),
    });
  } catch (err) { next(err); }
};

// GET /api/reports/profit-loss
const profitLoss = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const companyId = req.companyId;

    const result = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', issue_date), 'Mon')  AS month,
        DATE_TRUNC('month', issue_date)                  AS month_date,
        COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0) AS revenue,
        COALESCE(SUM(gst_amount) FILTER (WHERE status = 'paid'), 0) AS gst_collected,
        COALESCE(SUM(taxable_amount) FILTER (WHERE status = 'paid'), 0) AS net_revenue
      FROM invoices
      WHERE company_id = $1
        AND EXTRACT(YEAR FROM issue_date) = $2
      GROUP BY DATE_TRUNC('month', issue_date)
      ORDER BY month_date`,
      [companyId, year]);

    const rows = result.rows.map(r => {
      const revenue     = parseFloat(r.revenue);
      // Estimated operating expenses at 22% of revenue (placeholder — replace with actual expense tracking)
      const expenses    = Math.round(revenue * 0.22);
      const grossProfit = revenue - expenses;
      const margin      = revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0;
      return {
        month:        r.month,
        revenue,
        expenses,
        grossProfit,
        margin,
        gstCollected: parseFloat(r.gst_collected),
        netRevenue:   parseFloat(r.net_revenue),
      };
    });

    const totals = rows.reduce((acc, r) => ({
      revenue:     acc.revenue + r.revenue,
      expenses:    acc.expenses + r.expenses,
      grossProfit: acc.grossProfit + r.grossProfit,
    }), { revenue: 0, expenses: 0, grossProfit: 0 });

    res.json({
      success: true,
      year: parseInt(year),
      monthly: rows,
      totals: {
        ...totals,
        margin: totals.revenue > 0 ? Math.round((totals.grossProfit / totals.revenue) * 100) : 0,
      },
    });
  } catch (err) { next(err); }
};

module.exports = { revenue, gst, profitLoss };