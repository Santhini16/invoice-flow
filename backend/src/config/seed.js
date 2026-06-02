const { pool } = require('./db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding database...');
    await client.query('BEGIN');

    // Company
    const companyRes = await client.query(`
      INSERT INTO companies (name, address, city, state, pincode, gstin, pan, email, phone, website,
        bank_name, account_number, ifsc, invoice_prefix, payment_terms, default_notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      ON CONFLICT DO NOTHING RETURNING id`,
      ['InvoiceFlow Demo Pvt Ltd', '123 Business Park, Andheri East', 'Mumbai', 'Maharashtra', '400069',
        '27AABCI1234A1ZK', 'AABCI1234A', 'billing@demo.com', '+91 22 4567 8900', 'https://demo.com',
        'HDFC Bank', '50200012345678', 'HDFC0001234', 'INV', 30,
        'Payment due within 30 days. Thank you for your business!']
    );
    const companyId = companyRes.rows[0]?.id;
    if (!companyId) { console.log('Company already exists, skipping seed.'); return; }

    // Admin user
    const adminHash = await bcrypt.hash('admin123', 12);
    const adminRes = await client.query(`
      INSERT INTO users (company_id, name, email, password_hash, role, department, phone)
      VALUES ($1,$2,$3,$4,'admin','Management','+91 98765 43210') RETURNING id`,
      [companyId, 'Admin User', 'admin@demo.com', adminHash]
    );
    const adminId = adminRes.rows[0].id;

    // Employee users
    const empHash = await bcrypt.hash('emp123', 12);
    const emp1Res = await client.query(`
      INSERT INTO users (company_id, name, email, password_hash, role, department, phone)
      VALUES ($1,'Rahul Mehta','emp@demo.com',$2,'employee','Sales','+91 87654 32109') RETURNING id`,
      [companyId, empHash]
    );
    const emp1Id = emp1Res.rows[0].id;

    await client.query(`
      INSERT INTO users (company_id, name, email, password_hash, role, department)
      VALUES ($1,'Priya Sharma','priya@demo.com',$2,'employee','Finance')`,
      [companyId, empHash]
    );

    // Clients
    const clients = [
      ['Tata Consultancy Services', 'billing@tcs.com', '+91 22 6778 9000', 'TCS House, Fort, Mumbai 400001', 'Mumbai', 'Maharashtra', '27AAACT2727Q1ZW'],
      ['Infosys Limited', 'accounts@infosys.com', '+91 80 2852 0261', 'Electronics City, Bengaluru 560100', 'Bengaluru', 'Karnataka', '29AABCI1681B1ZK'],
      ['Wipro Technologies', 'ap@wipro.com', '+91 80 2844 0011', 'Sarjapur Road, Bengaluru 560035', 'Bengaluru', 'Karnataka', '29AAACW0306D2ZH'],
      ['HCL Services Ltd', 'finance@hcl.com', '+91 120 432 1234', 'Sector 126, Noida 201303', 'Noida', 'Uttar Pradesh', '09AAACH0392F1ZY'],
      ['Mahindra & Mahindra', 'vendor@mahindra.com', '+91 22 2490 1441', 'Gateway Building, Apollo Bunder, Mumbai 400001', 'Mumbai', 'Maharashtra', '27AAACM3025E1ZN'],
    ];

    const clientIds = [];
    for (const [name, email, phone, address, city, state, gstin] of clients) {
      const r = await client.query(`
        INSERT INTO clients (company_id, created_by, name, email, phone, address, city, state, gstin)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [companyId, adminId, name, email, phone, address, city, state, gstin]
      );
      clientIds.push(r.rows[0].id);
    }

    // Sample invoices
    const invoiceData = [
      { clientIdx: 0, status: 'paid', total: 450000, gstRate: 18, items: [{ desc: 'Web Development Services', qty: 1, price: 381355, hsn: '998314' }] },
      { clientIdx: 1, status: 'sent', total: 120000, gstRate: 18, items: [{ desc: 'Cloud Consulting', qty: 2, price: 50847, hsn: '998313' }] },
      { clientIdx: 2, status: 'overdue', total: 785000, gstRate: 18, items: [{ desc: 'ERP Implementation', qty: 1, price: 665254, hsn: '998314' }] },
      { clientIdx: 3, status: 'viewed', total: 230000, gstRate: 18, items: [{ desc: 'IT Support Services', qty: 1, price: 194915, hsn: '998313' }] },
      { clientIdx: 4, status: 'draft', total: 95000, gstRate: 18, items: [{ desc: 'Brand Consulting', qty: 1, price: 80508, hsn: '998390' }] },
    ];

    for (let i = 0; i < invoiceData.length; i++) {
      const d = invoiceData[i];
      const subtotal = d.items.reduce((s, it) => s + it.qty * it.price, 0);
      const gstAmt = subtotal * (d.gstRate / 100);
      const total = subtotal + gstAmt;
      const invNum = `INV-2402-${String(i + 1).padStart(4, '0')}`;
      const issueDate = new Date(Date.now() - (i + 1) * 3 * 24 * 60 * 60 * 1000);
      const dueDate = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      const invRes = await client.query(`
        INSERT INTO invoices (company_id, client_id, created_by, invoice_number, status,
          issue_date, due_date, gst_rate, gst_type, discount, subtotal, discount_amount,
          taxable_amount, gst_amount, igst_amount, total, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'IGST',0,$9,0,$9,$10,$10,$11,$12) RETURNING id`,
        [companyId, clientIds[d.clientIdx], emp1Id, invNum, d.status,
          issueDate.toISOString().split('T')[0], dueDate.toISOString().split('T')[0],
          d.gstRate, subtotal, gstAmt, total,
          'Payment due within 30 days. Thank you for your business!']
      );
      const invId = invRes.rows[0].id;

      for (let j = 0; j < d.items.length; j++) {
        const it = d.items[j];
        await client.query(`
          INSERT INTO invoice_items (invoice_id, description, hsn, unit, quantity, price, sort_order)
          VALUES ($1,$2,$3,'Nos',$4,$5,$6)`,
          [invId, it.desc, it.hsn, it.qty, it.price, j]
        );
      }

      // Activity log
      await client.query(`
        INSERT INTO activities (company_id, user_id, action, description, entity_type, entity_id)
        VALUES ($1,$2,'invoice_created',$3,'invoice',$4)`,
        [companyId, emp1Id, `Invoice ${invNum} created`, invNum]
      );

      if (d.status !== 'draft') {
        await client.query(`
          INSERT INTO activities (company_id, user_id, action, description, entity_type, entity_id)
          VALUES ($1,$2,'invoice_sent',$3,'invoice',$4)`,
          [companyId, emp1Id, `Invoice ${invNum} sent to client`, invNum]
        );
      }
      if (d.status === 'paid') {
        await client.query(`
          INSERT INTO payments (invoice_id, company_id, amount, method, status)
          VALUES ($1,$2,$3,'online','completed')`,
          [invId, companyId, total]
        );
        await client.query(`
          INSERT INTO activities (company_id, user_id, action, description, entity_type, entity_id)
          VALUES ($1,$2,'invoice_paid',$3,'invoice',$4)`,
          [companyId, adminId, `Invoice ${invNum} marked as paid`, invNum]
        );
      }
    }

    await client.query('COMMIT');
    console.log('✅ Seed complete!');
    console.log('   Admin:    admin@demo.com / admin123');
    console.log('   Employee: emp@demo.com   / emp123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();