const fs = require('fs');

const files = [
    'index.html', 
    'calendario.html', 
    'gestao.html', 
    'admin-settings.html', 
    'mesa.html', 
    'usuarios.html',
    'captacoes.html',
    'etiquetas.html',
    'minha-conta.html',
    'postados.html'
];

const standardSidebar = `<aside class="sidebar">
            <div class="sidebar-header">
                <div class="logo">
                    <div class="logo-icon"><i class="fa-solid fa-shapes"></i></div>
                    <span class="logo-text">Templum</span>
                </div>
            </div>

            <div class="sidebar-menu">
                <div class="menu-section">
                    <span class="section-title">Contas / Workspaces</span>
                    <ul id="sidebar-ws-list"></ul>
                </div>

                <div class="menu-section">
                    <span class="section-title">Minha Mesa</span>
                    <ul>
                        <li onclick="window.location.href='index.html'"><i class="fa-solid fa-table-columns"></i> Planejamento de Postagem</li>
                        <li onclick="window.location.href='index.html?category=design'"><i class="fa-solid fa-palette"></i> Produção Agência (Design)</li>
                        <li onclick="window.location.href='mesa.html'"><i class="fa-solid fa-user-check"></i> Minhas Tarefas</li>
                        <li onclick="window.location.href='captacoes.html'"><i class="fa-solid fa-video"></i> Agendamento Captações</li>
                        <li onclick="window.location.href='calendario.html'"><i class="fa-regular fa-calendar-days"></i> Calendário do Mês</li>
                        <li onclick="window.location.href='postados.html'"><i class="fa-solid fa-square-check"></i> Checklist de Postagem</li>
                        <li onclick="window.location.href='minha-conta.html'"><i class="fa-solid fa-user-gear"></i> Minha Conta</li>
                    </ul>
                </div>
                
                <div class="menu-section">
                    <span class="section-title">Gestão e Liderança</span>
                    <ul>
                        <li onclick="window.location.href='gestao.html'"><i class="fa-solid fa-chart-pie"></i> Relatórios da Agência</li>
                        <li onclick="window.location.href='usuarios.html'"><i class="fa-solid fa-users"></i> Equipe e Acessos</li>
                        <li onclick="window.location.href='etiquetas.html'"><i class="fa-solid fa-tags"></i> Etiquetas Padrão</li>
                        <li onclick="window.location.href='admin-settings.html'"><i class="fa-solid fa-cogs"></i> Master Configurações</li>
                    </ul>
                </div>
            </div>
            
            <div class="user-profile">
                <div class="user-info" style="width:100%;">
                    <button onclick="localStorage.clear(); window.location.href='/login.html';" style="width:100%; padding: 10px; background: rgba(239, 68, 68, 0.1); color: #ef4444; border:none; border-radius:8px; cursor:pointer; font-weight: 600;"><i class="fa-solid fa-right-from-bracket"></i> Sair do Sistema</button>
                </div>
            </div>
        </aside>`;

files.forEach(f => {
    if (!fs.existsSync(f)) {
        console.log('Skipping missing file:', f);
        return;
    }
    try {
        let content = fs.readFileSync(f, 'utf8');
        
        // Substitui tudo dentro da sidebar
        content = content.replace(/<aside class="sidebar">[\s\S]*?<\/aside>/, standardSidebar);
        
        // Em arquivos mais antigos que possam ter a sidebar em uma div:
        content = content.replace(/<div class="sidebar">[\s\S]*?(<main|<div class="main-content")/m, standardSidebar + '\n        $1');
        
        fs.writeFileSync(f, content);
        console.log('✅ Sidebar atualizada em:', f);
    } catch(err) {
        console.log('❌ Erro no arquivo', f, err);
    }
});
