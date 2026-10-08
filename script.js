let db = null;
let SQL = null;
let currentUser = { username: "Guest", role: "none", location: "Main Construction Site" };

window.addEventListener('DOMContentLoaded', async () => {
    try {
        const initSqlJs = window.initSqlJs;
        SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
        });

        initSqlDatabase();
        applyRolePermissions();
    } catch (err) {
        console.error("SQLite initialization error:", err);
        alert("Failed to initialize SQLite database engine.");
    }
});

function initSqlDatabase() {
    const savedBinary = localStorage.getItem('adis_alamyahu_sqlite_bin');
    if (savedBinary) {
        try {
            const uInt8Array = new Uint8Array(JSON.parse(savedBinary));
            db = new SQL.Database(uInt8Array);
            
            db.run(`
                CREATE TABLE IF NOT EXISTS storeitems (id INTEGER PRIMARY KEY AUTOINCREMENT, item_code TEXT, item_name TEXT, category TEXT, qty REAL, unit TEXT, unit_cost REAL, recorded_by TEXT, recorded_date TEXT);
                CREATE TABLE IF NOT EXISTS storereleases (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, item_id INTEGER, item_code TEXT, item_name TEXT, qty_released REAL, recipient TEXT, project_site TEXT, recorded_by TEXT, recorded_date TEXT);
            `);
            return;
        } catch (e) {
            console.warn("Could not load saved binary, creating new database.");
        }
    }

    db = new SQL.Database();
    
    db.run(`
        CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT, role TEXT);
        CREATE TABLE IF NOT EXISTS hremployees (id INTEGER PRIMARY KEY AUTOINCREMENT, fullname TEXT, department TEXT, position TEXT, phone TEXT, recorded_by TEXT, recorded_date TEXT);
        CREATE TABLE IF NOT EXISTS storeitems (id INTEGER PRIMARY KEY AUTOINCREMENT, item_code TEXT, item_name TEXT, category TEXT, qty REAL, unit TEXT, unit_cost REAL, recorded_by TEXT, recorded_date TEXT);
        CREATE TABLE IF NOT EXISTS storereleases (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, item_id INTEGER, item_code TEXT, item_name TEXT, qty_released REAL, recipient TEXT, project_site TEXT, recorded_by TEXT, recorded_date TEXT);
        CREATE TABLE IF NOT EXISTS siteincome (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, category TEXT, client TEXT, amount REAL, recorded_by TEXT, recorded_date TEXT);
        CREATE TABLE IF NOT EXISTS siteexpenses (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, category TEXT, description TEXT, amount REAL, recorded_by TEXT, recorded_date TEXT);
        CREATE TABLE IF NOT EXISTS purchases (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, item TEXT, qty REAL, cost REAL, status TEXT, recorded_by TEXT, recorded_date TEXT);
        CREATE TABLE IF NOT EXISTS fuel (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, equipment TEXT, operator TEXT, litres REAL, recorded_by TEXT, recorded_date TEXT);
        CREATE TABLE IF NOT EXISTS machines (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, machine TEXT, hours REAL, status TEXT, recorded_by TEXT, recorded_date TEXT);
        CREATE TABLE IF NOT EXISTS dumptrucks (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, truck TEXT, trips INTEGER, volume REAL, recorded_by TEXT, recorded_date TEXT);
        CREATE TABLE IF NOT EXISTS pettycash (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, description TEXT, amount REAL, recorded_by TEXT, recorded_date TEXT);
    `);

    const todayStr = new Date().toISOString().slice(0, 10);
    const nowStr = new Date().toLocaleString();

    db.run(`INSERT INTO users (username, password, role) VALUES ('manager', '123', 'manager');`);
    db.run(`INSERT INTO users (username, password, role) VALUES ('hrstaff', '123', 'hr');`);
    db.run(`INSERT INTO users (username, password, role) VALUES ('finance', '123', 'finance');`);
    db.run(`INSERT INTO users (username, password, role) VALUES ('operator', '123', 'operator');`);
    db.run(`INSERT INTO users (username, password, role) VALUES ('fleet', '123', 'fleet');`);

    db.run(`INSERT INTO hremployees (fullname, department, position, phone, recorded_by, recorded_date) VALUES ('Dawit Mekonnen', 'Operations', 'Site Supervisor', '+251911234567', 'manager', '${nowStr}');`);
    db.run(`INSERT INTO storeitems (item_code, item_name, category, qty, unit, unit_cost, recorded_by, recorded_date) VALUES ('MTR-001', 'Portland Cement (Dangote)', 'Building Materials', 450, 'Bags', 1150, 'manager', '${nowStr}');`);
    db.run(`INSERT INTO storeitems (item_code, item_name, category, qty, unit, unit_cost, recorded_by, recorded_date) VALUES ('MTR-002', 'Rebar 12mm Deformed', 'Structural Steel', 120, 'Bundles', 8500, 'manager', '${nowStr}');`);
    db.run(`INSERT INTO siteincome (date, category, client, amount, recorded_by, recorded_date) VALUES ('${todayStr}', 'Aggregate Sales', 'Awash Construction Plc', 150000, 'manager', '${nowStr}');`);
    db.run(`INSERT INTO siteexpenses (date, category, description, amount, recorded_by, recorded_date) VALUES ('${todayStr}', 'Utilities', 'Monthly Electric Power Bill', 24000, 'manager', '${nowStr}');`);
    db.run(`INSERT INTO purchases (date, item, qty, cost, status, recorded_by, recorded_date) VALUES ('${todayStr}', 'Hydraulic Oil ISO 68', 5, 12500, 'Pending', 'manager', '${nowStr}');`);
    db.run(`INSERT INTO fuel (date, equipment, operator, litres, recorded_by, recorded_date) VALUES ('${todayStr}', 'Excavator EX-01', 'Dawit M.', 150, 'manager', '${nowStr}');`);
    db.run(`INSERT INTO machines (date, machine, hours, status, recorded_by, recorded_date) VALUES ('${todayStr}', 'Grader GR-02', 42, 'Active', 'manager', '${nowStr}');`);
    db.run(`INSERT INTO dumptrucks (date, truck, trips, volume, recorded_by, recorded_date) VALUES ('${todayStr}', 'Isuzu DT-05', 12, 96, 'manager', '${nowStr}');`);
    db.run(`INSERT INTO pettycash (date, description, amount, recorded_by, recorded_date) VALUES ('${todayStr}', 'Office supplies & water', 2500, 'manager', '${nowStr}');`);

    saveSqlDatabase();
}

