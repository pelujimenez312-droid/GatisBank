/* script.js */

// Base de datos Local P2P
if (!localStorage.getItem('gatis_full_offline_db')) {
    const defaultDB = {
        "matias": { password: "4026", displayName: "Matías J.", balance: 1000.00, txs: [], internet: false, exterior: false },
        "amigo": { password: "1234", displayName: "Amigo Gatis", balance: 500.00, txs: [], internet: false, exterior: false }
    };
    localStorage.setItem('gatis_full_offline_db', JSON.stringify(defaultDB));
}

function getDB() { return JSON.parse(localStorage.getItem('gatis_full_offline_db')); }
function saveDB(db) { localStorage.setItem('gatis_full_offline_db', JSON.stringify(db)); }

let currentUserKey = "";
let usedTokens = JSON.parse(localStorage.getItem('gatis_used_tokens_full')) || [];
let pagoScanner = null;
let reciboScanner = null;
let currentAuthorizedFunction = null;

// ================= LÓGICA DE ALGORITMO GATISTOKEN DINÁMICO (PROBLEMA 2) =================
// Genera un token matemático único de 6 dígitos que cambia cada minuto del día
function calculateCurrentToken() {
    const ahora = new Date();
    const factorDia = ahora.getDate() * ahora.getMonth() + 1;
    const factorMinuto = ahora.getHours() * 60 + ahora.getMinutes();
    
    // Algoritmo matemático pseudoaleatorio basado en tiempo real
    let seed = (factorMinuto * 4026) + factorDia;
    let tokenValue = Math.abs(Math.sin(seed) * 1000000);
    let tokenFinal = Math.floor(tokenValue % 900000) + 100000; 
    
    return tokenFinal.toString();
}

