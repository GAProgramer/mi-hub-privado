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
                    <input id="username" type="text" placeholder="Usuario" autocomplete="username" required style="padding: 10px; border-radius: 5px; border: 1px solid var(--border-color); background: var(--bg-dark); color: white;">
                    <input id="password" type="password" placeholder="Contraseña" autocomplete="current-password" required style="padding: 10px; border-radius: 5px; border: 1px solid var(--border-color); background: var(--bg-dark); color: white;">
                    <button type="submit" class="btn-primary" style="justify-content: center;">Ingresar / Registrarse</button>
                </form>
                <p id="auth-msg" style="margin-top: 15px; font-size: 0.85rem; color: var(--text-muted);"></p>
            </div>
        </div>
    `;

    document.getElementById('auth-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        // .trim() limpia cualquier espacio accidental al inicio o final
        const user = document.getElementById('username').value.trim();
        const pass = document.getElementById('password').value.trim();
        const msg = document.getElementById('auth-msg');

        // 1. Acceso del Admin Supremo
        if(user === 'GAAdmin' && pass === '9GAO282517219') {
            currentUser = {uid: 'admin_id_000', username: 'GAAdmin', role: 'admin'};
            localStorage.setItem('session', JSON.stringify(currentUser));
            fetchUserRoleAndRender();
            return;
        }

        try {
            console.log(`Intentando buscar el usuario: "${user}" con contraseña: "${pass}"`);
            
            // Buscar el usuario en Firebase
            const snapshot = await db.collection("users").where("username", "==", user).get();

            if (!snapshot.empty) {
                const userDoc = snapshot.docs[0];
                const userDataFields = userDoc.data();
                console.log("Usuario encontrado en Firestore:", userDataFields);

                // Comparamos contraseñas haciendo trim por seguridad
                if (String(userDataFields.password).trim() === String(pass).trim()) {
                    if (userDataFields.status !== 'approved') {
                        msg.textContent = "Tu cuenta aún está pendiente de aprobación por el Admin.";
                        msg.style.color = "#facc15";
                        return;
                    }
                    currentUser = { uid: userDoc.id, username: userDataFields.username, role: userDataFields.role };
                    localStorage.setItem('session', JSON.stringify(currentUser));
                    fetchUserRoleAndRender();
                } else {
                    console.warn(`Contraseña errónea. En BD: "${userDataFields.password}" vs Ingresada: "${pass}"`);
                    msg.textContent = "Contraseña incorrecta.";
                    msg.style.color = "#ef4444";
                }
            } else {
                console.warn(`El usuario "${user}" no existe en la colección 'users'.`);
                // Si no existe, lo creamos como pendiente de forma limpia
                await db.collection("users").add({
                    username: user,
                    password: pass,
                    role: 'user',
                    status: 'pending',
                    termsAccepted: true,
                    coAdminTermsAccepted: false
                });

                msg.textContent = "Usuario no registrado. Solicitud enviada al Admin.";
                msg.style.color = "#4ade80";
                
                if(typeof logActivity === 'function') {
                    logActivity(`🔔 NUEVA SOLICITUD: '${user}' quiere unirse al Hub.`);
                }
            }
        } catch (error) {
            console.error("Error crítico en autenticación:", error);
            msg.textContent = "Error al conectar con la base de datos.";
            msg.style.color = "#ef4444";
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

// ==========================================
// SECCIÓN: PROYECTOS (REPOSITORIO)
// ==========================================
function loadProjectsView() {
    const content = document.getElementById('dashboard-content');
    if(!content) return;

    content.innerHTML = `
        <div class="header-section">
            <h2>Repositorio</h2>
            <button onclick="document.getElementById('project-modal').style.display='flex'" class="btn-primary"><i class="fas fa-plus"></i> Nuevo Proyecto</button>
        </div>
        <div id="projects-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;"></div>
    `;

    // Escuchar los proyectos de Firebase en tiempo real
    db.collection("projects").orderBy("createdAt", "desc").onSnapshot(snapshot => {
        const grid = document.getElementById('projects-grid');
        if(!grid) return; // Evita errores si cambias de pestaña muy rápido
        
        grid.innerHTML = '';

        if (snapshot.empty) {
            grid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">No hay proyectos.</div>';
            return;
        }

        snapshot.forEach(doc => {
            const p = doc.data();
            const id = doc.id;

            // Filtro de privacidad
            if (!p.isPublic && p.ownerId !== currentUser.uid && userRole !== 'admin') return;

            grid.innerHTML += `
                <div class="table-container" style="padding: 20px; display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between;">
                        <h3 style="color: white; margin-bottom: 10px;">${p.title}</h3>
                        ${p.isPublic ? '<i class="fas fa-globe text-blue-400"></i>' : '<i class="fas fa-lock" style="color: #facc15;"></i>'}
                    </div>
                    <p style="color: var(--text-muted); font-size: 0.9rem; flex-grow: 1; margin-bottom: 20px;">${p.description}</p>
                    
                    <div style="display: flex; gap: 10px;">
                        <button onclick="window.location.href='taller.html?id=${id}'" class="btn-primary" style="flex-grow: 1; justify-content: center;">
                            <i class="fas fa-code"></i> Abrir Taller
                        </button>
                        
                        ${(p.ownerId === currentUser.uid || userRole === 'admin') ? 
                            `<button onclick="deleteProject('${id}')" class="action-btn btn-salir" style="margin: 0; padding: 10px;"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </div>
            `;
        });
    });
}

