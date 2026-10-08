const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Serve static frontend files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Connect to centralized SQLite database stored permanently on the server disk
const dbPath = path.resolve(__dirname, 'adis_alamyahu.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Database connection error:", err.message);
    } else {
        console.log("Connected to centralized SQLite database on server.");
    }
});

// Initialize Tables and Default Baseline Data
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT, role TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS hremployees (id INTEGER PRIMARY KEY AUTOINCREMENT, fullname TEXT, department TEXT, position TEXT, phone TEXT, recorded_by TEXT, recorded_date TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS storeitems (id INTEGER PRIMARY KEY AUTOINCREMENT, item_code TEXT, item_name TEXT, category TEXT, qty REAL, unit TEXT, unit_cost REAL, recorded_by TEXT, recorded_date TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS storereleases (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, item_id INTEGER, item_code TEXT, item_name TEXT, qty_released REAL, recipient TEXT, project_site TEXT, recorded_by TEXT, recorded_date TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS siteincome (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, category TEXT, client TEXT, amount REAL, recorded_by TEXT, recorded_date TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS siteexpenses (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, category TEXT, description TEXT, amount REAL, recorded_by TEXT, recorded_date TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS purchases (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, item TEXT, qty REAL, cost REAL, status TEXT, recorded_by TEXT, recorded_date TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS fuel (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, equipment TEXT, operator TEXT, litres REAL, recorded_by TEXT, recorded_date TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS machines (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, machine TEXT, hours REAL, status TEXT, recorded_by TEXT, recorded_date TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS dumptrucks (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, truck TEXT, trips INTEGER, volume REAL, recorded_by TEXT, recorded_date TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS pettycash (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, description TEXT, amount REAL, recorded_by TEXT, recorded_date TEXT)`);

    // Seed default records if users table is empty
    db.get(`SELECT COUNT(*) as count FROM users`, (err, row) => {
        if (row && row.count === 0) {
            const nowStr = new Date().toLocaleString();
            const todayStr = new Date().toISOString().slice(0, 10);

            db.run(`INSERT INTO users (username, password, role) VALUES ('manager', '123', 'manager')`);
            db.run(`INSERT INTO users (username, password, role) VALUES ('hrstaff', '123', 'hr')`);
            db.run(`INSERT INTO users (username, password, role) VALUES ('finance', '123', 'finance')`);
            db.run(`INSERT INTO users (username, password, role) VALUES ('operator', '123', 'operator')`);
            db.run(`INSERT INTO users (username, password, role) VALUES ('fleet', '123', 'fleet')`);

            db.run(`INSERT INTO storeitems (item_code, item_name, category, qty, unit, unit_cost, recorded_by, recorded_date) VALUES ('MTR-001', 'Portland Cement (Dangote)', 'Building Materials', 450, 'Bags', 1150, 'manager', '${nowStr}')`);
            db.run(`INSERT INTO storeitems (item_code, item_name, category, qty, unit, unit_cost, recorded_by, recorded_date) VALUES ('MTR-002', 'Rebar 12mm Deformed', 'Structural Steel', 120, 'Bundles', 8500, 'manager', '${nowStr}')`);
            db.run(`INSERT INTO siteincome (date, category, client, amount, recorded_by, recorded_date) VALUES ('${todayStr}', 'Aggregate Sales', 'Awash Construction Plc', 150000, 'manager', '${nowStr}')`);
            db.run(`INSERT INTO siteexpenses (date, category, description, amount, recorded_by, recorded_date) VALUES ('${todayStr}', 'Utilities', 'Monthly Electric Power Bill', 24000, 'manager', '${nowStr}')`);
            db.run(`INSERT INTO purchases (date, item, qty, cost, status, recorded_by, recorded_date) VALUES ('${todayStr}', 'Hydraulic Oil ISO 68', 5, 12500, 'Pending', 'manager', '${nowStr}')`);
            console.log("Default baseline records seeded into server SQLite database.");
        }
    });
});

// --- REST API ENDPOINTS ---

app.get('/api/:table', (req, res) => {
    const table = req.params.table;
    const allowedTables = ['users', 'hremployees', 'storeitems', 'storereleases', 'siteincome', 'siteexpenses', 'purchases', 'fuel', 'machines', 'dumptrucks', 'pettycash'];
    
    if (!allowedTables.includes(table)) {
        return res.status(400).json({ error: "Invalid table name" });
    }

    db.all(`SELECT * FROM ${table} ORDER BY id DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/:table', (req, res) => {
    const table = req.params.table;
    const data = req.body;
    const keys = Object.keys(data);
    const values = Object.values(data);

    if (keys.length === 0) return res.status(400).json({ error: "No data provided" });

    const placeholders = keys.map(() => '?').join(',');
    const query = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;

    db.run(query, values, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, success: true });
    });
});

app.put('/api/:table/:id', (req, res) => {
    const { table, id } = req.params;
    const data = req.body;
    const keys = Object.keys(data);
    const values = Object.values(data);

    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const query = `UPDATE ${table} SET ${setClause} WHERE id = ?`;

    db.run(query, [...values, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: this.changes, success: true });
    });
});

app.delete('/api/:table/:id', (req, res) => {
    const { table, id } = req.params;
    db.run(`DELETE FROM ${table} WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes, success: true });
    });
});

// Secure Atomic Transaction for Store Releases & Inventory Stock Deduction
app.post('/api/store-release', (req, res) => {
    const { itemId, qtyReleased, releaseData } = req.body;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.get(`SELECT qty, unit FROM storeitems WHERE id = ?`, [itemId], (err, row) => {
            if (err || !row) {
                db.run('ROLLBACK');
                return res.status(400).json({ error: "Item not found in store inventory." });
            }

            if (row.qty < qtyReleased) {
                db.run('ROLLBACK');
                return res.status(400).json({ error: `Insufficient stock. Available: ${row.qty} ${row.unit}` });
            }

            const newQty = row.qty - qtyReleased;

            db.run(`UPDATE storeitems SET qty = ? WHERE id = ?`, [newQty, itemId], (err) => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }

                const keys = Object.keys(releaseData);
                const values = Object.values(releaseData);
                const placeholders = keys.map(() => '?').join(',');
                const insertQuery = `INSERT INTO storereleases (${keys.join(',')}) VALUES (${placeholders})`;

                db.run(insertQuery, values, function(err) {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: err.message });
                    }

                    db.run('COMMIT');
                    res.json({ success: true, remainingQty: newQty });
                });
            });
        });
    });
});

// Fallback to index.html for root routing in panel deployments
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Hosting panels (like cPanel) automatically assign process.env.PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running and listening on port ${PORT}`);
});