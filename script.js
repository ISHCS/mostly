// Relative API path works correctly across cPanel domain roots and subdirectories
const API_BASE = 'api';
let currentUser = { username: "Guest", role: "none" };

window.addEventListener('DOMContentLoaded', () => {
    refreshTables();
});

async function apiGet(table) {
    try {
        const res = await fetch(`${API_BASE}/${table}`);
        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch (err) {
            console.error(`API Error on ${table} (Response was not JSON):`, text);
            return [];
        }
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
    
    if (!users || users.length === 0) {
        alert("Connection Error: Could not reach backend users database. Check if Node.js app is started in cPanel.");
        return;
    }

    const dbUser = users.find(u => u.username === username && u.password === password);
    
    if (!dbUser) {
        alert("Invalid username or password!");
        return;
    }
    
    currentUser = { username: dbUser.username, role: dbUser.role };
    document.getElementById('authOverlay').style.display = 'none';
    document.getElementById('header-username-lbl').innerText = dbUser.username;
    document.getElementById('header-role-lbl').innerText = dbUser.role.toUpperCase();
    
    switchTab('dashboard');
}

function logout() {
    currentUser = { username: "Guest", role: "none" };
    document.getElementById('authOverlay').style.display = 'flex';
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

async function addUserRecord() {
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
    const itemCode = prompt("Enter Item Code:", "MTR-003");
    const itemName = prompt("Enter Item Name:");
    const category = prompt("Enter Category:", "Building Materials");
    const qty = parseFloat(prompt("Enter Quantity:", "100"));
    const unit = prompt("Enter Unit:", "Pcs");
    const unitCost = parseFloat(prompt("Enter Unit Cost (ETB):", "500"));
    const nowStr = new Date().toLocaleString();
    if (itemCode && itemName) await apiPost('storeitems', { item_code: itemCode, item_name: itemName, category, qty, unit, unit_cost: unitCost, recorded_by: currentUser.username, recorded_date: nowStr });
}

async function addStoreReleaseRecord() {
    const storeItems = await apiGet('storeitems');
    if (storeItems.length === 0) { alert("No items in store!"); return; }
    let listStr = storeItems.map(s => `ID: ${s.id} | ${s.item_code} - ${s.item_name} (Stock: ${s.qty} ${s.unit})`).join('\n');
    const selectedId = parseInt(prompt("Select Item ID:\n\n" + listStr), 10);
    const itemObj = storeItems.find(s => s.id === selectedId);
    if (!itemObj) return alert("Invalid ID");

    const qtyToRelease = parseFloat(prompt(`Enter quantity (Max ${itemObj.qty}):`, "1"));
    const recipient = prompt("Recipient Name:");
    const projectSite = prompt("Project Site:", "Main Site");
    const date = new Date().toISOString().slice(0, 10);
    const nowStr = new Date().toLocaleString();

    if (recipient) {
        const res = await fetch(`${API_BASE}/store-release`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId: itemObj.id, qtyReleased: qtyToRelease, releaseData: { date, item_id: itemObj.id, item_code: itemObj.item_code, item_name: itemObj.item_name, qty_released: qtyToRelease, recipient, project_site: projectSite, recorded_by: currentUser.username, recorded_date: nowStr } })
        });
        const result = await res.json();
        if (result.success) { alert("Released successfully!"); refreshTables(); }
        else alert("Error: " + result.error);
    }
}

async function addIncomeRecord() {
    const date = new Date().toISOString().slice(0, 10);
    const category = prompt("Category:", "Aggregate Sales");
    const client = prompt("Client Name:");
    const amount = parseFloat(prompt("Amount (ETB):", "50000"));
    if (client) await apiPost('siteincome', { date, category, client, amount, recorded_by: currentUser.username, recorded_date: new Date().toLocaleString() });
}

async function addExpenseRecord() {
    const date = new Date().toISOString().slice(0, 10);
    const category = prompt("Category:", "Utilities");
    const description = prompt("Description:");
    const amount = parseFloat(prompt("Amount (ETB):", "10000"));
    if (description) await apiPost('siteexpenses', { date, category, description, amount, recorded_by: currentUser.username, recorded_date: new Date().toLocaleString() });
}

