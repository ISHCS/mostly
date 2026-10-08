const API_BASE = '/api';
let currentUser = { username: "Guest", role: "none" };

window.addEventListener('DOMContentLoaded', () => {
    applyRolePermissions();
});

async function apiGet(table) {
    try {
        const res = await fetch(`${API_BASE}/${table}`);
        return await res.json();
    } catch (e) {
        console.error(`Error fetching ${table}:`, e);
        return [];
    }
}

async function apiPost(table, data) {
    try {
        const res = await fetch(`${API_BASE}/${table}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        refreshTables();
        return result;
    } catch (e) {
        console.error(`Error posting to ${table}:`, e);
    }
}

async function apiPut(table, id, data) {
    try {
        const res = await fetch(`${API_BASE}/${table}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        refreshTables();
        return result;
    } catch (e) {
        console.error(`Error updating ${table}:`, e);
    }
}

async function apiDelete(table, id) {
    try {
        const res = await fetch(`${API_BASE}/${table}/${id}`, { method: 'DELETE' });
        const result = await res.json();
        refreshTables();
        return result;
    } catch (e) {
        console.error(`Error deleting from ${table}:`, e);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    const users = await apiGet('users');
    const dbUser = users.find(u => u.username === username && u.password === password);
    
    if (!dbUser) {
        alert("Invalid username or password!");
        return;
    }
    
    currentUser = { username: dbUser.username, role: dbUser.role };
    document.getElementById('authOverlay').style.display = 'none';
    document.getElementById('header-username-lbl').innerText = dbUser.username;
    document.getElementById('header-role-lbl').innerText = dbUser.role.toUpperCase();
    
    applyRolePermissions();
    switchTab('dashboard');
}

function logout() {
    currentUser = { username: "Guest", role: "none" };
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('authOverlay').style.display = 'flex';
}

function applyRolePermissions() {
    const isAdmin = currentUser.role === 'manager';
    const isHrOrAdmin = currentUser.role === 'manager' || currentUser.role === 'hr';
    const isFinanceOrAdmin = currentUser.role === 'manager' || currentUser.role === 'finance';
    const isOperatorOrAdmin = currentUser.role === 'manager' || currentUser.role === 'operator';

    document.querySelectorAll('.hr-nav-tab').forEach(el => el.style.display = isHrOrAdmin ? 'flex' : 'none');
    document.querySelectorAll('.finance-nav-tab').forEach(el => el.style.display = isFinanceOrAdmin ? 'flex' : 'none');
    document.querySelectorAll('.finance-kpi-card').forEach(el => el.style.display = isFinanceOrAdmin ? 'flex' : 'none');
    document.querySelectorAll('.admin-action-header').forEach(el => el.style.display = isAdmin ? '' : 'none');

    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) addUserBtn.style.display = isAdmin ? 'inline-flex' : 'none';

    const addHrEmpBtn = document.getElementById('addHrEmpBtn');
    if (addHrEmpBtn) addHrEmpBtn.style.display = isHrOrAdmin ? 'inline-flex' : 'none';

    const addStoreBtn = document.getElementById('addStoreBtn');
    if (addStoreBtn) addStoreBtn.style.display = isFinanceOrAdmin ? 'inline-flex' : 'none';

    const addReleaseBtn = document.getElementById('addReleaseBtn');
    if (addReleaseBtn) addReleaseBtn.style.display = isFinanceOrAdmin ? 'inline-flex' : 'none';

    const addFuelBtn = document.getElementById('addFuelBtn');
    if (addFuelBtn) addFuelBtn.style.display = isAdmin ? 'inline-flex' : 'none';

    const addMachineBtn = document.getElementById('addMachineBtn');
    if (addMachineBtn) addMachineBtn.style.display = isOperatorOrAdmin ? 'inline-flex' : 'none';

    const addDtBtn = document.getElementById('addDtBtn');
    if (addDtBtn) addDtBtn.style.display = isOperatorOrAdmin ? 'inline-flex' : 'none';

    const addIncomeBtn = document.getElementById('addIncomeBtn');
    if (addIncomeBtn) addIncomeBtn.style.display = isFinanceOrAdmin ? 'inline-flex' : 'none';

    const addExpenseBtn = document.getElementById('addExpenseBtn');
    if (addExpenseBtn) addExpenseBtn.style.display = isFinanceOrAdmin ? 'inline-flex' : 'none';

    const addPettyBtn = document.getElementById('addPettyBtn');
    if (addPettyBtn) addPettyBtn.style.display = isFinanceOrAdmin ? 'inline-flex' : 'none';
}

function switchTab(targetId) {
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

function checkAdmin() {
    if (currentUser.role !== 'manager') {
        alert("Access Denied: Only Site Managers (Admins) are permitted to perform this action.");
        return false;
    }
    return true;
}

// --- CRUD & ACTIONS ---
async function addUserRecord() {
    if (!checkAdmin()) return;
    const username = prompt("Enter username:");
    const password = prompt("Enter password:");
    const role = prompt("Enter role (manager/hr/finance/operator/fleet):", "operator");
    if (username && password) await apiPost('users', { username, password, role });
}

async function addHrEmpRecord() {
    const fullname = prompt("Enter Full Name:");
    const department = prompt("Enter Department:", "Operations");
    const position = prompt("Enter Position:", "Operator");
    const phone = prompt("Enter Phone:", "+251");
    const nowStr = new Date().toLocaleString();
    if (fullname) await apiPost('hremployees', { fullname, department, position, phone, recorded_by: currentUser.username, recorded_date: nowStr });
}

async function addStoreItemRecord() {
    const itemCode = prompt("Enter Item Code (e.g. MTR-003):", "MTR-");
    const itemName = prompt("Enter Item Name:");
    const category = prompt("Enter Category:", "Building Materials");
    const qty = parseFloat(prompt("Enter Quantity:", "100"));
    const unit = prompt("Enter Unit (e.g. Bags, Pcs):", "Pcs");
    const unitCost = parseFloat(prompt("Enter Unit Cost (ETB):", "500"));
    const nowStr = new Date().toLocaleString();
    if (itemCode && itemName) await apiPost('storeitems', { item_code: itemCode, item_name: itemName, category, qty, unit, unit_cost: unitCost, recorded_by: currentUser.username, recorded_date: nowStr });
}

async function addStoreReleaseRecord() {
    const storeItems = await apiGet('storeitems');
    const availableItems = storeItems.filter(s => s.qty > 0);
    if (availableItems.length === 0) {
        alert("No store items with available stock found!");
        return;
    }

    let listStr = availableItems.map(s => `ID: ${s.id} | ${s.item_code} - ${s.item_name} (Stock: ${s.qty} ${s.unit})`).join('\n');
    const selectedId = parseInt(prompt("Select Item ID to release:\n\n" + listStr), 10);
    const itemObj = availableItems.find(s => s.id === selectedId);
    if (!itemObj) { alert("Invalid Item ID."); return; }

    const qtyToRelease = parseFloat(prompt(`Enter quantity to release (Available: ${itemObj.qty} ${itemObj.unit}):`, "1"));
    if (isNaN(qtyToRelease) || qtyToRelease <= 0 || qtyToRelease > itemObj.qty) {
        alert("Invalid quantity.");
        return;
    }

    const recipient = prompt("Enter Recipient Name:");
    const projectSite = prompt("Enter Project Site:", "Main Site Block A");
    const date = prompt("Enter Date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    const nowStr = new Date().toLocaleString();

    if (recipient && date) {
        const res = await fetch(`${API_BASE}/store-release`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                itemId: itemObj.id,
                qtyReleased: qtyToRelease,
                releaseData: {
                    date,
                    item_id: itemObj.id,
                    item_code: itemObj.item_code,
                    item_name: itemObj.item_name,
                    qty_released: qtyToRelease,
                    recipient,
                    project_site: projectSite,
                    recorded_by: currentUser.username,
                    recorded_date: nowStr
                }
            })
        });
        const result = await res.json();
        if (result.success) {
            alert(`Released successfully! Remaining stock: ${result.remainingQty} ${itemObj.unit}`);
            refreshTables();
        } else {
            alert("Error: " + result.error);
        }
    }
}

