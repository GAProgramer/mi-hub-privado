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
    // Menú de Admin (Renderizado condicional)
    let adminMenu = (userRole === 'admin' || userRole === 'coadmin') 
        ? `<button id="nav-users" class="nav-btn nav-moderar"><i class="fas fa-users-cog"></i> Moderar Usuarios</button>` : '';
    
    let logsMenu = (userRole === 'admin') 
        ? `<button class="nav-btn nav-registro"><i class="fas fa-siren-on"></i> Registro de Actividad</button>` : '';

    container.innerHTML = `
        <!-- Navbar Superior (Estilo image_7b358b.png) -->
        <nav class="hub-navbar">
            <div class="nav-left">
                <div class="hub-logo"><i class="fas fa-layer-group"></i> Hub</div>
                <button id="nav-projects" class="nav-btn active"><i class="fas fa-folder"></i> Proyectos</button>
                <button class="nav-btn"><i class="fas fa-comment-dots"></i> Comunidad</button>
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
        
        <!-- Área de Contenido -->
        <main class="hub-content" id="dashboard-content"></main>
    `;

    document.getElementById('nav-projects').addEventListener('click', () => loadProjectsView());
    if(document.getElementById('nav-users')) document.getElementById('nav-users').addEventListener('click', () => loadUsersManagementView());

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
            // ESQUELETO OBLIGATORIO PARA EL TALLER
            html: "<h1>Hola Mundo</h1>\n<p>Este es un nuevo proyecto.</p>",
            css: "body {\n  background-color: #1a202c;\n  color: white;\n  text-align: center;\n}",
            js: "console.log('Proyecto iniciado');"
        });

        document.getElementById('project-modal').classList.add('hidden');
        e.target.reset();
    } catch (error) {
        console.error("Error creando el proyecto:", error);
        alert("Hubo un error al guardar el proyecto en la base de datos.");
    }
    });
    
    loadProjectsView();
}

function loadProjectsView() {
    document.getElementById('dashboard-content').innerHTML = `
        <div class="header-section">
            <h2>Repositorio</h2>
            <button onclick="document.getElementById('project-modal').classList.remove('hidden')" class="btn-primary"><i class="fas fa-plus"></i> Nuevo Proyecto</button>
        </div>
        <div id="projects-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;"></div>
    `;

    // Escuchar los proyectos de Firebase en tiempo real
    db.collection("projects").orderBy("createdAt", "desc").onSnapshot(snapshot => {
        const grid = document.getElementById('projects-grid');
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
                        <!-- AQUÍ ESTÁ LA MAGIA DE LA CONEXIÓN -->
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