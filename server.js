const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Request logger for cPanel debugging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Serve static frontend files from public folder
app.use(express.static(path.join(__dirname, 'public')));

const dataFile = path.join(__dirname, 'database.json');

// In-memory fallback store if disk writing is restricted by cPanel permissions
let memoryStore = {
    users: [
        { id: 1, username: 'manager', password: '123', role: 'manager' },
        { id: 2, username: 'hrstaff', password: '123', role: 'hr' },
        { id: 3, username: 'finance', password: '123', role: 'finance' },
        { id: 4, username: 'operator', password: '123', role: 'operator' },
        { id: 5, username: 'fleet', password: '123', role: 'fleet' }
    ],
    hremployees: [],
    storeitems: [
        { id: 1, item_code: 'MTR-001', item_name: 'Portland Cement', category: 'Building Materials', qty: 450, unit: 'Bags', unit_cost: 1150, recorded_by: 'manager', recorded_date: new Date().toLocaleString() }
    ],
    storereleases: [],
    siteincome: [
        { id: 1, date: new Date().toISOString().slice(0, 10), category: 'Aggregate Sales', client: 'Awash Construction', amount: 150000, recorded_by: 'manager', recorded_date: new Date().toLocaleString() }
    ],
    siteexpenses: [],
    purchases: [],
    fuel: [],
    machines: [],
    dumptrucks: [],
    pettycash: []
};

function readData() {
    try {
        if (!fs.existsSync(dataFile)) {
            fs.writeFileSync(dataFile, JSON.stringify(memoryStore, null, 2));
            return memoryStore;
        }
        const raw = fs.readFileSync(dataFile, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        console.log("Using in-memory store due to file permissions:", e.message);
        return memoryStore;
    }
}

function writeData(data) {
    memoryStore = data;
    try {
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    } catch (e) {
        console.log("Disk write skipped (using memory):", e.message);
    }
}

// --- REST API ENDPOINTS ---

app.get('/api/:table', (req, res) => {
    const table = req.params.table;
    const data = readData();
    if (!data[table]) return res.status(400).json({ error: "Invalid table" });
    res.json(data[table]);
});

app.post('/api/:table', (req, res) => {
    const table = req.params.table;
    const data = readData();
    if (!data[table]) return res.status(400).json({ error: "Invalid table" });

    const newItem = { id: Date.now(), ...req.body };
    data[table].unshift(newItem);
    writeData(data);
    res.json({ id: newItem.id, success: true });
});

app.put('/api/:table/:id', (req, res) => {
    const { table, id } = req.params;
    const data = readData();
    if (!data[table]) return res.status(400).json({ error: "Invalid table" });

    const index = data[table].findIndex(item => item.id == id);
    if (index === -1) return res.status(404).json({ error: "Item not found" });

    data[table][index] = { ...data[table][index], ...req.body, id: Number(id) };
    writeData(data);
    res.json({ updated: 1, success: true });
});

app.delete('/api/:table/:id', (req, res) => {
    const { table, id } = req.params;
    const data = readData();
    if (!data[table]) return res.status(400).json({ error: "Invalid table" });

    data[table] = data[table].filter(item => item.id != id);
    writeData(data);
    res.json({ deleted: 1, success: true });
});

// Store Release atomic transaction
app.post('/api/store-release', (req, res) => {
    const { itemId, qtyReleased, releaseData } = req.body;
    const data = readData();
    
    const item = data.storeitems.find(s => s.id == itemId);
    if (!item || item.qty < qtyReleased) {
        return res.status(400).json({ error: "Insufficient stock or item not found." });
    }

    item.qty -= qtyReleased;
    const newRelease = { id: Date.now(), ...releaseData };
    data.storereleases.unshift(newRelease);
    writeData(data);

    res.json({ success: true, remainingQty: item.qty });
});

// Fallback route for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