function saveSqlDatabase() {
    if (!db) return;
    const binaryArray = db.export();
    localStorage.setItem('adis_alamyahu_sqlite_bin', JSON.stringify(Array.from(binaryArray)));
}

function executeSql(query, params = []) {
    if (!db) return [];
    try {
        const stmt = db.prepare(query);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    } catch (e) {
        console.error("SQL Error:", e, query);
        return [];
    }
}

function runSql(query, params = []) {
    if (!db) return;
    try {
        db.run(query, params);
        saveSqlDatabase();
        refreshTables();
    } catch (e) {
        console.error("SQL Exec Error:", e, query);
    }
}

function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    const users = executeSql(`SELECT * FROM users WHERE username = ? AND password = ?;`, [username, password]);
    
    if (users.length === 0) {
        alert("Invalid username or password!");
        return;
    }
    
    const dbUser = users[0];
    currentUser = { 
        username: dbUser.username, 
        role: dbUser.role, 
        location: "Main Construction Site" 
    };

    document.getElementById('authOverlay').style.display = 'none';
    document.getElementById('header-username-lbl').innerText = dbUser.username;
    document.getElementById('header-role-lbl').innerText = dbUser.role.toUpperCase();
    
    applyRolePermissions();
    switchTab('dashboard');
}

function applyRolePermissions() {
    const isAdmin = currentUser.role === 'manager';
    const isHrOrAdmin = currentUser.role === 'manager' || currentUser.role === 'hr';
    const isFinanceOrAdmin = currentUser.role === 'manager' || currentUser.role === 'finance';
    const isOperatorOrAdmin = currentUser.role === 'manager' || currentUser.role === 'operator';
    
    const adminDbTools = document.getElementById('adminDbTools');
    if (adminDbTools) adminDbTools.style.display = isAdmin ? 'flex' : 'none';

    const hrNavButtons = document.querySelectorAll('.hr-nav-tab');
    hrNavButtons.forEach(el => {
        el.style.display = isHrOrAdmin ? 'flex' : 'none';
    });

    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) addUserBtn.style.display = isAdmin ? 'inline-flex' : 'none';

    const addHrEmpBtn = document.getElementById('addHrEmpBtn');
    if (addHrEmpBtn) addHrEmpBtn.style.display = isHrOrAdmin ? 'inline-flex' : 'none';

    const addStoreBtn = document.getElementById('addStoreBtn');
    if (addStoreBtn) addStoreBtn.style.display = isFinanceOrAdmin ? 'inline-flex' : 'none';

    const addReleaseBtn = document.getElementById('addReleaseBtn');
    if (addReleaseBtn) addReleaseBtn.style.display = isFinanceOrAdmin ? 'inline-flex' : 'none';

    const adminAddButtons = ['addFuelBtn'];
    adminAddButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) btn.style.display = isAdmin ? 'inline-flex' : 'none';
    });

    const operatorAddButtons = ['addMachineBtn', 'addDtBtn'];
    operatorAddButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) btn.style.display = isOperatorOrAdmin ? 'inline-flex' : 'none';
    });

    const financeAddButtons = ['addIncomeBtn', 'addExpenseBtn', 'addPettyBtn'];
    financeAddButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) btn.style.display = isFinanceOrAdmin ? 'inline-flex' : 'none';
    });

    document.querySelectorAll('.finance-nav-tab').forEach(el => {
        el.style.display = isFinanceOrAdmin ? 'flex' : 'none';
    });

    document.querySelectorAll('.finance-kpi-card').forEach(el => {
        el.style.display = isFinanceOrAdmin ? 'flex' : 'none';
    });

    document.querySelectorAll('.admin-action-header').forEach(el => {
        el.style.display = isAdmin ? '' : 'none';
    });
}

