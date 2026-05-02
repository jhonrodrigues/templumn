const menuConfig = {
    minhaMesa: [
        { icon: 'fa-table-columns', label: 'Planejamento de Postagem', href: 'index.html', category: 'editorial' },
        { icon: 'fa-palette', label: 'Produção Agência (Design)', href: 'index.html', category: 'design' },
        { icon: 'fa-camera', label: 'Produção de Fotos', href: 'index.html', category: 'photo' },
        { icon: 'fa-video', label: 'Produção de Vídeos', href: 'index.html', category: 'video' },
        { icon: 'fa-briefcase', label: 'Gestão Interna', href: 'index.html', category: 'gestao' },
        { icon: 'fa-user-check', label: 'Minhas Tarefas', href: 'mesa.html' },
        { icon: 'fa-video', label: 'Agendamento Captações', href: 'captacoes.html' },
        { icon: 'fa-calendar-days', label: 'Calendário do Mês', href: 'calendario.html' },
        { icon: 'fa-square-check', label: 'Checklist de Postagem', href: 'postados.html' },
        { icon: 'fa-user-gear', label: 'Minha Conta', href: 'minha-conta.html' }
    ],
    gestao: [
        { icon: 'fa-chart-pie', label: 'Relatórios da Agência', href: 'gestao.html' },
        { icon: 'fa-users', label: 'Equipe e Acessos', href: 'usuarios.html' },
        { icon: 'fa-tags', label: 'Etiquetas Padrão', href: 'etiquetas.html' },
        { icon: 'fa-cogs', label: 'Master Configurações', href: 'admin-settings.html', roles: ['master'] }
    ]
};

function getMenuItemHref(item) {
    if (item.href === 'index.html') {
        const urlParams = new URLSearchParams(window.location.search);
        const cat = urlParams.get('category') || item.category || 'editorial';
        return `index.html?category=${cat}`;
    }
    return item.href;
}

function renderSidebarMenu(containerId = 'sidebar-menu-content') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const userRole = localStorage.getItem('templum-auth-role');

    let html = '';

    html += `<div class="menu-section">
        <span class="section-title">Contas / Workspaces</span>
        <ul id="sidebar-ws-list"></ul>
    </div>`;

    html += `<div class="menu-section">
        <span class="section-title">Minha Mesa</span>
        <ul>`;
    menuConfig.minhaMesa.forEach(item => {
        html += `<li onclick="window.location.href='${getMenuItemHref(item)}'"><i class="fa-solid ${item.icon}"></i> ${item.label}</li>`;
    });
    html += `</ul></div>`;

    html += `<div class="menu-section">
        <span class="section-title">Gestão e Liderança</span>
        <ul>`;
    menuConfig.gestao.forEach(item => {
        if (item.roles && !item.roles.includes(userRole)) return;
        html += `<li onclick="window.location.href='${item.href}'"><i class="fa-solid ${item.icon}"></i> ${item.label}</li>`;
    });
    html += `</ul></div>`;

    container.innerHTML = html;
}

function initSidebarMenu() {
    let container = document.getElementById('sidebar-menu-content');
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    if (!container) {
        container = document.createElement('div');
        container.id = 'sidebar-menu-content';
        container.className = 'sidebar-menu';
        
        const profile = sidebar.querySelector('.user-profile');
        const logo = sidebar.querySelector('.sidebar-header');
        
        if (profile && logo) {
            container.innerHTML = '';
            sidebar.insertBefore(container, profile);
        } else if (logo) {
            container.innerHTML = '';
            sidebar.appendChild(container);
        }
    }

    if (container && !container.innerHTML) {
        renderSidebarMenu('sidebar-menu-content');
    } else if (container && container.children.length === 0) {
        renderSidebarMenu('sidebar-menu-content');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebarMenu);
} else {
    initSidebarMenu();
}