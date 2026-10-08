let useFallbackStorage = true;
let currentUser = { username: "manager", role: "manager", location: "Bishoftu Main Site" };

// Initialize database immediately on any server
window.addEventListener('DOMContentLoaded', () => {
    initFallbackDatabase();
    refreshTables();
});

function initFallbackDatabase() {
    if (!localStorage.getItem('bishoftu_fallback_db')) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const nowStr = new Date().toLocaleString();
        const initialData = {
            users: [{ id: 1, username: 'manager', password: '123', role: 'manager' }],
            hremployees: [{ id: 1, fullname: 'Dawit Mekonnen', department: 'Operations', position: 'Site Supervisor', phone: '+251911234567', recorded_by: 'manager', recorded_date: nowStr }],
            siteincome: [{ id: 1, date: todayStr, category: 'Aggregate Sales', client: 'Awash Construction Plc', amount: 150000, recorded_by: 'manager', recorded_date: nowStr }],
            siteexpenses: [{ id: 1, date: todayStr, category: 'Utilities', description: 'Monthly Electric Power Bill', amount: 24000, recorded_by: 'manager', recorded_date: nowStr }],
            purchases: [{ id: 1, date: todayStr, item: 'Hydraulic Oil ISO 68', qty: 5, cost: 12500, status: 'Pending', recorded_by: 'manager', recorded_date: nowStr }],
            fuel: [{ id: 1, date: todayStr, equipment: 'Excavator EX-01', operator: 'Dawit M.', litres: 150, recorded_by: 'manager', recorded_date: nowStr }],
            machines: [{ id: 1, date: todayStr, machine: 'Grader GR-02', hours: 42, status: 'Active', recorded_by: 'manager', recorded_date: nowStr }],
            dumptrucks: [{ id: 1, date: todayStr, truck: 'Isuzu DT-05', trips: 12, volume: 96, recorded_by: 'manager', recorded_date: nowStr }],
            pettycash: [{ id: 1, date: todayStr, description: 'Office supplies & water', amount: 2500, recorded_by: 'manager', recorded_date: nowStr }]
        };
        localStorage.setItem('bishoftu_fallback_db', JSON.stringify(initialData));
    }
}

function getTableData(tableName) {
    const data = JSON.parse(localStorage.getItem('bishoftu_fallback_db') || '{}');
    return data[tableName] || [];
}

function insertRecord(tableName, recordObj) {
    recordObj.recorded_by = currentUser.username;
    recordObj.recorded_date = new Date().toLocaleString();

    const data = JSON.parse(localStorage.getItem('bishoftu_fallback_db') || '{}');
    if (!data[tableName]) data[tableName] = [];
    recordObj.id = data[tableName].length > 0 ? Math.max(...data[tableName].map(r => r.id)) + 1 : 1;
    data[tableName].push(recordObj);
    localStorage.setItem('bishoftu_fallback_db', JSON.stringify(data));
    refreshTables();
}

function updateRecord(tableName, id, recordObj) {
    const data = JSON.parse(localStorage.getItem('bishoftu_fallback_db') || '{}');
    if (data[tableName]) {
        data[tableName] = data[tableName].map(r => r.id === id ? { ...r, ...recordObj } : r);
        localStorage.setItem('bishoftu_fallback_db', JSON.stringify(data));
    }
    refreshTables();
}

function deleteRecord(tableName, id) {
    const data = JSON.parse(localStorage.getItem('bishoftu_fallback_db') || '{}');
    if (data[tableName]) {
        data[tableName] = data[tableName].filter(r => r.id !== id);
        localStorage.setItem('bishoftu_fallback_db', JSON.stringify(data));
    }
    refreshTables();
}

function handleLogin(event) {
    event.preventDefault();
    const role = document.getElementById('loginRoleSelect').value;
    const username = document.getElementById('loginUsername').value;
    
    currentUser = { username, role, location: "Bishoftu Main Site" };
    document.getElementById('authOverlay').style.display = 'none';
    document.getElementById('header-username-lbl').innerText = username;
    document.getElementById('header-role-lbl').innerText = role.toUpperCase();
    
    applyRolePermissions();
    switchTab('dashboard');
}