async function addIncomeRecord() {
    const date = prompt("Enter Date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    const category = prompt("Enter Category:", "Aggregate Sales");
    const client = prompt("Enter Client Name:");
    const amount = parseFloat(prompt("Enter Amount (ETB):", "50000"));
    const nowStr = new Date().toLocaleString();
    if (date && client) await apiPost('siteincome', { date, category, client, amount, recorded_by: currentUser.username, recorded_date: nowStr });
}

async function addExpenseRecord() {
    const date = prompt("Enter Date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    const category = prompt("Enter Category:", "Utilities");
    const description = prompt("Enter Description:");
    const amount = parseFloat(prompt("Enter Amount (ETB):", "10000"));
    const nowStr = new Date().toLocaleString();
    if (date && description) await apiPost('siteexpenses', { date, category, description, amount, recorded_by: currentUser.username, recorded_date: nowStr });
}

async function addPurchaseRecord() {
    const date = prompt("Enter Date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    const item = prompt("Enter Item / Description:");
    const qty = parseFloat(prompt("Enter Quantity:", "1"));
    const cost = parseFloat(prompt("Enter Estimated Cost (ETB):", "5000"));
    const nowStr = new Date().toLocaleString();
    if (date && item) {
        await apiPost('purchases', { date, item, qty, cost, status: 'Pending', recorded_by: currentUser.username, recorded_date: nowStr });
        alert("Purchase request submitted successfully and marked as Pending for Manager review.");
    }
}

async function addFuelRecord() {
    const date = prompt("Enter Date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    const equipment = prompt("Enter Equipment ID:");
    const operator = prompt("Enter Operator Name:");
    const litres = parseFloat(prompt("Enter Litres:", "100"));
    const nowStr = new Date().toLocaleString();
    if (date && equipment) await apiPost('fuel', { date, equipment, operator, litres, recorded_by: currentUser.username, recorded_date: nowStr });
}

async function addMachineRecord() {
    const date = prompt("Enter Date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    const machine = prompt("Enter Machine ID:");
    const hours = parseFloat(prompt("Enter Hours Worked:", "8"));
    const status = prompt("Enter Status (Active/Maintenance):", "Active");
    const nowStr = new Date().toLocaleString();
    if (date && machine) await apiPost('machines', { date, machine, hours, status, recorded_by: currentUser.username, recorded_date: nowStr });
}

async function addDumpTruckRecord() {
    const date = prompt("Enter Date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    const truck = prompt("Enter Truck ID:");
    const trips = parseInt(prompt("Enter Trip Count:", "10"), 10);
    const volume = parseFloat(prompt("Enter Volume (m³):", "80"));
    const nowStr = new Date().toLocaleString();
    if (date && truck) await apiPost('dumptrucks', { date, truck, trips, volume, recorded_by: currentUser.username, recorded_date: nowStr });
}

async function addPettyCashRecord() {
    const date = prompt("Enter Date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    const description = prompt("Enter Description:");
    const amount = parseFloat(prompt("Enter Amount (ETB):", "1000"));
    const nowStr = new Date().toLocaleString();
    if (date && description) await apiPost('pettycash', { date, description, amount, recorded_by: currentUser.username, recorded_date: nowStr });
}

async function reviewPurchase(id, oldStatus) {
    if (!checkAdmin()) return;
    const status = prompt("Update Purchase Status (Pending / Approved / Completed / Rejected):", oldStatus);
    if (status) {
        await apiPut('purchases', id, { status });
    }
}

async function refreshTables() {
    const isAdmin = currentUser.role === 'manager';

    // Users
    const users = await apiGet('users');
    document.getElementById('userTableBody').innerHTML = users.map(u => `
        <tr class="hover:bg-slate-50">
            <td class="p-4 font-semibold">${u.username}</td>
            <td class="p-4 text-slate-500">${u.password}</td>
            <td class="p-4 uppercase text-xs font-bold text-amber-600">${u.role}</td>
            <td class="p-4" style="display: ${isAdmin ? '' : 'none'};">
                <button onclick="apiDelete('users', ${u.id})" class="text-rose-600 hover:underline text-xs font-semibold">Delete</button>
            </td>
        </tr>
    `).join('');

    // HR Employees
    const hr = await apiGet('hremployees');
    document.getElementById('hrempTableBody').innerHTML = hr.map(h => `
        <tr class="hover:bg-slate-50">
            <td class="p-4 font-semibold">${h.fullname}</td>
            <td class="p-4 text-slate-600">${h.department}</td>
            <td class="p-4 text-indigo-600 font-medium">${h.position}</td>
            <td class="p-4 text-slate-500">${h.phone}</td>
            <td class="p-4" style="display: ${isAdmin ? '' : 'none'};">
                <button onclick="apiDelete('hremployees', ${h.id})" class="text-rose-600 hover:underline text-xs font-semibold">Delete</button>
            </td>
        </tr>
    `).join('');

    // Store Items
    const store = await apiGet('storeitems');
    document.getElementById('storeTableBody').innerHTML = store.map(s => `
        <tr class="hover:bg-slate-50">
            <td class="p-4 font-mono font-bold text-slate-600">${s.item_code}</td>
            <td class="p-4 font-semibold">${s.item_name}</td>
            <td class="p-4 text-slate-500">${s.category}</td>
            <td class="p-4 font-bold text-amber-600">${s.qty}</td>
            <td class="p-4 text-slate-500">${s.unit}</td>
            <td class="p-4 font-semibold">ETB ${s.unit_cost.toLocaleString()}</td>
            <td class="p-4" style="display: ${isAdmin ? '' : 'none'};">
                <button onclick="apiDelete('storeitems', ${s.id})" class="text-rose-600 hover:underline text-xs font-semibold">Delete</button>
            </td>
        </tr>
    `).join('');

    // Releases
    const releases = await apiGet('storereleases');
    document.getElementById('releasesTableBody').innerHTML = releases.map(r => `
        <tr class="hover:bg-slate-50">
            <td class="p-4 text-slate-500 text-xs">${r.date}</td>
            <td class="p-4 font-semibold">${r.item_code} - ${r.item_name}</td>
            <td class="p-4 font-bold text-rose-600">${r.qty_released}</td>
            <td class="p-4 text-slate-700">${r.recipient}</td>
            <td class="p-4 text-slate-600">${r.project_site}</td>
            <td class="p-4" style="display: ${isAdmin ? '' : 'none'};">
                <button onclick="apiDelete('storereleases', ${r.id})" class="text-rose-600 hover:underline text-xs font-semibold">Delete</button>
            </td>
        </tr>
    `).join('');

    // Income
    const income = await apiGet('siteincome');
    const totInc = income.reduce((sum, i) => sum + i.amount, 0);
    document.getElementById('kpi-income').innerText = `ETB ${totInc.toLocaleString()}`;
    document.getElementById('incomeTableBody').innerHTML = income.map(i => `
        <tr class="hover:bg-slate-50">
            <td class="p-4 text-xs">${i.date}</td>
            <td class="p-4 font-semibold">${i.category}</td>
            <td class="p-4">${i.client}</td>
            <td class="p-4 text-emerald-600 font-bold">ETB ${i.amount.toLocaleString()}</td>
            <td class="p-4" style="display: ${isAdmin ? '' : 'none'};">
                <button onclick="apiDelete('siteincome', ${i.id})" class="text-rose-600 hover:underline text-xs font-semibold">Delete</button>
            </td>
        </tr>
    `).join('');

    // Expenses
    const expenses = await apiGet('siteexpenses');
    const totExp = expenses.reduce((sum, e) => sum + e.amount, 0);
    document.getElementById('kpi-expenses').innerText = `ETB ${totExp.toLocaleString()}`;
    document.getElementById('expensesTableBody').innerHTML = expenses.map(e => `
        <tr class="hover:bg-slate-50">
            <td class="p-4 text-xs">${e.date}</td>
            <td class="p-4 font-semibold">${e.category}</td>
            <td class="p-4 text-slate-600">${e.description}</td>
            <td class="p-4 text-rose-600 font-bold">ETB ${e.amount.toLocaleString()}</td>
            <td class="p-4" style="display: ${isAdmin ? '' : 'none'};">
                <button onclick="apiDelete('siteexpenses', ${e.id})" class="text-rose-600 hover:underline text-xs font-semibold">Delete</button>
            </td>
        </tr>
    `).join('');

    // Purchases
    const purchases = await apiGet('purchases');
    document.getElementById('purchaseTableBody').innerHTML = purchases.map(p => `
        <tr class="hover:bg-slate-50">
            <td class="p-4 text-xs">${p.date}</td>
            <td class="p-4 font-semibold">${p.item}</td>
            <td class="p-4">${p.qty}</td>
            <td class="p-4 text-amber-600 font-bold">ETB ${p.cost.toLocaleString()}</td>
            <td class="p-4"><span class="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-bold">${p.status}</span><br><span class="text-[10px] text-slate-400">By: ${p.recorded_by}</span></td>
            <td class="p-4 space-x-2" style="display: ${isAdmin ? '' : 'none'};">
                <button onclick="reviewPurchase(${p.id}, '${p.status}')" class="text-amber-600 hover:underline text-xs font-semibold">Review / Approve</button>
                <button onclick="apiDelete('purchases', ${p.id})" class="text-rose-600 hover:underline text-xs font-semibold">Delete</button>
            </td>
        </tr>
    `).join('');

    // Fuel
    const fuel = await apiGet('fuel');
    const totFuel = fuel.reduce((sum, f) => sum + f.litres, 0);
    document.getElementById('kpi-fuel').innerText = `${totFuel} L`;
    document.getElementById('fuelTableBody').innerHTML = fuel.map(f => `
        <tr class="hover:bg-slate-50">
            <td class="p-4 text-xs">${f.date}</td>
            <td class="p-4 font-semibold">${f.equipment}</td>
            <td class="p-4">${f.operator}</td>
            <td class="p-4 text-emerald-600 font-bold">${f.litres} L</td>
            <td class="p-4" style="display: ${isAdmin ? '' : 'none'};">
                <button onclick="apiDelete('fuel', ${f.id})" class="text-rose-600 hover:underline text-xs font-semibold">Delete</button>
            </td>
        </tr>
    `).join('');

    // Machines
    const machines = await apiGet('machines');
    document.getElementById('machineTableBody').innerHTML = machines.map(m => `
        <tr class="hover:bg-slate-50">
            <td class="p-4 text-xs">${m.date}</td>
            <td class="p-4 font-semibold">${m.machine}</td>
            <td class="p-4">${m.hours} hrs</td>
            <td class="p-4"><span class="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-bold">${m.status}</span></td>
            <td class="p-4" style="display: ${isAdmin ? '' : 'none'};">
                <button onclick="apiDelete('machines', ${m.id})" class="text-rose-600 hover:underline text-xs font-semibold">Delete</button>
            </td>
        </tr>
    `).join('');

    // Dump Trucks
    const dt = await apiGet('dumptrucks');
    document.getElementById('dumptruckTableBody').innerHTML = dt.map(d => `
        <tr class="hover:bg-slate-50">
            <td class="p-4 text-xs">${d.date}</td>
            <td class="p-4 font-semibold">${d.truck}</td>
            <td class="p-4">${d.trips}</td>
            <td class="p-4 text-blue-600 font-bold">${d.volume} m³</td>
            <td class="p-4" style="display: ${isAdmin ? '' : 'none'};">
                <button onclick="apiDelete('dumptrucks', ${d.id})" class="text-rose-600 hover:underline text-xs font-semibold">Delete</button>
            </td>
        </tr>
    `).join('');

    // Petty Cash
    const petty = await apiGet('pettycash');
    const totPetty = petty.reduce((sum, p) => sum + p.amount, 0);
    document.getElementById('kpi-petty').innerText = `ETB ${totPetty.toLocaleString()}`;
    document.getElementById('pettycashTableBody').innerHTML = petty.map(p => `
        <tr class="hover:bg-slate-50">
            <td class="p-4 text-xs">${p.date}</td>
            <td class="p-4 font-semibold">${p.description}</td>
            <td class="p-4 text-blue-600 font-bold">ETB ${p.amount.toLocaleString()}</td>
            <td class="p-4" style="display: ${isAdmin ? '' : 'none'};">
                <button onclick="apiDelete('pettycash', ${p.id})" class="text-rose-600 hover:underline text-xs font-semibold">Delete</button>
            </td>
        </tr>
    `).join('');
}

function resetDateFilter() {
    document.getElementById('globalDateFrom').value = '';
    document.getElementById('globalDateTo').value = '';
    refreshTables();
}