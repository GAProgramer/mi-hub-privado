// =========================================================
// MODO LOCAL: Lógica separada
// =========================================================

let currentUser = null;
let userRole = 'guest'; 
let userData = null;

function getLocal(key) { return JSON.parse(localStorage.getItem(key) || '[]'); }
function setLocal(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

function initApp() {
    const session = localStorage.getItem('session');
    if(session) {
        currentUser = JSON.parse(session);
        fetchUserRoleAndRender();
    } else {
        routeUser();
    }
}

function logout() {
    localStorage.removeItem('session');
    currentUser = null;
    userRole = 'guest';
    userData = null;
    routeUser();
}

function fetchUserRoleAndRender() {
    if (!currentUser) return;
    if(currentUser.username === 'GAAdmin') {
        userRole = 'admin';
        userData = currentUser;
    } else {
        const users = getLocal('users');
        const u = users.find(x => x.uid === currentUser.uid);
        if(u) {
            userRole = u.role;
            userData = u;
        } else {
            userRole = 'guest';
            userData = null;
        }
    }
    routeUser();
}

function routeUser() {
    const appContainer = document.getElementById('app-container');
    if(!appContainer) return;
    appContainer.innerHTML = '';
    
    switch (userRole) {
        case 'guest': renderAuthView(appContainer); break;
        case 'pending': renderPendingView(appContainer); break;
        case 'user': case 'coadmin': case 'admin': renderDashboardView(appContainer); break;
        default: renderAuthView(appContainer);
    }
}

function renderAuthView(container) {
    container.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; height:100vh;">
            <div class="table-container" style="padding: 40px; width: 100%; max-width: 400px; text-align: center;">
                <h2 style="margin-bottom: 20px; color: var(--blue-accent);">Acceso al Hub</h2>
                <form id="auth-form" style="display: flex; flex-direction: column; gap: 15px;">
                    <input id="username" type="text" placeholder="Usuario" required style="padding: 10px; border-radius: 5px; border: 1px solid var(--border-color); background: var(--bg-dark); color: white;">
                    <input id="password" type="password" placeholder="Contraseña" required style="padding: 10px; border-radius: 5px; border: 1px solid var(--border-color); background: var(--bg-dark); color: white;">
                    <button type="submit" class="btn-primary" style="justify-content: center;">Ingresar / Registrarse</button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('auth-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value.trim();
        const pass = document.getElementById('password').value.trim();

        if(user === 'GAAdmin' && pass === '9GAO282517219') {
            currentUser = {uid: 'admin_id_000', username: 'GAAdmin', role: 'admin'};
            localStorage.setItem('session', JSON.stringify(currentUser));
            fetchUserRoleAndRender();
            return;
        }

        let users = getLocal('users');
        let existing = users.find(u => u.username === user);

        if(existing) {
            if(existing.password === pass) {
                currentUser = {uid: existing.uid, username: existing.username, role: existing.role};
                localStorage.setItem('session', JSON.stringify(currentUser));
                fetchUserRoleAndRender();
            } else {
                alert("Contraseña incorrecta.");
            }
        } else {
            const newUser = { uid: 'u_' + Date.now(), username: user, password: pass, role: 'pending' };
            users.push(newUser);
            setLocal('users', users);
            currentUser = {uid: newUser.uid, username: newUser.username, role: 'pending'};
            localStorage.setItem('session', JSON.stringify(currentUser));
            fetchUserRoleAndRender();
        }
    });
}