async function addPurchaseRecord() {
    const date = new Date().toISOString().slice(0, 10);
    const item = prompt("Item Description:");
    const qty = parseFloat(prompt("Quantity:", "1"));
    const cost = parseFloat(prompt("Cost (ETB):", "5000"));
    if (item) await apiPost('purchases', { date, item, qty, cost, status: 'Pending', recorded_by: currentUser.username, recorded_date: new Date().toLocaleString() });
}

async function addFuelRecord() {
    const date = new Date().toISOString().slice(0, 10);
    const equipment = prompt("Equipment ID:");
    const operator = prompt("Operator Name:");
    const litres = parseFloat(prompt("Litres:", "100"));
    if (equipment) await apiPost('fuel', { date, equipment, operator, litres, recorded_by: currentUser.username, recorded_date: new Date().toLocaleString() });
}

async function addMachineRecord() {
    const date = new Date().toISOString().slice(0, 10);
    const machine = prompt("Machine ID:");
    const hours = parseFloat(prompt("Hours Worked:", "8"));
    const status = prompt("Status:", "Active");
    if (machine) await apiPost('machines', { date, machine, hours, status, recorded_by: currentUser.username, recorded_date: new Date().toLocaleString() });
}

async function addDumpTruckRecord() {
    const date = new Date().toISOString().slice(0, 10);
    const truck = prompt("Truck ID:");
    const trips = parseInt(prompt("Trips:", "10"), 10);
    const volume = parseFloat(prompt("Volume (m³):", "80"));
    if (truck) await apiPost('dumptrucks', { date, truck, trips, volume, recorded_by: currentUser.username, recorded_date: new Date().toLocaleString() });
}

async function addPettyCashRecord() {
    const date = new Date().toISOString().slice(0, 10);
    const description = prompt("Description:");
    const amount = parseFloat(prompt("Amount (ETB):", "1000"));
    if (description) await apiPost('pettycash', { date, description, amount, recorded_by: currentUser.username, recorded_date: new Date().toLocaleString() });
}

