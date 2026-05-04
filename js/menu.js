const menuConfig = {
    otherItems: [
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

const boardLabels = {
    'editorial': 'Planejamento de Postagem',
    'design': 'Produção Agência (Design)',
    'photo': 'Produção de Fotos',
    'video': 'Produção de Vídeos',
    'gestao': 'Gestão Interna'
};

async function loadBoardsForMenu() {
    try {
        const token = localStorage.getItem('templum-auth-token');
        const res = await fetch('/api/boards', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            const boards = await res.json();
            localStorage.setItem('templum-cached-boards', JSON.stringify(boards));
            return boards;
        }
    } catch (e) {}
    return JSON.parse(localStorage.getItem('templum-cached-boards') || '[]');
}

async function renderSidebarMenu() {
    const container = document.getElementById('sidebar-menu-content');
    if (!container) return;

    const userRole = localStorage.getItem('templum-auth-role');
    const userBoards = JSON.parse(localStorage.getItem('templum-auth-boards') || '["editorial", "design", "photo", "video", "gestao"]');

    const boards = await loadBoardsForMenu();
    const boardMap = {};
    boards.forEach(b => { boardMap[b.id] = b; });

    let html = '<div class="menu-section"><span class="section-title">Contas / Workspaces</span><ul id="sidebar-ws-list"></ul></div>';
    html += '<div class="menu-section"><span class="section-title">Minha Mesa</span><ul>';
    
    if (boards.length > 0) {
        boards.forEach(board => {
            if (board.id === 'gestao') return;
            if (board.id !== 'editorial' && userRole !== 'master' && userRole !== 'gestor' && !userBoards.includes(board.id)) return;
            const label = boardLabels[board.id] || board.name;
            html += `<li><a href="index.html?category=${board.id}"><i class="fa-solid ${board.icon}"></i> ${label}</a></li>`;
        });
    } else {
        menuConfig.otherItems.filter(i => !i.board).forEach(item => {
            html += `<li><a href="${item.href}"><i class="fa-solid ${item.icon}"></i> ${item.label}</a></li>`;
        });
    }
    
    menuConfig.otherItems.forEach(item => {
        if (!item.board) {
            html += `<li><a href="${item.href}"><i class="fa-solid ${item.icon}"></i> ${item.label}</a></li>`;
        }
    });
    html += '</ul></div>';
    
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