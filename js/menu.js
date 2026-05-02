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

    container.innerHTML = `
        <div class="menu-section">
            <span class="section-title">Contas / Workspaces</span>
            <ul id="sidebar-ws-list"></ul>
        </div>
        <div class="menu-section">
            <span class="section-title">Minha Mesa</span>
            <ul>
                ${menuConfig.minhaMesa.map(item => `
                    <li onclick="window.location.href='${getMenuItemHref(item)}'">
                        <i class="fa-solid ${item.icon}"></i> ${item.label}
                    </li>
                `).join('')}
            </ul>
        </div>
        <div class="menu-section">
            <span class="section-title">Gestão e Liderança</span>
            <ul>
                ${menuConfig.gestao.filter(item => !item.roles || item.roles.includes(userRole)).map(item => `
                    <li onclick="window.location.href='${item.href}'">
                        <i class="fa-solid ${item.icon}"></i> ${item.label}
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
}

function initSidebarMenu() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    let container = document.getElementById('sidebar-menu-content');
    if (!container) {
        container = document.createElement('div');
        container.id = 'sidebar-menu-content';
    }

    const profile = sidebar.querySelector('.user-profile');
    const logo = sidebar.querySelector('.sidebar-header');
    const existingContainer = sidebar.querySelector('#sidebar-menu-content');
    
    if (existingContainer && existingContainer !== container) {
        existingContainer.remove();
    }
    
    if (profile && logo) {
        sidebar.insertBefore(container, profile);
    } else if (logo) {
        sidebar.appendChild(container);
    }

    renderSidebarMenu('sidebar-menu-content');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebarMenu);
} else {
    initSidebarMenu();
}