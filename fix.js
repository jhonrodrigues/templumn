const fs = require('fs');

const files = ['index.html', 'calendario.html', 'gestao.html', 'admin-settings.html', 'mesa.html', 'usuarios.html'];

const regex = /<span class="section-title">Contas \/ Workspaces<\/span>\s*<ul[^>]*>[\s\S]*?<\/ul>/;
const replacement = `<span class="section-title">Contas / Workspaces</span>
                    <ul id="sidebar-ws-list">
                        <!-- Renderizado via API script.js -->
                    </ul>`;

files.forEach(f => {
    try {
        let content = fs.readFileSync(f, 'utf8');
        content = content.replace(regex, replacement);
        fs.writeFileSync(f, content);
        console.log('Fixed', f);
    } catch(e) {
        console.log('Skip', f);
    }
});