function renderPendingView(container) {
    container.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; height:100vh;">
            <div class="table-container" style="padding: 40px; text-align: center;">
                <h2>Solicitud Pendiente</h2>
                <p style="color: var(--text-muted); margin: 20px 0;">El Administrador debe aprobar tu cuenta.</p>
                <button onclick="logout()" class="nav-btn btn-salir" style="margin: 0 auto;">Salir</button>
            </div>
        </div>
    `;
}

function renderDashboardView(container) {
    let adminMenu = (userRole === 'admin' || userRole === 'coadmin') 
        ? `<button id="nav-users" class="nav-btn nav-moderar"><i class="fas fa-users-cog"></i> Moderar Usuarios</button>` : '';
    
    let logsMenu = (userRole === 'admin') 
        ? `<button id="nav-logs" class="nav-btn nav-registro"><i class="fas fa-siren-on"></i> Registro de Actividad</button>` : '';

    container.innerHTML = `
        <nav class="hub-navbar">
            <div class="nav-left">
                <div class="hub-logo"><i class="fas fa-layer-group"></i> Hub</div>
                <button id="nav-projects" class="nav-btn active"><i class="fas fa-folder"></i> Proyectos</button>
                <button id="nav-community" class="nav-btn"><i class="fas fa-comment-dots"></i> Comunidad</button>
                ${adminMenu}
                ${logsMenu}
            </div>
            <div class="nav-right">
                <span style="font-size: 0.9rem; color: var(--text-muted);">
                    Hola, <strong style="color: var(--blue-accent);">${userData.username}</strong> (${userRole})
                </span>
                <button onclick="logout()" class="nav-btn btn-salir"><i class="fas fa-sign-out-alt"></i> Salir</button>
            </div>
        </nav>
        
        <main class="hub-content" id="dashboard-content"></main>

        <!-- EL MODAL DE NUEVO PROYECTO OCULTO -->
        <div id="project-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: none; align-items: center; justify-content: center; z-index: 50;">
            <div class="table-container" style="padding: 30px; width: 100%; max-width: 500px;">
                <h3 style="margin-bottom: 20px; font-size: 1.2rem;">Crear Nuevo Proyecto</h3>
                <form id="new-project-form" style="display: flex; flex-direction: column; gap: 15px;">
                    <input type="text" id="proj-title" required placeholder="Título del Proyecto" style="padding: 10px; border-radius: 5px; border: 1px solid var(--border-color); background: var(--bg-dark); color: white;">
                    <textarea id="proj-desc" required placeholder="Descripción" rows="3" style="padding: 10px; border-radius: 5px; border: 1px solid var(--border-color); background: var(--bg-dark); color: white;"></textarea>
                    <label style="display: flex; align-items: center; gap: 10px; color: var(--text-muted); font-size: 0.9rem;">
                        <input type="checkbox" id="proj-public" checked> Proyecto Público
                    </label>
                    <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
                        <button type="button" onclick="document.getElementById('project-modal').style.display='none'" class="nav-btn">Cancelar</button>
                        <button type="submit" class="btn-primary">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // 1. Conectar Menú Proyectos
    document.getElementById('nav-projects').addEventListener('click', () => {
        setActiveNav('nav-projects');
        loadProjectsView();
    });

    // 2. Conectar Menú Comunidad
    document.getElementById('nav-community').addEventListener('click', () => {
        setActiveNav('nav-community');
        loadCommunityView();
    });

    // 3. Conectar Menú Admin (Si existe)
    if(document.getElementById('nav-users')) {
        document.getElementById('nav-users').addEventListener('click', () => {
            setActiveNav('nav-users');
            loadUsersManagementView();
        });
    }

    // 4. Conectar Menú Logs (Si existe)
    if(document.getElementById('nav-logs')) {
        document.getElementById('nav-logs').addEventListener('click', () => {
            setActiveNav('nav-logs');
            loadLogsView();
        });
    }

    // Lógica para guardar el proyecto en Firebase
    document.getElementById('new-project-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await db.collection("projects").add({
                title: document.getElementById('proj-title').value,
                description: document.getElementById('proj-desc').value,
                isPublic: document.getElementById('proj-public').checked,
                ownerId: currentUser.uid,
                ownerName: userData.username,
                createdAt: new Date().getTime(),
                html: "<h1>Hola Mundo</h1>\n<p>Este es un nuevo proyecto.</p>",
                css: "body {\n  background-color: #1a202c;\n  color: white;\n  text-align: center;\n}",
                js: "console.log('Proyecto iniciado');"
            });
            
            logActivity(`📦 '${userData.username}' creó un nuevo proyecto.`);
            document.getElementById('project-modal').style.display = 'none';
            e.target.reset();
        } catch (error) {
            console.error("Error creando proyecto:", error);
        }
    });

    loadProjectsView();
}

