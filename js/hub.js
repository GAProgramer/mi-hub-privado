// =========================================================
// MODO NUBE (FIREBASE FIRESTORE): Completo con Foro Avanzado
// =========================================================

let currentUser = null;
let userRole = 'guest'; 
let userData = null;

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

async function fetchUserRoleAndRender() {
    if (!currentUser) return;
    
    // Si es el Admin Supremo hardcodeado
    if(currentUser.username === 'GAAdmin') {
        userRole = 'admin';
        userData = currentUser;
        routeUser();
        return;
    }

    try {
        const docRef = await db.collection("users").doc(currentUser.uid).get();
        if(docRef.exists) {
            const u = docRef.data();
            userRole = u.status === 'approved' ? u.role : 'pending';
            userData = u;
        } else {
            userRole = 'guest';
            userData = null;
            localStorage.removeItem('session');
        }
    } catch (error) {
        console.error("Error al sincronizar rol desde la nube:", error);
        userRole = 'guest';
        userData = null;
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
        const user = document.getElementById('username').value.trim();
        const pass = document.getElementById('password').value.trim();
        const msg = document.getElementById('auth-msg');

        // 1. Acceso del Admin Supremo
        if(user === 'GAAdmin' && pass === '9GAO282517219') {
            currentUser = { uid: 'admin_id_000', username: 'GAAdmin', role: 'admin' };
            localStorage.setItem('session', JSON.stringify(currentUser));
            fetchUserRoleAndRender();
            return;
        }

        try {
            const snapshot = await db.collection("users").where("username", "==", user).get();

            if (!snapshot.empty) {
                const userDoc = snapshot.docs[0];
                const userDataFields = userDoc.data();

                if (String(userDataFields.password).trim() === String(pass).trim()) {
                    currentUser = { uid: userDoc.id, username: userDataFields.username, role: userDataFields.role };
                    localStorage.setItem('session', JSON.stringify(currentUser));
                    fetchUserRoleAndRender();
                } else {
                    msg.textContent = "Contraseña incorrecta.";
                    msg.style.color = "#ef4444";
                }
            } else {
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
                <p style="color: var(--text-muted); margin: 20px 0;">El Administrador debe aprobar tu cuenta para acceder al contenido.</p>
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

    document.getElementById('nav-projects').addEventListener('click', () => {
        setActiveNav('nav-projects');
        loadProjectsView();
    });

    document.getElementById('nav-community').addEventListener('click', () => {
        setActiveNav('nav-community');
        loadCommunityView();
    });

    if(document.getElementById('nav-users')) {
        document.getElementById('nav-users').addEventListener('click', () => {
            setActiveNav('nav-users');
            loadUsersManagementView();
        });
    }

    if(document.getElementById('nav-logs')) {
        document.getElementById('nav-logs').addEventListener('click', () => {
            setActiveNav('nav-logs');
            loadLogsView();
        });
    }

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

    db.collection("projects").orderBy("createdAt", "desc").onSnapshot(snapshot => {
        const grid = document.getElementById('projects-grid');
        if(!grid) return;
        
        grid.innerHTML = '';

        if (snapshot.empty) {
            grid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">No hay proyectos.</div>';
            return;
        }

        snapshot.forEach(doc => {
            const p = doc.data();
            const id = doc.id;

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

function setActiveNav(id) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// ==========================================
// SECCIÓN: COMUNIDAD (CHAT AVANZADO CON MENCIONES Y SUSURROS)
// ==========================================
function loadCommunityView() {
    let adminClearBtn = (userRole === 'admin' || userRole === 'coadmin') 
        ? `<button onclick="clearChat()" class="action-btn btn-salir" style="padding: 6px 12px; margin: 0;"><i class="fas fa-trash-alt"></i> Borrar Chat</button>` : '';

    document.getElementById('dashboard-content').innerHTML = `
        <div class="header-section" style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h2>Foro de Comunidad</h2>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 5px;">
                    📜 <strong>Reglas del Chat:</strong> Respeta a tus compañeros. Usa <code style="color: var(--blue-accent);">@usuario</code> para mencionar, <code style="color: var(--blue-accent);">@/usuario "mensaje"</code> para susurrar privadamente, y <code style="color: var(--blue-accent);">#NombreProyecto</code> para enlazar proyectos. Queda prohibido el spam y lenguaje ofensivo.
                </p>
            </div>
            ${adminClearBtn}
        </div>
        <div class="table-container" style="display: flex; flex-direction: column; height: 55vh; position: relative;">
            <div id="chatBox" style="flex-grow: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;"></div>
            
            <!-- Caja de Autocompletado (Menciones y Proyectos) -->
            <div id="chatSuggestions" style="display: none; position: absolute; bottom: 70px; left: 15px; background: var(--bg-dark); border: 1px solid var(--border-color); border-radius: 5px; width: 250px; max-height: 150px; overflow-y: auto; z-index: 10;"></div>

            <div style="padding: 15px; border-top: 1px solid var(--border-color); display: flex; gap: 10px; position: relative;">
                <input type="text" id="chatInput" placeholder="Escribe un mensaje... (@ para mencionar, # para proyecto)" style="flex-grow: 1; padding: 10px; border-radius: 5px; border: 1px solid var(--border-color); background: var(--bg-dark); color: white;">
                <button onclick="sendMessage()" class="btn-primary">Enviar</button>
            </div>
        </div>
    `;

    // Escuchar mensajes en tiempo real
    db.collection("chat").orderBy("timestamp", "asc").onSnapshot(snapshot => {
        const box = document.getElementById('chatBox');
        if(!box) return;
        box.innerHTML = '';
        
        snapshot.forEach(doc => {
            const msg = doc.data();
            const id = doc.id;
            const isMe = msg.user === userData.username;
            
            // Si es un susurro (@/), verificar si va dirigido a mí o lo envié yo
            if(msg.isWhisper && msg.targetUser !== userData.username && msg.user !== userData.username && userRole !== 'admin') {
                return; // Ocultar si no es para mí
            }

            let whisperBadge = msg.isWhisper ? `<span style="background: #9333ea; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; margin-left: 5px;">SUSURRO a @${msg.targetUser}</span>` : '';
            let deleteMsgBtn = (userRole === 'admin' || isMe) ? `<button onclick="deleteChatMessage('${id}')" style="background:none; border:none; color: #ef4444; cursor:pointer; font-size: 0.75rem; margin-left: 10px;"><i class="fas fa-times"></i></button>` : '';

            box.innerHTML += `
                <div style="background: ${msg.isWhisper ? 'rgba(147, 51, 234, 0.15)' : 'var(--bg-dark)'}; padding: 10px 15px; border-radius: 8px; max-width: 80%; align-self: ${isMe ? 'flex-end' : 'flex-start'}; border: 1px solid ${msg.isWhisper ? '#9333ea' : 'var(--border-color)'};">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <div>
                            <span style="font-size: 0.8rem; color: var(--blue-accent); font-weight: bold;">${msg.user}</span>
                            ${whisperBadge}
                        </div>
                        <div>
                            <span style="font-size: 0.7rem; color: var(--text-muted);">${msg.timeStr}</span>
                            ${deleteMsgBtn}
                        </div>
                    </div>
                    <p style="font-size: 0.95rem; word-break: break-word;">${formatChatMessage(msg.text)}</p>
                </div>
            `;
        });
        box.scrollTop = box.scrollHeight;
    });

    setupChatAutocomplete();

    document.getElementById('chatInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
    });
}

// Dar formato enriquecido a menciones (@) y proyectos (#)
function formatChatMessage(text) {
    return text
        .replace(/@([a-zA-Z0-9_]+)/g, '<span style="color: #38bdf8; font-weight: bold; background: rgba(56, 189, 248, 0.1); padding: 2px 4px; border-radius: 4px;">@$1</span>')
        .replace(/#([a-zA-Z0-9_\-]+)/g, '<span style="color: #4ade80; font-weight: bold; background: rgba(74, 222, 128, 0.1); padding: 2px 4px; border-radius: 4px;"><i class="fas fa-folder"></i> #$1</span>');
}

// Autocompletado inteligente para @ (usuarios) y # (proyectos)
async function setupChatAutocomplete() {
    const input = document.getElementById('chatInput');
    const box = document.getElementById('chatSuggestions');
    if(!input || !box) return;

    input.addEventListener('input', async function() {
        const val = this.value;
        const cursorPos = this.selectionStart;
        const textBeforeCursor = val.substring(0, cursorPos);
        
        // Detectar si está escribiendo @ o #
        const matchAt = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);
        const matchHash = textBeforeCursor.match(/#([a-zA-Z0-9_\-]*)$/);

        if (matchAt) {
            const query = matchAt[1].toLowerCase();
            const usersSnap = await db.collection("users").get();
            let html = '';
            usersSnap.forEach(doc => {
                const u = doc.data();
                if(u.username.toLowerCase().includes(query)) {
                    html += `<div onclick="insertAutocomplete('@${u.username}')" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--border-color); font-size: 0.85rem;">@${u.username}</div>`;
                }
            });
            box.innerHTML = html;
            box.style.display = html ? 'block' : 'none';
        } else if (matchHash) {
            const query = matchHash[1].toLowerCase();
            const projSnap = await db.collection("projects").get();
            let html = '';
            projSnap.forEach(doc => {
                const p = doc.data();
                if(p.title.toLowerCase().includes(query)) {
                    html += `<div onclick="insertAutocomplete('#${p.title.replace(/\s+/g, '_')}')" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--border-color); font-size: 0.85rem;"><i class="fas fa-folder"></i> #${p.title}</div>`;
                }
            });
            box.innerHTML = html;
            box.style.display = html ? 'block' : 'none';
        } else {
            box.style.display = 'none';
        }
    });
}

window.insertAutocomplete = (text) => {
    const input = document.getElementById('chatInput');
    const box = document.getElementById('chatSuggestions');
    const val = input.value;
    const cursorPos = input.selectionStart;
    
    // Reemplazar la palabra actual por la sugerencia seleccionada
    const lastAtIndex = val.lastIndexOf('@', cursorPos);
    const lastHashIndex = val.lastIndexOf('#', cursorPos);
    const index = Math.max(lastAtIndex, lastHashIndex);

    if (index !== -1) {
        input.value = val.substring(0, index) + text + ' ' + val.substring(cursorPos);
    }
    box.style.display = 'none';
    input.focus();
}

window.sendMessage = async () => {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if(!text) return;
    
    let isWhisper = false;
    let targetUser = null;

    // Sintaxis de susurro: @/usuario "mensaje" o @/usuario mensaje
    if(text.startsWith('@/')) {
        const parts = text.split(' ');
        if(parts.length > 1) {
            targetUser = parts[0].substring(2);
            isWhisper = true;
        }
    }

    await db.collection("chat").add({
        user: userData.username,
        text: text,
        isWhisper: isWhisper,
        targetUser: targetUser,
        timestamp: new Date().getTime(),
        timeStr: new Date().toLocaleTimeString()
    });
    input.value = '';
    document.getElementById('chatSuggestions').style.display = 'none';
}

window.deleteChatMessage = async (id) => {
    try {
        await db.collection("chat").doc(id).delete();
    } catch (error) {
        console.error("Error al borrar mensaje:", error);
    }
}

window.clearChat = async () => {
    if(confirm("⚠️ ¿Estás seguro de vaciar todo el chat de la comunidad?")) {
        try {
            const snapshot = await db.collection("chat").get();
            const batch = db.batch();
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            logActivity(`🧹 '${userData.username}' vació el chat general.`);
        } catch (error) {
            console.error("Error al limpiar chat:", error);
            alert("No se pudo vaciar el chat.");
        }
    }
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
        if(!box) return;
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
        <div class="header-section" style="display: flex; justify-content: space-between; align-items: center;">
            <h2>Gestión de Usuarios</h2>
            ${userRole === 'admin' ? `<button onclick="registerAdminInDB()" class="btn-primary" style="padding: 8px 15px; font-size: 0.85rem;"><i class="fas fa-user-shield"></i> Registrarme en BD</button>` : ''}
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
        if(!tbody) return;
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
                    <td style="color: white; font-weight: 500;">${u.username} ${u.username === 'GAAdmin' ? '<span style="background: var(--blue-accent); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; margin-left: 5px;">Supremo</span>' : ''}</td>
                    ${showPassword ? `<td style="color: var(--text-muted); font-family: monospace;">${u.password || '******'}</td>` : ''}
                    <td>
                        <span style="color: ${u.status === 'pending' ? '#facc15' : '#4ade80'}; text-transform: uppercase; font-size: 0.8rem; font-weight: bold;">
                            ${u.status} (${u.role})
                        </span>
                    </td>
                    <td style="text-align: right;">
                        ${u.status === 'pending' ? `<button onclick="updateUserRole('${id}', 'approved', 'user', '${u.username}')" class="action-btn" style="color: #4ade80;">Aprobar</button>` : ''}
                        ${(userRole === 'admin' && u.role === 'user' && u.status !== 'pending' && u.username !== 'GAAdmin') ? `<button onclick="updateUserRole('${id}', 'approved', 'coadmin', '${u.username}')" class="action-btn" style="color: #3b82f6;">Hacer CoAdmin</button>` : ''}
                        ${(userRole === 'admin' && u.username !== 'GAAdmin') ? `<button onclick="deleteUser('${id}', '${u.username}')" class="action-btn btn-salir">Eliminar</button>` : ''}
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error cargando usuarios:", error);
    }
}

// Función especial para que el Admin se auto-registre en la base de datos (aparezca en la tabla y en las menciones)
window.registerAdminInDB = async () => {
    try {
        const snapshot = await db.collection("users").where("username", "==", "GAAdmin").get();
        if(!snapshot.empty) {
            alert("El Administrador ya está registrado en la base de datos.");
            return;
        }
        await db.collection("users").add({
            username: "GAAdmin",
            password: "9GAO282517219",
            role: "admin",
            status: "approved",
            termsAccepted: true,
            coAdminTermsAccepted: true
        });
        alert("¡Te has registrado exitosamente en la base de datos como Admin!");
        loadUsersManagementView();
    } catch (error) {
        console.error("Error al registrar admin:", error);
        alert("No se pudo completar el registro.");
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
