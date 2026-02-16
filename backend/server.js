// ============================================================
// Lavash Bakery Management — Express + MySQL API Server
// ============================================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(bodyParser.json());

// ── MySQL Connection Pool ──────────────────────────────────
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lavash_bakery',
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4',
});

// ============================================================
// CUSTOMERS
// ============================================================

// GET /customers — Return all customers ordered by name
app.get('/customers', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM customers ORDER BY name ASC'
        );
        res.json(rows);
    } catch (err) {
        console.error('GET /customers error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /customers — Add a new customer
app.post('/customers', async (req, res) => {
    try {
        const { name, phone } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Müşteri adı gereklidir.' });
        }

        const [result] = await pool.query(
            'INSERT INTO customers (name, phone) VALUES (?, ?)',
            [name.trim(), phone || null]
        );

        // Return the created customer
        const [rows] = await pool.query(
            'SELECT * FROM customers WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('POST /customers error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// PUT /customers/:id — Update customer info
app.put('/customers/:id', async (req, res) => {
    const { id } = req.params;
    const { name, phone } = req.body;

    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Müşteri adı gereklidir.' });
    }

    try {
        const [result] = await pool.query(
            'UPDATE customers SET name = ?, phone = ? WHERE id = ?',
            [name.trim(), phone || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Müşteri bulunamadı.' });
        }

        const [rows] = await pool.query(
            'SELECT * FROM customers WHERE id = ?',
            [id]
        );

        res.json(rows[0]);
    } catch (err) {
        console.error('PUT /customers/:id error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /customers/:id — Delete customer (check FK constraints first)
app.delete('/customers/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Check if customer has orders
        const [orders] = await pool.query(
            'SELECT COUNT(*) AS cnt FROM orders WHERE customer_id = ?',
            [id]
        );
        if (orders[0].cnt > 0) {
            return res.status(400).json({
                error: 'Bu müşterinin siparişleri var. Önce siparişleri silinmelidir.',
            });
        }

        // Check if customer has payments
        const [payments] = await pool.query(
            'SELECT COUNT(*) AS cnt FROM payments WHERE customer_id = ?',
            [id]
        );
        if (payments[0].cnt > 0) {
            return res.status(400).json({
                error: 'Bu müşterinin ödemeleri var. Önce ödemeler silinmelidir.',
            });
        }

        const [result] = await pool.query(
            'DELETE FROM customers WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Müşteri bulunamadı.' });
        }

        res.json({ message: 'Müşteri silindi.' });
    } catch (err) {
        console.error('DELETE /customers/:id error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// ORDERS
// ============================================================

// POST /orders — Bulk insert orders + update customer balances (transaction)
// Replicates: trg_order_insert trigger (current_balance += total_price)
app.post('/orders', async (req, res) => {
    const orders = req.body; // Array of { customer_id, quantity, unit_price, total_price, order_group_id }

    if (!Array.isArray(orders) || orders.length === 0) {
        return res.status(400).json({ error: 'Sipariş dizisi gereklidir.' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const insertedIds = [];

        for (const order of orders) {
            const { customer_id, quantity, unit_price, total_price, order_group_id } = order;

            // Insert the order
            const [result] = await conn.query(
                `INSERT INTO orders (customer_id, quantity, unit_price, total_price, order_group_id)
                 VALUES (?, ?, ?, ?, ?)`,
                [customer_id, quantity, unit_price, total_price, order_group_id || null]
            );
            insertedIds.push(result.insertId);

            // Update customer balance (simulate trigger: balance += total_price)
            await conn.query(
                'UPDATE customers SET current_balance = current_balance + ? WHERE id = ?',
                [total_price, customer_id]
            );
        }

        await conn.commit();
        res.status(201).json({ message: `${insertedIds.length} sipariş kaydedildi.`, ids: insertedIds });
    } catch (err) {
        await conn.rollback();
        console.error('POST /orders error:', err.message);
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
});

// ============================================================
// PAYMENTS
// ============================================================

// POST /payments — Add payment + decrease balance + auto-mark orders paid (transaction)
// Replicates:
//   1. trg_payment_insert trigger (current_balance -= amount)
//   2. tr_auto_complete_orders trigger (if balance <= 0, mark pending → paid)
app.post('/payments', async (req, res) => {
    const { customer_id, amount, note } = req.body;

    if (!customer_id || !amount) {
        return res.status(400).json({ error: 'customer_id ve amount gereklidir.' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Insert the payment
        const [result] = await conn.query(
            'INSERT INTO payments (customer_id, amount, note) VALUES (?, ?, ?)',
            [customer_id, amount, note || null]
        );

        // 2. Decrease customer balance (simulate trigger)
        await conn.query(
            'UPDATE customers SET current_balance = current_balance - ? WHERE id = ?',
            [amount, customer_id]
        );

        // 3. Check if balance <= 0 → auto-mark pending orders as 'paid'
        const [customerRows] = await conn.query(
            'SELECT current_balance FROM customers WHERE id = ?',
            [customer_id]
        );

        if (customerRows.length > 0 && parseFloat(customerRows[0].current_balance) <= 0) {
            await conn.query(
                "UPDATE orders SET status = 'paid' WHERE customer_id = ? AND status = 'pending'",
                [customer_id]
            );
        }

        await conn.commit();

        // Return the created payment
        const [paymentRows] = await pool.query(
            'SELECT * FROM payments WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json(paymentRows[0]);
    } catch (err) {
        await conn.rollback();
        console.error('POST /payments error:', err.message);
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
});

// ============================================================
// DASHBOARD
// ============================================================

// GET /dashboard — Today's production, revenue, active customers, total debt
app.get('/dashboard', async (req, res) => {
    try {
        // Today's start (midnight in server local time)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString().slice(0, 19).replace('T', ' ');

        // Today's orders
        const [todayOrders] = await pool.query(
            'SELECT quantity, total_price, customer_id FROM orders WHERE order_date >= ?',
            [todayISO]
        );

        let todayQuantity = 0;
        let todayRevenue = 0;
        const uniqueCustomers = new Set();

        for (const order of todayOrders) {
            todayQuantity += order.quantity || 0;
            todayRevenue += parseFloat(order.total_price) || 0;
            uniqueCustomers.add(order.customer_id);
        }

        // Total outstanding debt (sum of positive balances)
        const [customers] = await pool.query(
            'SELECT current_balance FROM customers WHERE current_balance > 0'
        );

        let totalDebt = 0;
        for (const c of customers) {
            totalDebt += parseFloat(c.current_balance);
        }

        res.json({
            todayQuantity,
            todayRevenue,
            todayCustomerCount: uniqueCustomers.size,
            totalDebt,
        });
    } catch (err) {
        console.error('GET /dashboard error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// REPORTS
// ============================================================

// GET /reports?date=YYYY-MM-DD — Get orders for a specific date with customer name
app.get('/reports', async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ error: 'date query parametresi gereklidir (YYYY-MM-DD).' });
        }

        // Build date range for the given day
        const dayStart = `${date} 00:00:00`;
        const dayEnd = `${date} 23:59:59`;

        const [rows] = await pool.query(
            `SELECT
                o.id,
                o.quantity,
                o.unit_price,
                o.total_price,
                o.status,
                o.customer_id,
                c.name AS customer_name,
                c.current_balance
             FROM orders o
             JOIN customers c ON c.id = o.customer_id
             WHERE o.order_date >= ? AND o.order_date <= ?
             ORDER BY c.name ASC`,
            [dayStart, dayEnd]
        );

        res.json(rows);
    } catch (err) {
        console.error('GET /reports error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// CUSTOMER DETAIL ENDPOINTS (for [id].tsx screens)
// ============================================================

// GET /customers/:id — Get a single customer with their orders and payments
app.get('/customers/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [customerRows] = await pool.query(
            'SELECT * FROM customers WHERE id = ?',
            [id]
        );

        if (customerRows.length === 0) {
            return res.status(404).json({ error: 'Müşteri bulunamadı.' });
        }

        const [orders] = await pool.query(
            'SELECT * FROM orders WHERE customer_id = ? ORDER BY order_date DESC',
            [id]
        );

        const [payments] = await pool.query(
            'SELECT * FROM payments WHERE customer_id = ? ORDER BY payment_date DESC',
            [id]
        );

        res.json({
            customer: customerRows[0],
            orders,
            payments,
        });
    } catch (err) {
        console.error('GET /customers/:id error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
    console.log(`🫓 Lavash Bakery API running on http://localhost:${PORT}`);
});