// ================= AUTENTICACIÓN =================
function showRegisterScreen() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('register-screen').style.display = 'flex';
}
function showLoginScreen() {
    document.getElementById('register-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
}

function handleRegister() {
    const name = document.getElementById('reg-name').value.trim();
    const user = document.getElementById('reg-user').value.trim().toLowerCase();
    const pass = document.getElementById('reg-pass').value;
    if(!name || !user || !pass) return alert("Llena los campos.");
    let db = getDB();
    if(db[user]) return alert("El usuario ya existe.");
    db[user] = { password: pass, displayName: name, balance: 0.00, txs: [], internet: false, exterior: false };
    saveDB(db);
    alert("¡Cuenta Creada!");
    showLoginScreen();
}

function handleLogin() {
    const u = document.getElementById('login-user').value.trim().toLowerCase();
    const p = document.getElementById('login-pass').value;
    let db = getDB();
    if(db[u] && db[u].password === p) {
        currentUserKey = u;
        document.getElementById('user-display').innerText = db[currentUserKey].displayName;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        
        document.getElementById('check-internet').checked = db[currentUserKey].internet;
        document.getElementById('check-exterior').checked = db[currentUserKey].exterior;
        
        // --- SOLUCIÓN PROBLEMA 3: Filtrar Abono solo para cuentas Demo ---
        const btnAbono = document.getElementById('btn-deposito-abono');
        if (currentUserKey === "matias" || currentUserKey === "amigo") {
            btnAbono.style.display = "flex"; // Permitido
        } else {
            btnAbono.style.display = "none"; // Ocultado para cuentas creadas externas
        }

        render();
    } else {
        alert("Usuario o clave incorrectos.");
    }
}

function handleLogout() {
    currentUserKey = "";
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
}

// ================= NAVEGACIÓN Y MENÚS =================
function switchMainTab(tabName) {
    const tabs = document.querySelectorAll('.main-tab-content');
    tabs.forEach(t => t.style.display = 'none');
    
    const tabButtons = document.querySelectorAll('.tabs-container button');
    tabButtons.forEach(b => b.classList.remove('active'));

    document.getElementById('content-' + tabName).style.display = 'block';
    document.getElementById('tab-' + tabName).classList.add('active');
}

function toggleSecurity(option) {
    let db = getDB();
    db[currentUserKey][option] = document.getElementById('check-' + option).checked;
    saveDB(db);
}

function checkOpSecurity(option) {
    let db = getDB();
    if (!db[currentUserKey][option]) {
        alert(`GatisSecure: Operación denegada. Activa "${option === 'internet' ? 'Compras por Internet' : 'Viajes'}" en GatisSecure.`);
        return false;
    }
    return true;
}

// ================= CONTROL VERIFICACIÓN TOKEN VIRTUAL =================
function requestGatisToken(targetFunctionName) {
    currentAuthorizedFunction = targetFunctionName;
    openSheet('modal-token-request');
}

function validateGatisToken() {
    const tokenInput = document.getElementById('token-input').value.trim();
    const correctToken = calculateCurrentToken(); // Llama al generador dinámico matemático del minuto actual

    if (tokenInput === correctToken) {
        if (typeof window[currentAuthorizedFunction] === 'function') {
            window[currentAuthorizedFunction]();
        }
        closeSheet('modal-token-request');
    } else {
        alert("GatisToken Inválido o Expirado. Abre tu app GatisToken externa para verificar el código.");
    }
    document.getElementById('token-input').value = "";
}

// ================= FUNCIONES BANCARIAS ORIGINALES =================
function doDeposit() {
    // Solo las cuentas demo entran aquí porque a las otras se les oculta el botón en el login
    const amt = parseFloat(document.getElementById('input-dep-amount').value);
    if (!amt || amt <= 0) return;
    let db = getDB();
    db[currentUserKey].balance += amt;
    db[currentUserKey].txs.push({ type: 'in', desc: 'Abono Manual Demo', date: 'Hoy', amount: amt, icon: '📥' });
    saveDB(db);
    render();
    closeSheet('modal-dep');
}

// SOLUCIÓN PROBLEMA 1: El botón de servicios ahora llama y ejecuta perfectamente esta sección
function executeServicePayment() {
    const type = document.getElementById('servicio-tipo').value;
    const mnt = parseFloat(document.getElementById('servicio-monto').value);
    if (isNaN(mnt) || mnt <= 0) return alert("Monto incorrecto.");
    
    let db = getDB();
    if(mnt > db[currentUserKey].balance) return alert("Fondos insuficientes.");
    
    db[currentUserKey].balance -= mnt;
    db[currentUserKey].txs.push({ 
        type: 'out', 
        desc: `Pago Servicio: ${type}`, 
        date: 'Hoy', 
        amount: mnt, 
        icon: '⚡' 
    });
    saveDB(db);
    render();
    closeSheet('modal-servicios');
    alert(`¡Servicio ${type} liquidado de forma offline con éxito!`);
}

function generateCashCode() {
    const monto = parseFloat(document.getElementById('cash-monto').value);
    if (isNaN(monto) || monto <= 0) return alert("Monto inválido.");
    let db = getDB();
    if (monto > db[currentUserKey].balance) return alert("Fondos insuficientes.");

    db[currentUserKey].balance -= monto;
    const cashCode = Math.floor(Math.random() * 9000 + 1000); 
    db[currentUserKey].txs.push({ type: 'out', desc: `GatisCash (${cashCode})`, date: 'Hoy', amount: monto, icon: '🚪' });
    saveDB(db);
    render();
    
    document.getElementById('cash-code-block').style.display = "block";
    document.getElementById('cash-code-txt').innerText = cashCode;
}

// ================= OPERACIONES QR CÁMARA =================
function generateOfflineQR() {
    const monto = parseFloat(document.getElementById('qr-monto-cobro').value);
    if (isNaN(monto) || monto <= 0) return alert("Monto no válido.");
    if (!checkOpSecurity('internet')) return closeSheet('modal-cobro-qr');

    let db = getDB();
    const txId = "TX-" + Math.floor(Math.random() * 1000000);
    const cobroData = { tipo: "SOLICITUD_COBRO_FULL", id: txId, cobrador: currentUserKey, nombreCobrador: db[currentUserKey].displayName, monto: monto };

    document.getElementById('qrcode-container').innerHTML = "";
    new QRCode(document.getElementById('qrcode-container'), { text: JSON.stringify(cobroData), width: 180, height: 180 });
    document.getElementById('btn-quick-scan').style.display = 'block';
}

function switchFromCobroToScan() {
    closeSheet('modal-cobro-qr');
    setTimeout(() => { openSheet('modal-pago-qr'); }, 350);
}

function startPagoCamera() {
    document.getElementById('pago-exitoso-block').style.display = "none";
    if (pagoScanner) pagoScanner.stop().catch(()=>{});
    pagoScanner = new Html5Qrcode("camera-reader-pago");
    pagoScanner.start({ facingMode: "environment" }, { fps: 15, qrbox: { width: 230, height: 230 } }, (qrText) => { pagoScanner.stop().then(() => { processPagoData(qrText); }); }, (err) => {}).catch(err => alert("Cámara Bloqueada: " + err));
}

function processPagoData(qrText) {
    let data = null;
    try { data = JSON.parse(qrText.trim()); } catch(e) { return alert("Código no reconocido."); }

    if(!data || data.tipo !== "SOLICITUD_COBRO_FULL") return alert("QR inválido.");
    let db = getDB();
    if(db[currentUserKey].balance < data.monto) return alert("Dinero insuficiente.");

    if(confirm(`¿Pagar Bs ${data.monto} a ${data.nombreCobrador}?`)) {
        db[currentUserKey].balance -= data.monto;
        db[currentUserKey].txs.push({ type: 'out', desc: `Pago QR a ${data.nombreCobrador}`, date: 'Hoy', amount: data.monto, icon: '💰' });
        saveDB(db);
        render();

        const reciboData = { tipo: "RECIBO_CONFIRMADO_FULL", id: data.id, cobrador: data.cobrador, pagadorNombre: db[currentUserKey].displayName, monto: data.monto };
        document.getElementById('receipt-qrcode-container').innerHTML = "";
        new QRCode(document.getElementById('receipt-qrcode-container'), { text: JSON.stringify(reciboData), width: 160, height: 160 });
        document.getElementById('pago-exitoso-block').style.display = "block";
    }
}

function startReciboCamera() {
    if (reciboScanner) reciboScanner.stop().catch(()=>{});
    reciboScanner = new Html5Qrcode("camera-reader-recibo");
    reciboScanner.start({ facingMode: "environment" }, { fps: 15, qrbox: { width: 230, height: 230 } }, (qrText) => { reciboScanner.stop().then(() => { processReciboData(qrText); }); }, (err) => {}).catch(err => alert("Error: " + err));
}

function processReciboData(qrText) {
    let recibo = null;
    try { recibo = JSON.parse(qrText.trim()); } catch(e) { return alert("Inválido."); }

    if(!recibo || recibo.tipo !== "RECIBO_CONFIRMADO_FULL" || recibo.cobrador !== currentUserKey || usedTokens.includes(recibo.id)) return alert("Error al procesar recibo.");

    let db = getDB();
    db[currentUserKey].balance += recibo.monto;
    db[currentUserKey].txs.push({ type: 'in', desc: `Cobro QR: ${recibo.pagadorNombre}`, date: 'Hoy', amount: recibo.monto, icon: '💰' });
    usedTokens.push(recibo.id);
    localStorage.setItem('gatis_used_tokens_full', JSON.stringify(usedTokens));
    saveDB(db);
    render();
    closeSheet('modal-cargar-recibo');
    alert("¡Fondos Offline Recibidos!");
}

function render() {
    if(!currentUserKey) return;
    let db = getDB();
    document.getElementById('balance-txt').innerText = `Bs ${db[currentUserKey].balance.toFixed(2)}`;
    const box = document.getElementById('history-box');
    box.innerHTML = '';
    [...db[currentUserKey].txs].reverse().forEach(t => {
        box.innerHTML += `
            <div class="transaction-row">
                <div class="tx-main">
                    <div class="tx-avatar">${t.icon || '💰'}</div>
                    <div><div class="tx-title">${t.desc}</div><div class="tx-date">${t.date}</div></div>
                </div>
                <div class="tx-amount ${t.type === 'in' ? 'amount-positive' : 'amount-negative'}">Bs ${t.amount.toFixed(2)}</div>
            </div>`;
    });
}

function openSheet(id) {
    const el = document.getElementById(id);
    el.style.display = 'flex';
    setTimeout(() => el.classList.add('active'), 10);
    if(id === 'modal-pago-qr') startPagoCamera();
    if(id === 'modal-cargar-recibo') startReciboCamera();
}

function closeSheet(id) {
    const el = document.getElementById(id);
    el.classList.remove('active');
    if(id === 'modal-pago-qr' && pagoScanner) pagoScanner.stop().catch(()=>{});
    if(id === 'modal-cargar-recibo' && reciboScanner) reciboScanner.stop().catch(()=>{});
    setTimeout(() => { el.style.display = 'none'; }, 300);
}