// Función de ayuda para iluminar el botón activo en el menú
function setActiveNav(id) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// ==========================================
// SECCIÓN: COMUNIDAD (CHAT EN TIEMPO REAL)
// ==========================================
function loadCommunityView() {
    document.getElementById('dashboard-content').innerHTML = `
        <div class="header-section">
            <h2>Foro de Comunidad</h2>
        </div>
        <div class="table-container" style="display: flex; flex-direction: column; height: 60vh;">
            <div id="chatBox" style="flex-grow: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;"></div>
            <div style="padding: 15px; border-top: 1px solid var(--border-color); display: flex; gap: 10px;">
                <input type="text" id="chatInput" placeholder="Escribe un mensaje aquí..." style="flex-grow: 1; padding: 10px; border-radius: 5px; border: 1px solid var(--border-color); background: var(--bg-dark); color: white;">
                <button onclick="sendMessage()" class="btn-primary">Enviar</button>
            </div>
        </div>
    `;

    // Escuchar mensajes en tiempo real
    db.collection("chat").orderBy("timestamp", "asc").onSnapshot(snapshot => {
        const box = document.getElementById('chatBox');
        box.innerHTML = '';
        snapshot.forEach(doc => {
            const msg = doc.data();
            const isMe = msg.user === userData.username;
            box.innerHTML += `
                <div style="background: var(--bg-dark); padding: 10px 15px; border-radius: 8px; max-width: 80%; align-self: ${isMe ? 'flex-end' : 'flex-start'}; border: 1px solid var(--border-color);">
                    <span style="font-size: 0.8rem; color: var(--blue-accent); font-weight: bold;">${msg.user}</span>
                    <p style="margin-top: 5px; font-size: 0.95rem;">${msg.text}</p>
                    <span style="font-size: 0.7rem; color: var(--text-muted); float: right; margin-top: 5px;">${msg.timeStr}</span>
                </div>
            `;
        });
        box.scrollTop = box.scrollHeight;
    });

    // Enviar con la tecla Enter
    document.getElementById('chatInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
    });
}

window.sendMessage = async () => {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if(!text) return;
    
    await db.collection("chat").add({
        user: userData.username,
        text: text,
        timestamp: new Date().getTime(),
        timeStr: new Date().toLocaleTimeString()
    });
    input.value = '';
}

// ==========================================
// SECCIÓN: REGISTRO DE ACTIVIDAD (LOGS)
// ==========================================
function logActivity(action) {
    db.collection("logs").add({
        action: action,
        timestamp: new Date().getTime(),
        dateStr: new Date().toLocaleString()
    });
}

function loadLogsView() {
    document.getElementById('dashboard-content').innerHTML = `
        <div class="header-section">
            <h2 style="color: var(--color-registro);">Registro de Actividad (Auditoría)</h2>
        </div>
        <div class="table-container" style="padding: 20px; height: 60vh; overflow-y: auto;">
            <ul id="logsBox" style="list-style: none; display: flex; flex-direction: column; gap: 10px;"></ul>
        </div>
    `;

    db.collection("logs").orderBy("timestamp", "desc").limit(50).onSnapshot(snapshot => {
        const box = document.getElementById('logsBox');
        box.innerHTML = '';
        snapshot.forEach(doc => {
            const log = doc.data();
            box.innerHTML += `
                <li style="padding: 12px; border-bottom: 1px solid var(--border-color); font-family: monospace; font-size: 0.9rem; color: var(--text-muted);">
                    <strong style="color: white;">[${log.dateStr}]</strong> ${log.action}
                </li>
            `;
        });
    });
}

function loadUsersManagementView() {
    const users = getLocal('users');
    
    // LÓGICA DE PRIVACIDAD: Solo el admin ve la columna de contraseñas
    const showPassword = userRole === 'admin';

    document.getElementById('dashboard-content').innerHTML = `
        <div class="header-section">
            <h2>Gestión de Usuarios</h2>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Usuario</th>
                        ${showPassword ? '<th>Contraseña</th>' : ''}
                        <th>Acciones</th>
                        <th>Rol</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(u => `
                        <tr>
                            <td style="color: white; font-weight: 500;">${u.username}</td>
                            ${showPassword ? `<td style="color: var(--text-muted); font-family: monospace;">${u.password}</td>` : ''}
                            <td>
                                ${u.role === 'pending' ? `<button onclick="updateRole('${u.uid}', 'user')" class="action-btn" style="color: #4ade80;">Aprobar</button>` : ''}
                                ${u.role !== 'pending' ? `<button onclick="deleteUser('${u.uid}')" class="action-btn btn-salir">Eliminar</button>` : ''}
                            </td>
                            <td><span style="color: ${u.role === 'pending' ? '#facc15' : '#4ade80'}; text-transform: uppercase; font-size: 0.8rem; font-weight: bold;">${u.role}</span></td>
                        </tr>
                    `).join('')}
                    ${users.length === 0 ? '<tr><td colspan="4" class="empty-state">No hay usuarios.</td></tr>' : ''}
                </tbody>
            </table>
        </div>
    `;
}

window.updateRole = (uid, role) => {
    let users = getLocal('users');
    let u = users.find(x => x.uid === uid);
    if(u) u.role = role;
    setLocal('users', users);
    loadUsersManagementView();
}

window.deleteUser = (uid) => {
    if(confirm("¿Eliminar usuario?")) {
        setLocal('users', getLocal('users').filter(x => x.uid !== uid));
        loadUsersManagementView();
    }
}

document.addEventListener('DOMContentLoaded', initApp);