function applyRolePermissions() {
    const isAdmin = currentUser.role === 'manager';
    const isFinanceOrAdmin = currentUser.role === 'manager' || currentUser.role === 'finance';
    const isOperatorOrAdmin = currentUser.role === 'manager' || currentUser.role === 'operator';
    
    const adminDbTools = document.getElementById('adminDbTools');
    if (adminDbTools) adminDbTools.style.display = isAdmin ? 'flex' : 'none';

    const adminAddButtons = ['addUserBtn', 'addHrEmpBtn', 'addFuelBtn'];
    adminAddButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) btn.style.display = isAdmin ? 'inline-flex' : 'none';
    });

    const operatorAddButtons = ['addMachineBtn', 'addDtBtn'];
    operatorAddButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) btn.style.display = isOperatorOrAdmin ? 'inline-flex' : 'none';
    });

    const financeAddButtons = ['addIncomeBtn', 'addExpenseBtn', 'addPurchaseBtn', 'addPettyBtn'];
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

function updateLoginHint(role) {
    const hintText = document.getElementById('loginHintText');
    if (role === 'manager') {
        hintText.innerText = "Role selected: Site Manager. Full CRUD, audit tracking & backup privileges enabled.";
    } else if (role === 'finance') {
        hintText.innerText = "Role selected: Finance Manager. Add records (Recorded By & Timestamp captured automatically).";
    } else if (role === 'operator') {
        hintText.innerText = "Role selected: Machine Operator. Permitted to log Machine & Dump Truck activities.";
    } else {
        hintText.innerText = "Role selected: " + role.toUpperCase() + ". View-only access.";
    }
}

