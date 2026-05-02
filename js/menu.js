const menuConfig = {
    minhaMesa: [
        { icon: 'fa-table-columns', label: 'Planejamento de Postagem', href: 'index.html?category=editorial', board: 'editorial' },
        { icon: 'fa-palette', label: 'Produção Agência (Design)', href: 'index.html?category=design', board: 'design' },
        { icon: 'fa-camera', label: 'Produção de Fotos', href: 'index.html?category=photo', board: 'photo' },
        { icon: 'fa-video', label: 'Produção de Vídeos', href: 'index.html?category=video', board: 'video' },
        { icon: 'fa-briefcase', label: 'Gestão Interna', href: 'index.html?category=gestao', board: 'gestao' },
        { icon: 'fa-user-check', label: 'Minhas Tarefas', href: 'mesa.html' },
        { icon: 'fa-video', label: 'Agendamento Captações', href: 'captacoes.html' },
        { icon: 'fa-calendar-days', label: 'Calendário do Mês', href: 'calendario.html' },
        { icon: 'fa-square-check', label: 'Checklist de Postagem', href: 'postados.html' },
        { icon: 'fa-user-gear', label: 'Minha Conta', href: 'minha-conta.html' }
    ],
    gestao: [
        { icon: 'fa-chart-pie', label: 'Relatórios da Agência', href: 'gestao.html' },
        { icon: 'fa-users', label: 'Equipe e Acessos', href: 'usuarios.html' },
        { icon: 'fa-tags', label: 'Etapas Padrão', href: 'etiquetas.html' },
        { icon: 'fa-cogs', label: 'Master Configurações', href: 'admin-settings.html', roles: ['master'] }
    ]
};

function renderSidebarMenu() {
    const container = document.getElementById('sidebar-menu-content');
    if (!container) return;

    const userRole = localStorage.getItem('templum-auth-role');
    const userBoards = JSON.parse(localStorage.getItem('templum-auth-boards') || '["editorial", "design", "photo", "video", "gestao"]');

    let html = '<div class="menu-section"><span class="section-title">Contas / Workspaces</span><ul id="sidebar-ws-list"></ul></div>';
    html += '<div class="menu-section"><span class="section-title">Minha Mesa</span><ul>';
    
    menuConfig.minhaMesa.forEach(item => {
        if (item.board && !userBoards.includes(item.board) && userRole !== 'master' && userRole !== 'gestor') return;
        html += `<li><a href="${item.href}"><i class="fa-solid ${item.icon}"></i> ${item.label}</a></li>`;
    });
    html += '</ul></div>';
    
    // Só mostra Gestão e Liderança para master/gestor
    if (userRole === 'master' || userRole === 'gestor') {
        html += '<div class="menu-section"><span class="section-title">Gestão e Liderança</span><ul>';
        menuConfig.gestao.forEach(item => {
            if (item.roles && !item.roles.includes(userRole)) return;
            html += `<li><a href="${item.href}"><i class="fa-solid ${item.icon}"></i> ${item.label}</a></li>`;
        });
        html += '</ul></div>';
    }

    container.innerHTML = html;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderSidebarMenu);
} else {
    renderSidebarMenu();
}