async function refreshTables() {
    const users = await apiGet('users');
    document.getElementById('userTableBody').innerHTML = users.map(u => `<tr class="hover:bg-slate-50"><td class="p-4">${u.username}</td><td class="p-4">${u.password}</td><td class="p-4 uppercase text-xs font-bold">${u.role}</td><td class="p-4"><button onclick="apiDelete('users', ${u.id})" class="text-rose-600">Delete</button></td></tr>`).join('');

    const hr = await apiGet('hremployees');
    document.getElementById('hrempTableBody').innerHTML = hr.map(h => `<tr class="hover:bg-slate-50"><td class="p-4">${h.fullname}</td><td class="p-4">${h.department}</td><td class="p-4">${h.position}</td><td class="p-4">${h.phone}</td><td class="p-4"><button onclick="apiDelete('hremployees', ${h.id})" class="text-rose-600">Delete</button></td></tr>`).join('');

    const store = await apiGet('storeitems');
    document.getElementById('storeTableBody').innerHTML = store.map(s => `<tr class="hover:bg-slate-50"><td class="p-4 font-mono">${s.item_code}</td><td class="p-4">${s.item_name}</td><td class="p-4">${s.category}</td><td class="p-4 font-bold text-amber-600">${s.qty}</td><td class="p-4">${s.unit}</td><td class="p-4">${s.unit_cost}</td><td class="p-4"><button onclick="apiDelete('storeitems', ${s.id})" class="text-rose-600">Delete</button></td></tr>`).join('');

    const rel = await apiGet('storereleases');
    document.getElementById('releasesTableBody').innerHTML = rel.map(r => `<tr class="hover:bg-slate-50"><td class="p-4">${r.date}</td><td class="p-4">${r.item_code} - ${r.item_name}</td><td class="p-4 font-bold">${r.qty_released}</td><td class="p-4">${r.recipient}</td><td class="p-4">${r.project_site}</td><td class="p-4"><button onclick="apiDelete('storereleases', ${r.id})" class="text-rose-600">Delete</button></td></tr>`).join('');

    const inc = await apiGet('siteincome');
    document.getElementById('kpi-income').innerText = `ETB ${inc.reduce((a,c)=>a+c.amount,0).toLocaleString()}`;
    document.getElementById('incomeTableBody').innerHTML = inc.map(i => `<tr class="hover:bg-slate-50"><td class="p-4">${i.date}</td><td class="p-4">${i.category}</td><td class="p-4">${i.client}</td><td class="p-4 text-emerald-600 font-bold">${i.amount}</td><td class="p-4"><button onclick="apiDelete('siteincome', ${i.id})" class="text-rose-600">Delete</button></td></tr>`).join('');

    const exp = await apiGet('siteexpenses');
    document.getElementById('kpi-expenses').innerText = `ETB ${exp.reduce((a,c)=>a+c.amount,0).toLocaleString()}`;
    document.getElementById('expensesTableBody').innerHTML = exp.map(e => `<tr class="hover:bg-slate-50"><td class="p-4">${e.date}</td><td class="p-4">${e.category}</td><td class="p-4">${e.description}</td><td class="p-4 text-rose-600 font-bold">${e.amount}</td><td class="p-4"><button onclick="apiDelete('siteexpenses', ${e.id})" class="text-rose-600">Delete</button></td></tr>`).join('');

    const pur = await apiGet('purchases');
    document.getElementById('purchaseTableBody').innerHTML = pur.map(p => `<tr class="hover:bg-slate-50"><td class="p-4">${p.date}</td><td class="p-4">${p.item}</td><td class="p-4">${p.qty}</td><td class="p-4">${p.cost}</td><td class="p-4"><span class="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs">${p.status}</span></td><td class="p-4"><button onclick="apiDelete('purchases', ${p.id})" class="text-rose-600">Delete</button></td></tr>`).join('');

    const fuel = await apiGet('fuel');
    document.getElementById('kpi-fuel').innerText = `${fuel.reduce((a,c)=>a+c.litres,0)} L`;
    document.getElementById('fuelTableBody').innerHTML = fuel.map(f => `<tr class="hover:bg-slate-50"><td class="p-4">${f.date}</td><td class="p-4">${f.equipment}</td><td class="p-4">${f.operator}</td><td class="p-4">${f.litres} L</td><td class="p-4"><button onclick="apiDelete('fuel', ${f.id})" class="text-rose-600">Delete</button></td></tr>`).join('');

    const mac = await apiGet('machines');
    document.getElementById('machineTableBody').innerHTML = mac.map(m => `<tr class="hover:bg-slate-50"><td class="p-4">${m.date}</td><td class="p-4">${m.machine}</td><td class="p-4">${m.hours} hrs</td><td class="p-4">${m.status}</td><td class="p-4"><button onclick="apiDelete('machines', ${m.id})" class="text-rose-600">Delete</button></td></tr>`).join('');

    const dt = await apiGet('dumptrucks');
    document.getElementById('dumptruckTableBody').innerHTML = dt.map(d => `<tr class="hover:bg-slate-50"><td class="p-4">${d.date}</td><td class="p-4">${d.truck}</td><td class="p-4">${d.trips}</td><td class="p-4">${d.volume} m³</td><td class="p-4"><button onclick="apiDelete('dumptrucks', ${d.id})" class="text-rose-600">Delete</button></td></tr>`).join('');

    const pet = await apiGet('pettycash');
    document.getElementById('kpi-petty').innerText = `ETB ${pet.reduce((a,c)=>a+c.amount,0).toLocaleString()}`;
    document.getElementById('pettycashTableBody').innerHTML = pet.map(p => `<tr class="hover:bg-slate-50"><td class="p-4">${p.date}</td><td class="p-4">${p.description}</td><td class="p-4 text-blue-600 font-bold">${p.amount}</td><td class="p-4"><button onclick="apiDelete('pettycash', ${p.id})" class="text-rose-600">Delete</button></td></tr>`).join('');
}