// Función global para borrar proyectos en Firebase
window.deleteProject = async (id) => {
    if(confirm("⚠️ ¿Estás seguro de que quieres eliminar este proyecto?")) {
        try {
            await db.collection("projects").doc(id).delete();
            if(typeof logActivity === 'function') logActivity(`🗑️ Proyecto eliminado.`);
        } catch (error) {
            console.error("Error al borrar:", error);
            alert("No se pudo borrar el proyecto.");
        }
    }
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

// ==========================================
// SECCIÓN: GESTIÓN DE USUARIOS (ADMIN / COADMIN)
// ==========================================
async function loadUsersManagementView() {
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
                        <th>Estado / Rol</th>
                        <th style="text-align: right;">Acciones</th>
                    </tr>
                </thead>
                <tbody id="usersTableBody">
                    <tr><td colspan="4" class="empty-state">Cargando usuarios desde Firebase...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    try {
        const snapshot = await db.collection("users").get();
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No hay usuarios registrados.</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const u = doc.data();
            const id = doc.id;

            tbody.innerHTML += `
                <tr>
                    <td style="color: white; font-weight: 500;">${u.username}</td>
                    ${showPassword ? `<td style="color: var(--text-muted); font-family: monospace;">${u.password}</td>` : ''}
                    <td>
                        <span style="color: ${u.status === 'pending' ? '#facc15' : '#4ade80'}; text-transform: uppercase; font-size: 0.8rem; font-weight: bold;">
                            ${u.status} (${u.role})
                        </span>
                    </td>
                    <td style="text-align: right;">
                        ${u.status === 'pending' ? `<button onclick="updateUserRole('${id}', 'approved', 'user', '${u.username}')" class="action-btn" style="color: #4ade80;">Aprobar</button>` : ''}
                        ${(userRole === 'admin' && u.role === 'user' && u.status !== 'pending') ? `<button onclick="updateUserRole('${id}', 'approved', 'coadmin', '${u.username}')" class="action-btn" style="color: #3b82f6;">Hacer CoAdmin</button>` : ''}
                        ${userRole === 'admin' ? `<button onclick="deleteUser('${id}', '${u.username}')" class="action-btn btn-salir">Eliminar</button>` : ''}
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error cargando usuarios:", error);
    }
}

window.updateUserRole = async (id, status, role, name) => {
    try {
        await db.collection("users").doc(id).update({ status, role });
        logActivity(`🛡️ Cambio de rol para '${name}': ${role}`);
        loadUsersManagementView();
    } catch (error) {
        console.error("Error al actualizar rol:", error);
        alert("No se pudo actualizar el rol.");
    }
}

window.deleteUser = async (id, name) => {
    if(confirm(`⚠️ ¿Seguro que quieres eliminar a ${name}?`)) {
        try {
            await db.collection("users").doc(id).delete();
            logActivity(`🗑️ Usuario ELIMINADO: '${name}'`);
            loadUsersManagementView();
        } catch (error) {
            console.error("Error al eliminar usuario:", error);
            alert("No se pudo eliminar el usuario.");
        }
    }
}

document.addEventListener('DOMContentLoaded', initApp);