function switchTab(targetId) {
    if (['income', 'expenses', 'purchase', 'pettycash'].includes(targetId) && currentUser.role !== 'manager' && currentUser.role !== 'finance') {
        alert("Access Denied: Financial dashboards are restricted.");
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
}

function logout() {
    document.getElementById('authOverlay').style.display = 'flex';
}

function checkAdminPermission() {
    if (currentUser.role !== 'manager') {
        alert("Access Denied: Only Site Managers (Admins) are permitted to edit or delete records.");
        return false;
    }
    return true;
}

function checkFinanceOrAdminPermission() {
    if (currentUser.role !== 'manager' && currentUser.role !== 'finance') {
        alert("Access Denied: Financial operations are restricted to Finance and Admin roles.");
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

// --- CRUD FUNCTIONS ---
function addUserRecord() {
    if (!checkAdminPermission()) return;
    const username = prompt("Enter username:");
    const password = prompt("Enter password:");
    const role = prompt("Enter role (manager/fleet/finance/operator):", "operator");
    if (username && password) insertRecord('users', { username, password, role });
}
function editUserRecord(id, oldUser, oldPass, oldRole) {
    if (!checkAdminPermission()) return;
    const username = prompt("Edit username:", oldUser);
    const password = prompt("Edit password:", oldPass);
    const role = prompt("Edit role:", oldRole);
    if (username && password) updateRecord('users', id, { username, password, role });
}
function deleteUserRecord(id) {
    if (!checkAdminPermission()) return;
    if (confirm("Delete this user?")) deleteRecord('users', id);
}

function addHrEmpRecord() {
    if (!checkAdminPermission()) return;
    const fullname = prompt("Enter Full Name:");
    const department = prompt("Enter Department:", "Operations");
    const position = prompt("Enter Position:", "Operator");
    const phone = prompt("Enter Phone:", "+251");
    if (fullname) insertRecord('hremployees', { fullname, department, position, phone });
}
function editHrEmpRecord(id, oldName, oldDept, oldPos, oldPhone) {
    if (!checkAdminPermission()) return;
    const fullname = prompt("Edit Full Name:", oldName);
    const department = prompt("Edit Department:", oldDept);
    const position = prompt("Edit Position:", oldPos);
    const phone = prompt("Edit Phone:", oldPhone);
    if (fullname) updateRecord('hremployees', id, { fullname, department, position, phone });
}
function deleteHrEmpRecord(id) {
    if (!checkAdminPermission()) return;
    if (confirm("Delete this employee?")) deleteRecord('hremployees', id);
}

function addIncomeRecord() {
    if (!checkFinanceOrAdminPermission()) return;
    const date = prompt("Enter Date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    const category = prompt("Enter Income Category:", "Aggregate Sales");
    const client = prompt("Enter Payer / Client Name:");
    const amount = parseFloat(prompt("Enter Amount (ETB):", "50000"));
    if (date && category && !isNaN(amount)) insertRecord('siteincome', { date, category, client, amount });
}
function editIncomeRecord(id, oldDate, oldCat, oldClient, oldAmt) {
    if (!checkAdminPermission()) return;
    const date = prompt("Edit Date:", oldDate);
    const category = prompt("Edit Category:", oldCat);
    const client = prompt("Edit Client:", oldClient);
    const amount = parseFloat(prompt("Edit Amount:", oldAmt));
    if (date && category && !isNaN(amount)) updateRecord('siteincome', id, { date, category, client, amount });
}
function deleteIncomeRecord(id) {
    if (!checkAdminPermission()) return;
    if (confirm("Delete income record?")) deleteRecord('siteincome', id);
}

function addExpenseRecord() {
    if (!checkFinanceOrAdminPermission()) return;
    const date = prompt("Enter Date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    const category = prompt("Enter Expense Category:", "Utilities");
    const description = prompt("Enter Description:");
    const amount = parseFloat(prompt("Enter Amount (ETB):", "10000"));
    if (date && category && !isNaN(amount)) insertRecord('siteexpenses', { date, category, description, amount });
}
function editExpenseRecord(id, oldDate, oldCat, oldDesc, oldAmt) {
    if (!checkAdminPermission()) return;
    const date = prompt("Edit Date:", oldDate);
    const category = prompt("Edit Category:", oldCat);
    const description = prompt("Edit Description:", oldDesc);
    const amount = parseFloat(prompt("Edit Amount:", oldAmt));
    if (date && category && !isNaN(amount)) updateRecord('siteexpenses', id, { date, category, description, amount });
}
function deleteExpenseRecord(id) {
    if (!checkAdminPermission()) return;
    if (confirm("Delete expense record?")) deleteRecord('siteexpenses', id);
}

function addPurchaseRecord() {
    if (!checkFinanceOrAdminPermission()) return;
    const date = prompt("Enter Date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    const item = prompt("Enter Item Description:");
    const qty = parseFloat(prompt("Enter Quantity:", "1"));
    const cost = parseFloat(prompt("Enter Cost (ETB):", "5000"));
    const status = prompt("Enter Status:", "Pending");
    if (date && item) insertRecord('purchases', { date, item, qty, cost, status });
}
function editPurchaseRecord(id, oldDate, oldItem, oldQty, oldCost, oldStatus) {
    if (!checkAdminPermission()) return;
    const date = prompt("Edit Date:", oldDate);
    const item = prompt("Edit Item:", oldItem);
    const qty = parseFloat(prompt("Edit Qty:", oldQty));
    const cost = parseFloat(prompt("Edit Cost:", oldCost));
    const status = prompt("Edit Status:", oldStatus);
    if (date && item) updateRecord('purchases', id, { date, item, qty, cost, status });
}
function deletePurchaseRecord(id) {
    if (!checkAdminPermission()) return;
    if (confirm("Delete purchase request?")) deleteRecord('purchases', id);
}

function addFuelRecord() {
    if (!checkAdminPermission()) return;
    const date = prompt("Enter Date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    const equipment = prompt("Enter Equipment ID:");
    const operator = prompt("Enter Operator Name:");
    const litres = parseFloat(prompt("Enter Litres:", "100"));
    if (date && equipment) insertRecord('fuel', { date, equipment, operator, litres });
}
function editFuelRecord(id, oldDate, oldEq, oldOp, oldLitres) {
    if (!checkAdminPermission()) return;
    const date = prompt("Edit Date:", oldDate);
    const equipment = prompt("Edit Equipment:", oldEq);
    const operator = prompt("Edit Operator:", oldOp);
    const litres = parseFloat(prompt("Edit Litres:", oldLitres));
    if (date && equipment) updateRecord('fuel', id, { date, equipment, operator, litres });
}
function deleteFuelRecord(id) {
    if (!checkAdminPermission()) return;
    if (confirm("Delete fuel record?")) deleteRecord('fuel', id);
}

function addMachineRecord() {
    if (!checkOperatorOrAdminPermission()) return;
    const date = prompt("Enter Date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    const machine = prompt("Enter Machine ID:");
    const hours = parseFloat(prompt("Enter Hours Worked:", "8"));
    const status = prompt("Enter Status (Active/Maintenance):", "Active");
    if (date && machine && !isNaN(hours)) insertRecord('machines', { date, machine, hours, status });
}
function editMachineRecord(id, oldDate, oldMac, oldHours, oldStatus) {
    if (!checkAdminPermission()) return;
    const date = prompt("Edit Date:", oldDate);
    const machine = prompt("Edit Machine:", oldMac);
    const hours = parseFloat(prompt("Edit Hours:", oldHours));
    const status = prompt("Edit Status:", oldStatus);
    if (date && machine) updateRecord('machines', id, { date, machine, hours, status });
}
function deleteMachineRecord(id) {
    if (!checkAdminPermission()) return;
    if (confirm("Delete machine log?")) deleteRecord('machines', id);
}

function addDumpTruckRecord() {
    if (!checkOperatorOrAdminPermission()) return;
    const date = prompt("Enter Date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    const truck = prompt("Enter Truck ID:");
    const trips = parseInt(prompt("Enter Trip Count:", "10"), 10);
    const volume = parseFloat(prompt("Enter Volume (m³):", "80"));
    if (date && truck && !isNaN(trips)) insertRecord('dumptrucks', { date, truck, trips, volume });
}
function editDumpTruckRecord(id, oldDate, oldTruck, oldTrips, oldVol) {
    if (!checkAdminPermission()) return;
    const date = prompt("Edit Date:", oldDate);
    const truck = prompt("Edit Truck:", oldTruck);
    const trips = parseInt(prompt("Edit Trips:", oldTrips), 10);
    const volume = parseFloat(prompt("Edit Volume:", oldVol));
    if (date && truck) updateRecord('dumptrucks', id, { date, truck, trips, volume });
}
function deleteDumpTruckRecord(id) {
    if (!checkAdminPermission()) return;
    if (confirm("Delete haulage record?")) deleteRecord('dumptrucks', id);
}

function addPettyCashRecord() {
    if (!checkFinanceOrAdminPermission()) return;
    const date = prompt("Enter Date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    const description = prompt("Enter Description:");
    const amount = parseFloat(prompt("Enter Amount (ETB):", "1000"));
    if (date && description && !isNaN(amount)) insertRecord('pettycash', { date, description, amount });
}
function editPettyCashRecord(id, oldDate, oldDesc, oldAmt) {
    if (!checkAdminPermission()) return;
    const date = prompt("Edit Date:", oldDate);
    const description = prompt("Edit Description:", oldDesc);
    const amount = parseFloat(prompt("Edit Amount:", oldAmt));
    if (date && description) updateRecord('pettycash', id, { date, description, amount });
}
function deletePettyCashRecord(id) {
    if (!checkAdminPermission()) return;
    if (confirm("Delete petty cash voucher?")) deleteRecord('pettycash', id);
}

function filterAndSort(records) {
    const fromDate = document.getElementById('globalDateFrom').value;
    const toDate = document.getElementById('globalDateTo').value;

    return records.filter(r => {
        if (!r.date) return true;
        if (fromDate && r.date < fromDate) return false;
        if (toDate && r.date > toDate) return false;
        return true;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function refreshTables() {
    const isAdmin = currentUser.role === 'manager';
    const isFinanceOrAdmin = currentUser.role === 'manager' || currentUser.role === 'finance';

    // Users
    const users = getTableData('users');
    document.getElementById('userTableBody').innerHTML = users.map(u => `
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
    document.getElementById('userCount').innerText = `${users.length} records`;

    // HR Employees
    const hrList = getTableData('hremployees');
    document.getElementById('hrempTableBody').innerHTML = hrList.map(h => `
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
    document.getElementById('hrempCount').innerText = `${hrList.length} records`;

    // Site Income
    if (isFinanceOrAdmin) {
        const incList = filterAndSort(getTableData('siteincome'));
        let totalIncome = incList.reduce((sum, i) => sum + i.amount, 0);
        document.getElementById('incomeTableBody').innerHTML = incList.map(i => `
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
        document.getElementById('incomeCount').innerText = `${incList.length} records`;
        document.getElementById('kpi-income').innerText = `ETB ${totalIncome.toLocaleString()}`;

        // Other Expenses
        const expList = filterAndSort(getTableData('siteexpenses'));
        let totalExpenses = expList.reduce((sum, e) => sum + e.amount, 0);
        document.getElementById('expensesTableBody').innerHTML = expList.map(e => `
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
        document.getElementById('expensesCount').innerText = `${expList.length} records`;
        document.getElementById('kpi-expenses').innerText = `ETB ${totalExpenses.toLocaleString()}`;

        // Petty Cash Balance KPI & Table
        const pcList = filterAndSort(getTableData('pettycash'));
        let totalPetty = pcList.reduce((sum, p) => sum + p.amount, 0);
        document.getElementById('kpi-petty').innerText = `ETB ${totalPetty.toLocaleString()}`;

        document.getElementById('pettycashTableBody').innerHTML = pcList.map(p => `
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
        document.getElementById('pettycashCount').innerText = `${pcList.length} records`;
    }

    // Purchases
    const purList = filterAndSort(getTableData('purchases'));
    document.getElementById('purchaseTableBody').innerHTML = purList.map(p => `
        <tr class="hover:bg-slate-50">
            <td class="p-4 text-slate-500 text-xs">${p.date}</td>
            <td class="p-4 font-semibold">${p.item}</td>
            <td class="p-4">${p.qty}</td>
            <td class="p-4 text-amber-600 font-bold">ETB ${p.cost.toLocaleString()}</td>
            <td class="p-4"><span class="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-bold">${p.status}</span><br><span class="text-[10px] text-slate-400">By: ${p.recorded_by || 'system'} (${p.recorded_date || '-'})</span></td>
            <td class="p-4 space-x-2" style="display: ${isAdmin ? '' : 'none'};">
                <button onclick="editPurchaseRecord(${p.id}, '${p.date}', '${p.item}', ${p.qty}, ${p.cost}, '${p.status}')" class="text-amber-600 hover:underline text-xs font-semibold">Edit</button>
                <button onclick="deletePurchaseRecord(${p.id})" class="text-rose-600 hover:underline text-xs font-semibold">Delete</button>
            </td>
        </tr>
    `).join('');
    document.getElementById('purchaseCount').innerText = `${purList.length} records`;

    // Fuel
    const fuelList = filterAndSort(getTableData('fuel'));
    let totalFuel = fuelList.reduce((sum, f) => sum + f.litres, 0);
    document.getElementById('fuelTableBody').innerHTML = fuelList.map(f => `
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
    document.getElementById('fuelCount').innerText = `${fuelList.length} records`;
    document.getElementById('kpi-fuel').innerText = `${totalFuel} L`;

    // Machines
    const machineList = filterAndSort(getTableData('machines'));
    document.getElementById('machineTableBody').innerHTML = machineList.map(m => `
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
    document.getElementById('machineCount').innerText = `${machineList.length} records`;

    // Dump Trucks
    const dtList = filterAndSort(getTableData('dumptrucks'));
    document.getElementById('dumptruckTableBody').innerHTML = dtList.map(d => `
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
    document.getElementById('dumptruckCount').innerText = `${dtList.length} records`;
}

function exportDatabase() {
    if (!checkAdminPermission()) return;
    const data = localStorage.getItem('bishoftu_fallback_db');
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bishoftu_backup_${new Date().toISOString().slice(0,10)}.json`;
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
            localStorage.setItem('bishoftu_fallback_db', e.target.result);
            refreshTables();
            alert("Database successfully restored from backup!");
        } catch (err) {
            alert("Invalid backup file.");
        }
    };
    reader.readAsText(file);
}

function filterTable(tableId, query) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
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