function switchTab(targetId) {
    if (['users', 'hremp'].includes(targetId) && currentUser.role !== 'manager' && currentUser.role !== 'hr') {
        alert("Access Denied: HR and Portal Users management are restricted to HR and Admin roles.");
        return;
    }
    if (['store', 'storereleases', 'income', 'expenses', 'pettycash'].includes(targetId) && currentUser.role !== 'manager' && currentUser.role !== 'finance') {
        alert("Access Denied: Financial & Store modules are restricted.");
        return;
    }

    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    const targetTab = document.getElementById(targetId);
    if (targetTab) targetTab.classList.add('active');

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-amber-500', 'text-slate-900', 'font-bold', 'shadow');
        btn.classList.add('text-slate-300');
    });

    const activeBtn = document.querySelector(`button[data-target="${targetId}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-300');
        activeBtn.classList.add('bg-amber-500', 'text-slate-900', 'font-bold', 'shadow');
    }
    refreshTables();
}

function logout() {
    currentUser = { username: "Guest", role: "none", location: "Main Construction Site" };
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('authOverlay').style.display = 'flex';
}

function checkAdminPermission() {
    if (currentUser.role !== 'manager') {
        alert("Access Denied: Only Site Managers (Admins) are permitted to edit, approve, or delete records.");
        return false;
    }
    return true;
}

function checkHrOrAdminPermission() {
    if (currentUser.role !== 'manager' && currentUser.role !== 'hr') {
        alert("Access Denied: Only HR and Admin roles can perform this action.");
        return false;
    }
    return true;
}

function checkFinanceOrAdminPermission() {
    if (currentUser.role !== 'manager' && currentUser.role !== 'finance') {
        alert("Access Denied: Financial & Store operations are restricted to Finance and Admin roles.");
        return false;
    }
    return true;
}

function checkOperatorOrAdminPermission() {
    if (currentUser.role !== 'manager' && currentUser.role !== 'operator') {
        alert("Access Denied: Only Operators and Managers can register machine logs and haulage.");
        return false;
    }
    return true;
}

// --- CRUD ACTIONS & REGISTRATION ---
function addUserRecord() {
    if (!checkAdminPermission()) return;
    const username = prompt("Enter username:");
    const password = prompt("Enter password:");
    const role = prompt("Enter role (manager/hr/fleet/finance/operator):", "operator");
    if (username && password) {
        runSql(`INSERT INTO users (username, password, role) VALUES (?, ?, ?);`, [username, password, role]);
    }
}
function editUserRecord(id, oldUser, oldPass, oldRole) {
    if (!checkAdminPermission()) return;
    const username = prompt("Edit username:", oldUser);
    const password = prompt("Edit password:", oldPass);
    const role = prompt("Edit role:", oldRole);
    if (username && password) {
        runSql(`UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?;`, [username, password, role, id]);
    }
}
function deleteUserRecord(id) {
    if (!checkAdminPermission()) return;
    if (confirm("Delete this user?")) {
        runSql(`DELETE FROM users WHERE id = ?;`, [id]);
    }
}

function addHrEmpRecord() {
    if (!checkHrOrAdminPermission()) return;
    const fullname = prompt("Enter Full Name:");
    const department = prompt("Enter Department:", "Operations");
    const position = prompt("Enter Position:", "Operator");
    const phone = prompt("Enter Phone:", "+251");
    const nowStr = new Date().toLocaleString();
    if (fullname) {
        runSql(`INSERT INTO hremployees (fullname, department, position, phone, recorded_by, recorded_date) VALUES (?, ?, ?, ?, ?, ?);`, [fullname, department, position, phone, currentUser.username, nowStr]);
    }
}
function editHrEmpRecord(id, oldName, oldDept, oldPos, oldPhone) {
    if (!checkAdminPermission()) return;
    const fullname = prompt("Edit Full Name:", oldName);
    const department = prompt("Edit Department:", oldDept);
    const position = prompt("Edit Position:", oldPos);
    const phone = prompt("Edit Phone:", oldPhone);
    if (fullname) {
        runSql(`UPDATE hremployees SET fullname = ?, department = ?, position = ?, phone = ? WHERE id = ?;`, [fullname, department, position, phone, id]);
    }
}
function deleteHrEmpRecord(id) {
    if (!checkAdminPermission()) return;
    if (confirm("Delete this employee?")) {
        runSql(`DELETE FROM hremployees WHERE id = ?;`, [id]);
    }
}

function addStoreItemRecord() {
    if (!checkFinanceOrAdminPermission()) return;
    const itemCode = prompt("Enter Item Code (e.g. MTR-003):", "MTR-");
    const itemName = prompt("Enter Item Name:");
    const category = prompt("Enter Category:", "Building Materials");
    const qty = parseFloat(prompt("Enter Quantity:", "100"));
    const unit = prompt("Enter Unit (e.g. Bags, Pcs, Litres):", "Pcs");
    const unitCost = parseFloat(prompt("Enter Unit Cost (ETB):", "500"));
    const nowStr = new Date().toLocaleString();
    if (itemCode && itemName && !isNaN(qty) && !isNaN(unitCost)) {
        runSql(`INSERT INTO storeitems (item_code, item_name, category, qty, unit, unit_cost, recorded_by, recorded_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`, [itemCode, itemName, category, qty, unit, unitCost, currentUser.username, nowStr]);
    }
}
function editStoreItemRecord(id, oldCode, oldName, oldCat, oldQty, oldUnit, oldCost) {
    if (!checkAdminPermission()) return;
    const itemCode = prompt("Edit Item Code:", oldCode);
    const itemName = prompt("Edit Item Name:", oldName);
    const category = prompt("Edit Category:", oldCat);
    const qty = parseFloat(prompt("Edit Quantity:", oldQty));
    const unit = prompt("Edit Unit:", oldUnit);
    const unitCost = parseFloat(prompt("Edit Unit Cost:", oldCost));
    if (itemCode && itemName && !isNaN(qty)) {
        runSql(`UPDATE storeitems SET item_code = ?, item_name = ?, category = ?, qty = ?, unit = ?, unit_cost = ? WHERE id = ?;`, [itemCode, itemName, category, qty, unit, unitCost, id]);
    }
}
function deleteStoreItemRecord(id) {
    if (!checkAdminPermission()) return;
    if (confirm("Delete this store item?")) {
        runSql(`DELETE FROM storeitems WHERE id = ?;`, [id]);
    }
}

function addStoreReleaseRecord() {
    if (!checkFinanceOrAdminPermission()) return;
    
    // Explicitly select all available inventory items
    const storeItems = executeSql(`SELECT id, item_code, item_name, qty, unit FROM storeitems WHERE qty > 0;`);
    
    if (storeItems.length === 0) {
        alert("No store items with available stock found!");
        return;
    }

    let itemListStr = storeItems.map(s => `ID: ${s.id} | ${s.item_code} - ${s.item_name} (Stock: ${s.qty} ${s.unit})`).join('\n');
    const inputId = prompt("Enter the Item ID you wish to release:\n\n" + itemListStr);
    if (!inputId) return;
    
    const selectedId = parseInt(inputId.trim(), 10);
    const itemObj = storeItems.find(s => s.id === selectedId);
    
    if (!itemObj) {
        alert("Invalid Item ID selected. Please check the ID and try again.");
        return;
    }

    const qtyInput = prompt(`Enter quantity to release for [${itemObj.item_code} - ${itemObj.item_name}]\nAvailable Stock: ${itemObj.qty} ${itemObj.unit}:`, "1");
    if (!qtyInput) return;
    
    const qtyToRelease = parseFloat(qtyInput.trim());
    if (isNaN(qtyToRelease) || qtyToRelease <= 0) {
        alert("Invalid quantity entered.");
        return;
    }

    if (qtyToRelease > itemObj.qty) {
        alert(`Error: Cannot release ${qtyToRelease} ${itemObj.unit}. Only ${itemObj.qty} available in stock.`);
        return;
    }

    const recipient = prompt("Enter Recipient Name (e.g. Dawit M.):", "Site Team");
    if (!recipient) return;
    
    const projectSite = prompt("Enter Project / Site Location:", "Main Site Block A");
    const date = prompt("Enter Release Date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    const nowStr = new Date().toLocaleString();

    if (date) {
        // Execute insert into releases
        db.run(`INSERT INTO storereleases (date, item_id, item_code, item_name, qty_released, recipient, project_site, recorded_by, recorded_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`, 
            [date, itemObj.id, itemObj.item_code, itemObj.item_name, qtyToRelease, recipient, projectSite || "Main Site", currentUser.username, nowStr]);

        // Deduct quantity from store items table
        const newQty = itemObj.qty - qtyToRelease;
        db.run(`UPDATE storeitems SET qty = ? WHERE id = ?;`, [newQty, itemObj.id]);
        
        saveSqlDatabase();
        refreshTables();
        alert(`Successfully released ${qtyToRelease} ${itemObj.unit} of ${itemObj.item_name}. Remaining stock: ${newQty} ${itemObj.unit}.`);
    }
}
function deleteStoreReleaseRecord(id) {
    if (!checkAdminPermission()) return;
    if (confirm("Delete this release record?")) {
        runSql(`DELETE FROM storereleases WHERE id = ?;`, [id]);
    }
}

function addIncomeRecord() {
    if (!checkFinanceOrAdminPermission()) return;
    const date = prompt("Enter Date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    const category = prompt("Enter Income Category:", "Aggregate Sales");
    const client = prompt("Enter Payer / Client Name:");
    const amount = parseFloat(prompt("Enter Amount (ETB):", "50000"));
    const nowStr = new Date().toLocaleString();
    if (date && category && !isNaN(amount)) {
        runSql(`INSERT INTO siteincome (date, category, client, amount, recorded_by, recorded_date) VALUES (?, ?, ?, ?, ?, ?);`, [date, category, client, amount, currentUser.username, nowStr]);
    }
}
function editIncomeRecord(id, oldDate, oldCat, oldClient, oldAmt) {
    if (!checkAdminPermission()) return;
    const date = prompt("Edit Date:", oldDate);
    const category = prompt("Edit Category:", oldCat);
    const client = prompt("Edit Client:", oldClient);
    const amount = parseFloat(prompt("Edit Amount:", oldAmt));
    if (date && category && !isNaN(amount)) {
        runSql(`UPDATE siteincome SET date = ?, category = ?, client = ?, amount = ? WHERE id = ?;`, [date, category, client, amount, id]);
    }
}
function deleteIncomeRecord(id) {
    if (!checkAdminPermission()) return;
    if (confirm("Delete income record?")) {
        runSql(`DELETE FROM siteincome WHERE id = ?;`, [id]);
    }
}

function addExpenseRecord() {
    if (!checkFinanceOrAdminPermission()) return;
    const date = prompt("Enter Date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    const category = prompt("Enter Expense Category:", "Utilities");
    const description = prompt("Enter Expense Description:");
    const amount = parseFloat(prompt("Enter Amount (ETB):", "10000"));
    const nowStr = new Date().toLocaleString();
    if (date && category && description && !isNaN(amount)) {
        runSql(`INSERT INTO siteexpenses (date, category, description, amount, recorded_by, recorded_date) VALUES (?, ?, ?, ?, ?, ?);`, [date, category, description, amount, currentUser.username, nowStr]);
    }
}
function editExpenseRecord(id, oldDate, oldCat, oldDesc, oldAmt) {
    if (!checkAdminPermission()) return;
    const date = prompt("Edit Date:", oldDate);
    const category = prompt("Edit Category:", oldCat);
    const description = prompt("Edit Description:", oldDesc);
    const amount = parseFloat(prompt("Edit Amount:", oldAmt));
    if (date && category && !isNaN(amount)) {
        runSql(`UPDATE siteexpenses SET date = ?, category = ?, description = ?, amount = ? WHERE id = ?;`, [date, category, description, amount, id]);
    }
}
function deleteExpenseRecord(id) {
    if (!checkAdminPermission()) return;
    if (confirm("Delete expense record?")) {
        runSql(`DELETE FROM siteexpenses WHERE id = ?;`, [id]);
    }
}

function addPurchaseRecord() {
    const date = prompt("Enter Date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    const item = prompt("Enter Item Description / Part Name:");
    const qty = parseFloat(prompt("Enter Quantity:", "1"));
    const cost = parseFloat(prompt("Enter Estimated Cost (ETB):", "5000"));
    const status = "Pending";
    const nowStr = new Date().toLocaleString();
    if (date && item && !isNaN(qty) && !isNaN(cost)) {
        runSql(`INSERT INTO purchases (date, item, qty, cost, status, recorded_by, recorded_date) VALUES (?, ?, ?, ?, ?, ?, ?);`, [date, item, qty, cost, status, currentUser.username, nowStr]);
        alert("Purchase request submitted successfully and marked as Pending for Manager review.");
    }
}
function editPurchaseRecord(id, oldDate, oldItem, oldQty, oldCost, oldStatus) {
    if (!checkAdminPermission()) return;
    const date = prompt("Edit Date:", oldDate);
    const item = prompt("Edit Item:", oldItem);
    const qty = parseFloat(prompt("Edit Qty:", oldQty));
    const cost = parseFloat(prompt("Edit Cost:", oldCost));
    const status = prompt("Edit Status (Pending / Approved / Completed / Rejected):", oldStatus);
    if (date && item) {
        runSql(`UPDATE purchases SET date = ?, item = ?, qty = ?, cost = ?, status = ? WHERE id = ?;`, [date, item, qty, cost, status, id]);
    }
}
function deletePurchaseRecord(id) {
    if (!checkAdminPermission()) return;
    if (confirm("Delete purchase request?")) {
        runSql(`DELETE FROM purchases WHERE id = ?;`, [id]);
    }
}

function addFuelRecord() {
    if (!checkAdminPermission()) return;
    const date = prompt("Enter Date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    const equipment = prompt("Enter Equipment ID:");
    const operator = prompt("Enter Operator Name:");
    const litres = parseFloat(prompt("Enter Litres:", "100"));
    const nowStr = new Date().toLocaleString();
    if (date && equipment) {
        runSql(`INSERT INTO fuel (date, equipment, operator, litres, recorded_by, recorded_date) VALUES (?, ?, ?, ?, ?, ?);`, [date, equipment, operator, litres, currentUser.username, nowStr]);
    }
}
function editFuelRecord(id, oldDate, oldEq, oldOp, oldLitres) {
    if (!checkAdminPermission()) return;
    const date = prompt("Edit Date:", oldDate);
    const equipment = prompt("Edit Equipment:", oldEq);
    const operator = prompt("Edit Operator:", oldOp);
    const litres = parseFloat(prompt("Edit Litres:", oldLitres));
    if (date && equipment) {
        runSql(`UPDATE fuel SET date = ?, equipment = ?, operator = ?, litres = ? WHERE id = ?;`, [date, equipment, operator, litres, id]);
    }
}
function deleteFuelRecord(id) {
    if (!checkAdminPermission()) return;
    if (confirm("Delete fuel record?")) {
        runSql(`DELETE FROM fuel WHERE id = ?;`, [id]);
    }
}

function addMachineRecord() {
    if (!checkOperatorOrAdminPermission()) return;
    const date = prompt("Enter Date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    const machine = prompt("Enter Machine ID:");
    const hours = parseFloat(prompt("Enter Hours Worked:", "8"));
    const status = prompt("Enter Status (Active/Maintenance):", "Active");
    const nowStr = new Date().toLocaleString();
    if (date && machine && !isNaN(hours)) {
        runSql(`INSERT INTO machines (date, machine, hours, status, recorded_by, recorded_date) VALUES (?, ?, ?, ?, ?, ?);`, [date, machine, hours, status, currentUser.username, nowStr]);
    }
}
function editMachineRecord(id, oldDate, oldMac, oldHours, oldStatus) {
    if (!checkAdminPermission()) return;
    const date = prompt("Edit Date:", oldDate);
    const machine = prompt("Edit Machine:", oldMac);
    const hours = parseFloat(prompt("Edit Hours:", oldHours));
    const status = prompt("Edit Status:", oldStatus);
    if (date && machine) {
        runSql(`UPDATE machines SET date = ?, machine = ?, hours = ?, status = ? WHERE id = ?;`, [date, machine, hours, status, id]);
    }
}
function deleteMachineRecord(id) {
    if (!checkAdminPermission()) return;
    if (confirm("Delete machine log?")) {
        runSql(`DELETE FROM machines WHERE id = ?;`, [id]);
    }
}

function addDumpTruckRecord() {
    if (!checkOperatorOrAdminPermission()) return;
    const date = prompt("Enter Date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    const truck = prompt("Enter Truck ID:");
    const trips = parseInt(prompt("Enter Trip Count:", "10"), 10);
    const volume = parseFloat(prompt("Enter Volume (m³):", "80"));
    const nowStr = new Date().toLocaleString();
    if (date && truck && !isNaN(trips)) {
        runSql(`INSERT INTO dumptrucks (date, truck, trips, volume, recorded_by, recorded_date) VALUES (?, ?, ?, ?, ?, ?);`, [date, truck, trips, volume, currentUser.username, nowStr]);
    }
}
function editDumpTruckRecord(id, oldDate, oldTruck, oldTrips, oldVol) {
    if (!checkAdminPermission()) return;
    const date = prompt("Edit Date:", oldDate);
    const truck = prompt("Edit Truck:", oldTruck);
    const trips = parseInt(prompt("Edit Trips:", oldTrips), 10);
    const volume = parseFloat(prompt("Edit Volume:", oldVol));
    if (date && truck) {
        runSql(`UPDATE dumptrucks SET date = ?, truck = ?, trips = ?, volume = ? WHERE id = ?;`, [date, truck, trips, volume, id]);
    }
}
function deleteDumpTruckRecord(id) {
    if (!checkAdminPermission()) return;
    if (confirm("Delete haulage record?")) {
        runSql(`DELETE FROM dumptrucks WHERE id = ?;`, [id]);
    }
}

function addPettyCashRecord() {
    if (!checkFinanceOrAdminPermission()) return;
    const date = prompt("Enter Date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    const description = prompt("Enter Description:");
    const amount = parseFloat(prompt("Enter Amount (ETB):", "1000"));
    const nowStr = new Date().toLocaleString();
    if (date && description && !isNaN(amount)) {
        runSql(`INSERT INTO pettycash (date, description, amount, recorded_by, recorded_date) VALUES (?, ?, ?, ?, ?);`, [date, description, amount, currentUser.username, nowStr]);
    }
}
function editPettyCashRecord(id, oldDate, oldDesc, oldAmt) {
    if (!checkAdminPermission()) return;
    const date = prompt("Edit Date:", oldDate);
    const description = prompt("Edit Description:", oldDesc);
    const amount = parseFloat(prompt("Edit Amount:", oldAmt));
    if (date && description) {
        runSql(`UPDATE pettycash SET date = ?, description = ?, amount = ? WHERE id = ?;`, [date, description, amount, id]);
    }
}
function deletePettyCashRecord(id) {
    if (!checkAdminPermission()) return;
    if (confirm("Delete petty cash voucher?")) {
        runSql(`DELETE FROM pettycash WHERE id = ?;`, [id]);
    }
}

function getFilteredSql(tableName) {
    const fromDate = document.getElementById('globalDateFrom').value;
    const toDate = document.getElementById('globalDateTo').value;

    let query = `SELECT * FROM ${tableName}`;
    let params = [];
    let conditions = [];

    if (fromDate) {
        conditions.push(`date >= ?`);
        params.push(fromDate);
    }
    if (toDate) {
        conditions.push(`date <= ?`);
        params.push(toDate);
    }

    if (conditions.length > 0) {
        query += ` WHERE ` + conditions.join(' AND ');
    }
    query += ` ORDER BY id DESC`;

    return executeSql(query, params);
}

function refreshTables() {
    if (!db) return;
    const isAdmin = currentUser.role === 'manager';
    const isHrOrAdmin = currentUser.role === 'manager' || currentUser.role === 'hr';
    const isFinanceOrAdmin = currentUser.role === 'manager' || currentUser.role === 'finance';

    // Users
    if (isHrOrAdmin) {
        const users = executeSql(`SELECT * FROM users;`);
        const userBody = document.getElementById('userTableBody');
        if (userBody) {
            userBody.innerHTML = users.map(u => `
                <tr class="hover:bg-slate-50">
                    <td class="p-4 font-semibold">${u.username}</td>
                    <td class="p-4 text-slate-500">${u.password}</td>
                    <td class="p-4 uppercase text-xs font-bold text-amber-600">${u.role}</td>
                    <td class="p-4 space-x-2" style="display: ${isAdmin ? '' : 'none'};">
                        <button onclick="editUserRecord(${u.id}, '${u.username}', '${u.password}', '${u.role}')" class="text-amber-600 hover:underline text-xs font-semibold">Edit</button>
                        <button onclick="deleteUserRecord(${u.id})" class="text-rose-600 hover:underline text-xs font-semibold">Delete</button>
                    </td>
                </tr>
            `).join('');
        }
        const userCount = document.getElementById('userCount');
        if (userCount) userCount.innerText = `${users.length} records`;

        // HR Employees
        const hrList = executeSql(`SELECT * FROM hremployees ORDER BY id DESC;`);
        const hrBody = document.getElementById('hrempTableBody');
        if (hrBody) {
            hrBody.innerHTML = hrList.map(h => `
                <tr class="hover:bg-slate-50">
                    <td class="p-4 font-semibold">${h.fullname}</td>
                    <td class="p-4 text-slate-600">${h.department}</td>
                    <td class="p-4 text-indigo-600 font-medium">${h.position}</td>
                    <td class="p-4 text-slate-500">${h.phone}<br><span class="text-[10px] text-slate-400">By: ${h.recorded_by || 'system'} (${h.recorded_date || '-'})</span></td>
                    <td class="p-4 space-x-2" style="display: ${isAdmin ? '' : 'none'};">
                        <button onclick="editHrEmpRecord(${h.id}, '${h.fullname}', '${h.department}', '${h.position}', '${h.phone}')" class="text-amber-600 hover:underline text-xs font-semibold">Edit</button>
                        <button onclick="deleteHrEmpRecord(${h.id})" class="text-rose-600 hover:underline text-xs font-semibold">Delete</button>
                    </td>
                </tr>
            `).join('');
        }
        const hrCount = document.getElementById('hrempCount');
        if (hrCount) hrCount.innerText = `${hrList.length} records`;
    }

    // Store Inventory, Releases & Finance Modules
    if (isFinanceOrAdmin) {
        // Store Items
        const storeList = executeSql(`SELECT * FROM storeitems ORDER BY id DESC;`);
        const storeBody = document.getElementById('storeTableBody');
        if (storeBody) {
            storeBody.innerHTML = storeList.map(s => `
                <tr class="hover:bg-slate-50">
                    <td class="p-4 font-mono font-bold text-slate-600">${s.item_code}</td>
                    <td class="p-4 font-semibold">${s.item_name}</td>
                    <td class="p-4 text-slate-500">${s.category}</td>
                    <td class="p-4 font-bold text-amber-600">${s.qty}</td>
                    <td class="p-4 text-slate-500">${s.unit}</td>
                    <td class="p-4 font-semibold text-slate-700">ETB ${s.unit_cost.toLocaleString()}<br><span class="text-[10px] text-slate-400 font-normal">By: ${s.recorded_by || 'system'} (${s.recorded_date || '-'})</span></td>
                    <td class="p-4 space-x-2" style="display: ${isAdmin ? '' : 'none'};">
                        <button onclick="editStoreItemRecord(${s.id}, '${s.item_code}', '${s.item_name}', '${s.category}', ${s.qty}, '${s.unit}', ${s.unit_cost})" class="text-amber-600 hover:underline text-xs font-semibold">Edit</button>
                        <button onclick="deleteStoreItemRecord(${s.id})" class="text-rose-600 hover:underline text-xs font-semibold">Delete</button>
                    </td>
                </tr>
            `).join('');
        }
        const storeCount = document.getElementById('storeCount');
        if (storeCount) storeCount.innerText = `${storeList.length} items`;

        // Store Releases
        const releaseList = getFilteredSql('storereleases');
        const releaseBody = document.getElementById('releasesTableBody');
        if (releaseBody) {
            releaseBody.innerHTML = releaseList.map(r => `
                <tr class="hover:bg-slate-50">
                    <td class="p-4 text-slate-500 text-xs">${r.date}</td>
                    <td class="p-4 font-semibold">${r.item_code} - ${r.item_name}</td>
                    <td class="p-4 font-bold text-rose-600">${r.qty_released}</td>
                    <td class="p-4 text-slate-700">${r.recipient}</td>
                    <td class="p-4 text-slate-600">${r.project_site}<br><span class="text-[10px] text-slate-400">By: ${r.recorded_by || 'system'} (${r.recorded_date || '-'})</span></td>
                    <td class="p-4 space-x-2" style="display: ${isAdmin ? '' : 'none'};">
                        <button onclick="deleteStoreReleaseRecord(${r.id})" class="text-rose-600 hover:underline text-xs font-semibold">Delete</button>
                    </td>
                </tr>
            `).join('');
        }
        const releasesCount = document.getElementById('releasesCount');
        if (releasesCount) releasesCount.innerText = `${releaseList.length} releases`;

        // Site Income
        const incList = getFilteredSql('siteincome');
        let totalIncome = incList.reduce((sum, i) => sum + i.amount, 0);
        const incBody = document.getElementById('incomeTableBody');
        if (incBody) {
            incBody.innerHTML = incList.map(i => `
                <tr class="hover:bg-slate-50">
                    <td class="p-4 text-slate-500 text-xs">${i.date}</td>
                    <td class="p-4 font-semibold">${i.category}</td>
                    <td class="p-4">${i.client}</td>
                    <td class="p-4 text-emerald-600 font-bold">ETB ${i.amount.toLocaleString()}<br><span class="text-[10px] text-slate-400 font-normal">By: ${i.recorded_by || 'system'} (${i.recorded_date || '-'})</span></td>
                    <td class="p-4 space-x-2" style="display: ${isAdmin ? '' : 'none'};">
                        <button onclick="editIncomeRecord(${i.id}, '${i.date}', '${i.category}', '${i.client}', ${i.amount})" class="text-amber-600 hover:underline text-xs font-semibold">Edit</button>
                        <button onclick="deleteIncomeRecord(${i.id})" class="text-rose-600 hover:underline text-xs font-semibold">Delete</button>
                    </td>
                </tr>
            `).join('');
        }
        const incCount = document.getElementById('incomeCount');
        if (incCount) incCount.innerText = `${incList.length} records`;
        const kpiInc = document.getElementById('kpi-income');
        if (kpiInc) kpiInc.innerText = `ETB ${totalIncome.toLocaleString()}`;

        // Site Expenses
        const expList = getFilteredSql('siteexpenses');
        let totalExpenses = expList.reduce((sum, e) => sum + e.amount, 0);
        const expBody = document.getElementById('expensesTableBody');
        if (expBody) {
            expBody.innerHTML = expList.map(e => `
                <tr class="hover:bg-slate-50">
                    <td class="p-4 text-slate-500 text-xs">${e.date}</td>
                    <td class="p-4 font-semibold">${e.category}</td>
                    <td class="p-4 text-slate-600">${e.description}</td>
                    <td class="p-4 text-rose-600 font-bold">ETB ${e.amount.toLocaleString()}<br><span class="text-[10px] text-slate-400 font-normal">By: ${e.recorded_by || 'system'} (${e.recorded_date || '-'})</span></td>
                    <td class="p-4 space-x-2" style="display: ${isAdmin ? '' : 'none'};">
                        <button onclick="editExpenseRecord(${e.id}, '${e.date}', '${e.category}', '${e.description}', ${e.amount})" class="text-amber-600 hover:underline text-xs font-semibold">Edit</button>
                        <button onclick="deleteExpenseRecord(${e.id})" class="text-rose-600 hover:underline text-xs font-semibold">Delete</button>
                    </td>
                </tr>
            `).join('');
        }
        const expCount = document.getElementById('expensesCount');
        if (expCount) expCount.innerText = `${expList.length} records`;
        const kpiExp = document.getElementById('kpi-expenses');
        if (kpiExp) kpiExp.innerText = `ETB ${totalExpenses.toLocaleString()}`;

        // Petty Cash
        const pcList = getFilteredSql('pettycash');
        let totalPetty = pcList.reduce((sum, p) => sum + p.amount, 0);
        const kpiPetty = document.getElementById('kpi-petty');
        if (kpiPetty) kpiPetty.innerText = `ETB ${totalPetty.toLocaleString()}`;

        const pcBody = document.getElementById('pettycashTableBody');
        if (pcBody) {
            pcBody.innerHTML = pcList.map(p => `
                <tr class="hover:bg-slate-50">
                    <td class="p-4 text-slate-500 text-xs">${p.date}</td>
                    <td class="p-4 font-semibold">${p.description}</td>
                    <td class="p-4 text-blue-600 font-bold">ETB ${p.amount.toLocaleString()}<br><span class="text-[10px] text-slate-400 font-normal">By: ${p.recorded_by || 'system'} (${p.recorded_date || '-'})</span></td>
                    <td class="p-4 space-x-2" style="display: ${isAdmin ? '' : 'none'};">
                        <button onclick="editPettyCashRecord(${p.id}, '${p.date}', '${p.description}', ${p.amount})" class="text-amber-600 hover:underline text-xs font-semibold">Edit</button>
                        <button onclick="deletePettyCashRecord(${p.id})" class="text-rose-600 hover:underline text-xs font-semibold">Delete</button>
                    </td>
                </tr>
            `).join('');
        }
        const pcCount = document.getElementById('pettycashCount');
        if (pcCount) pcCount.innerText = `${pcList.length} records`;
    }

    // Purchases
    const purList = getFilteredSql('purchases');
    const purBody = document.getElementById('purchaseTableBody');
    if (purBody) {
        purBody.innerHTML = purList.map(p => `
            <tr class="hover:bg-slate-50">
                <td class="p-4 text-slate-500 text-xs">${p.date}</td>
                <td class="p-4 font-semibold">${p.item}</td>
                <td class="p-4">${p.qty}</td>
                <td class="p-4 text-amber-600 font-bold">ETB ${p.cost.toLocaleString()}</td>
                <td class="p-4">
                    <span class="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-bold">${p.status}</span><br>
                    <span class="text-[10px] text-slate-400">Requested By: ${p.recorded_by || 'system'} (${p.recorded_date || '-'})</span>
                </td>
                <td class="p-4 space-x-2" style="display: ${isAdmin ? '' : 'none'};">
                    <button onclick="editPurchaseRecord(${p.id}, '${p.date}', '${p.item}', ${p.qty}, ${p.cost}, '${p.status}')" class="text-amber-600 hover:underline text-xs font-semibold">Review / Approve</button>
                    <button onclick="deletePurchaseRecord(${p.id})" class="text-rose-600 hover:underline text-xs font-semibold">Delete</button>
                </td>
            </tr>
        `).join('');
    }
    const purCount = document.getElementById('purchaseCount');
    if (purCount) purCount.innerText = `${purList.length} records`;

    // Fuel
    const fuelList = getFilteredSql('fuel');
    let totalFuel = fuelList.reduce((sum, f) => sum + f.litres, 0);
    const fuelBody = document.getElementById('fuelTableBody');
    if (fuelBody) {
        fuelBody.innerHTML = fuelList.map(f => `
            <tr class="hover:bg-slate-50">
                <td class="p-4 text-slate-500 text-xs">${f.date}</td>
                <td class="p-4 font-semibold">${f.equipment}</td>
                <td class="p-4">${f.operator}</td>
                <td class="p-4 text-emerald-600 font-bold">${f.litres} L<br><span class="text-[10px] text-slate-400 font-normal">By: ${f.recorded_by || 'system'} (${f.recorded_date || '-'})</span></td>
                <td class="p-4 space-x-2" style="display: ${isAdmin ? '' : 'none'};">
                    <button onclick="editFuelRecord(${f.id}, '${f.date}', '${f.equipment}', '${f.operator}', ${f.litres})" class="text-amber-600 hover:underline text-xs font-semibold">Edit</button>
                    <button onclick="deleteFuelRecord(${f.id})" class="text-rose-600 hover:underline text-xs font-semibold">Delete</button>
                </td>
            </tr>
        `).join('');
    }
    const fuelCount = document.getElementById('fuelCount');
    if (fuelCount) fuelCount.innerText = `${fuelList.length} records`;
    const kpiFuel = document.getElementById('kpi-fuel');
    if (kpiFuel) kpiFuel.innerText = `${totalFuel} L`;

    // Machines
    const machineList = getFilteredSql('machines');
    const macBody = document.getElementById('machineTableBody');
    if (macBody) {
        macBody.innerHTML = machineList.map(m => `
            <tr class="hover:bg-slate-50">
                <td class="p-4 text-slate-500 text-xs">${m.date}</td>
                <td class="p-4 font-semibold">${m.machine}</td>
                <td class="p-4">${m.hours} hrs</td>
                <td class="p-4"><span class="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-bold">${m.status}</span><br><span class="text-[10px] text-slate-400">By: ${m.recorded_by || 'system'} (${m.recorded_date || '-'})</span></td>
                <td class="p-4 space-x-2" style="display: ${isAdmin ? '' : 'none'};">
                    <button onclick="editMachineRecord(${m.id}, '${m.date}', '${m.machine}', ${m.hours}, '${m.status}')" class="text-amber-600 hover:underline text-xs font-semibold">Edit</button>
                    <button onclick="deleteMachineRecord(${m.id})" class="text-rose-600 hover:underline text-xs font-semibold">Delete</button>
                </td>
            </tr>
        `).join('');
    }
    const macCount = document.getElementById('machineCount');
    if (macCount) macCount.innerText = `${machineList.length} records`;

    // Dump Trucks
    const dtList = getFilteredSql('dumptrucks');
    const dtBody = document.getElementById('dumptruckTableBody');
    if (dtBody) {
        dtBody.innerHTML = dtList.map(d => `
            <tr class="hover:bg-slate-50">
                <td class="p-4 text-slate-500 text-xs">${d.date}</td>
                <td class="p-4 font-semibold">${d.truck}</td>
                <td class="p-4">${d.trips}</td>
                <td class="p-4 text-blue-600 font-bold">${d.volume} m³<br><span class="text-[10px] text-slate-400 font-normal">By: ${d.recorded_by || 'system'} (${d.recorded_date || '-'})</span></td>
                <td class="p-4 space-x-2" style="display: ${isAdmin ? '' : 'none'};">
                    <button onclick="editDumpTruckRecord(${d.id}, '${d.date}', '${d.truck}', ${d.trips}, ${d.volume})" class="text-amber-600 hover:underline text-xs font-semibold">Edit</button>
                    <button onclick="deleteDumpTruckRecord(${d.id})" class="text-rose-600 hover:underline text-xs font-semibold">Delete</button>
                </td>
            </tr>
        `).join('');
    }
    const dtCount = document.getElementById('dumptruckCount');
    if (dtCount) dtCount.innerText = `${dtList.length} records`;
}

function exportDatabase() {
    if (!checkAdminPermission()) return;
    const binaryArray = db.export();
    const blob = new Blob([binaryArray], { type: "application/x-sqlite3" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adis_alamyahu_db_${new Date().toISOString().slice(0,10)}.sqlite`;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function importDatabase(event) {
    if (!checkAdminPermission()) return;
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const uInt8Array = new Uint8Array(e.target.result);
            db = new SQL.Database(uInt8Array);
            saveSqlDatabase();
            refreshTables();
            alert("SQLite database successfully restored!");
        } catch (err) {
            alert("Invalid SQLite file.");
        }
    };
    reader.readAsArrayBuffer(file);
}

function filterTable(tableId, query) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const tbody = table.getElementsByTagName('tbody')[0];
    if (!tbody) return;
    const rows = tbody.getElementsByTagName('tr');
    for (let i = 0; i < rows.length; i++) {
        let match = false;
        const cells = rows[i].getElementsByTagName('td');
        for (let j = 0; j < cells.length; j++) {
            if (cells[j].innerText.toLowerCase().includes(query.toLowerCase())) {
                match = true;
                break;
            }
        }
        rows[i].style.display = match ? '' : 'none';
    }
}
