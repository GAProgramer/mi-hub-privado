let projectId = null;
let isSidebarOpen = true;

// 1. Extraer el ID de la URL al cargar la página
window.onload = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    projectId = urlParams.get('id');
    
    if (!projectId) {
        alert("No se encontró ningún proyecto. Volviendo al Hub.");
        window.location.href = 'index.html';
        return;
    }

    // 2. Cargar los datos del proyecto desde Firebase
    try {
        const doc = await db.collection("projects").doc(projectId).get();
        if (doc.exists) {
            const p = doc.data();
            document.title = `Taller - ${p.title}`;
            document.getElementById('previewTitle').textContent = `Ejecutando: ${p.title}`;
            
            document.getElementById('editor-html').value = p.html || '';
            document.getElementById('editor-css').value = p.css || '';
            document.getElementById('editor-js').value = p.js || '';
            
            generateOutline(); 
        } else {
            alert("El proyecto no existe.");
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error("Error cargando proyecto:", error);
    }
};

// 3. Sistema de Pestañas
function switchTab(tabName) {
    ['html', 'css', 'js'].forEach(t => document.getElementById(`editor-${t}`).classList.add('hidden'));
    document.getElementById(`editor-${tabName}`).classList.remove('hidden');
    
    ['html', 'css', 'js'].forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        btn.classList.remove('bg-[#37373d]', 'border-blue-500');
        btn.classList.add('hover:bg-[#2a2d2e]', 'border-transparent');
    });
    const activeBtn = document.getElementById(`tab-${tabName}`);
    activeBtn.classList.remove('hover:bg-[#2a2d2e]', 'border-transparent');
    activeBtn.classList.add('bg-[#37373d]', 'border-blue-500');

    const fileNames = { 'html': 'index.html', 'css': 'style.css', 'js': 'script.js' };
    document.getElementById('currentFileTitle').textContent = fileNames[tabName];
    
    generateOutline();
}

// 4. Guardar Proyecto en la Nube
function markUnsaved() {
    document.getElementById('saveStatus').textContent = "● Cambios sin guardar";
    document.getElementById('saveStatus').classList.replace('text-green-500', 'text-gray-400');
}

async function saveProjectData() {
    document.getElementById('saveStatus').textContent = "Guardando...";
    const html = document.getElementById('editor-html').value;
    const css = document.getElementById('editor-css').value;
    const js = document.getElementById('editor-js').value;

    try {
        await db.collection("projects").doc(projectId).update({
            html: html,
            css: css,
            js: js,
            lastUpdated: new Date().getTime()
        });
        document.getElementById('saveStatus').textContent = "✔ Guardado";
        document.getElementById('saveStatus').classList.replace('text-gray-400', 'text-green-500');
    } catch (error) {
        console.error("Error guardando:", error);
        alert("Error al guardar.");
    }
}

// 5. Visualización 
function runPreview() {
    const html = document.getElementById('editor-html').value;
    const css = `<style>${document.getElementById('editor-css').value}</style>`;
    const js = `<script>${document.getElementById('editor-js').value}<\/script>`;
    
    const iframe = document.getElementById('previewFrame');
    iframe.srcdoc = html + css + js;
    
    document.getElementById('previewModal').classList.remove('hidden');
}

function closePreview() {
    document.getElementById('previewModal').classList.add('hidden');
    document.getElementById('previewFrame').srcdoc = ""; 
}

// 6. Aplastar Barra Lateral
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const expandBtn = document.getElementById('btnExpandSidebar');
    
    isSidebarOpen = !isSidebarOpen;
    if (isSidebarOpen) {
        sidebar.classList.remove('hidden');
        expandBtn.classList.add('hidden');
    } else {
        sidebar.classList.add('hidden');
        expandBtn.classList.remove('hidden');
    }
}

// 7. Outline Avanzado
function generateOutline() {
    const outlineBox = document.getElementById('outlineBox');
    outlineBox.innerHTML = ''; 

    let type = 'html';
    if (!document.getElementById('editor-css').classList.contains('hidden')) type = 'css';
    if (!document.getElementById('editor-js').classList.contains('hidden')) type = 'js';

    const editor = document.getElementById(`editor-${type}`);
    const lines = editor.value.split('\n');
    let items = [];

    if (type === 'html') {
        lines.forEach((line, index) => {
            const match = line.match(/<([a-zA-Z0-9]+)([^>]*)>/);
            if (match && !match[1].match(/^(br|hr|meta|link|!DOCTYPE)$/i)) {
                let name = match[1];
                const idMatch = match[2].match(/id=["']([^"']+)["']/);
                const classMatch = match[2].match(/class=["']([^"']+)["']/);
                if (idMatch) name += `<span class="text-orange-400">#${idMatch[1]}</span>`;
                if (classMatch) name += `<span class="text-gray-500">.${classMatch[1].split(' ')[0]}</span>`;
                items.push({ name: `⬡ ${name}`, line: index });
            }
        });
    } else if (type === 'css') {
        lines.forEach((line, index) => {
            if (line.includes('{')) {
                const selector = line.split('{')[0].trim();
                if (selector) items.push({ name: `<span class="text-blue-400">#</span> ${selector}`, line: index });
            }
        });
    } else if (type === 'js') {
        lines.forEach((line, index) => {
            const funcMatch = line.match(/(function\s+[a-zA-Z0-9_]+|const\s+[a-zA-Z0-9_]+\s*=\s*\(|let\s+[a-zA-Z0-9_]+\s*=\s*\()/);
            if (funcMatch) {
                let name = line.replace(/\{.*$/, '').trim();
                items.push({ name: `<span class="text-yellow-400">ƒ</span> ${name}`, line: index });
            }
        });
    }

    if (items.length === 0) {
        outlineBox.innerHTML = '<span class="text-gray-600 italic px-2">Esquema vacío</span>';
        return;
    }

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = "hover:bg-[#2a2d2e] cursor-pointer py-1 px-2 truncate transition border-l-2 border-transparent hover:border-gray-400";
        div.innerHTML = item.name;
        div.onclick = () => jumpToLine(type, item.line);
        outlineBox.appendChild(div);
    });
}

function jumpToLine(type, lineIndex) {
    const editor = document.getElementById(`editor-${type}`);
    const lines = editor.value.split('\n');
    let charCount = 0;
    
    for (let i = 0; i < lineIndex; i++) {
        charCount += lines[i].length + 1; 
    }
    
    editor.focus();
    editor.setSelectionRange(charCount, charCount);
    editor.scrollTop = lineIndex * 21;
}
