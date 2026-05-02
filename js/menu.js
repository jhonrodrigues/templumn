const menuConfig = {
    minhaMesa: [
        { icon: 'fa-table-columns', label: 'Planejamento de Postagem', href: 'index.html', category: 'editorial' },
        { icon: 'fa-palette', label: 'Produção Agência (Design)', href: 'index.html?category=design' },
        { icon: 'fa-camera', label: 'Produção de Fotos', href: 'index.html?category=photo' },
        { icon: 'fa-video', label: 'Produção de Vídeos', href: 'index.html?category=video' },
        { icon: 'fa-briefcase', label: 'Gestão Interna', href: 'index.html?category=gestao' },
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

function renderSidebarMenu() {
    const container = document.getElementById('sidebar-menu-content');
    if (!container) return;

    const userRole = localStorage.getItem('templum-auth-role');

    let html = `
        <style>
            .sidebar-menu .menu-section { margin-bottom: 24px; }
            .sidebar-menu .section-title { 
                font-size: 11px; font-weight: 700; text-transform: uppercase; 
                color: var(--text-muted); padding: 0 12px; margin-bottom: 8px; letter-spacing: 0.5px;
            }
            .sidebar-menu ul { list-style: none; margin: 0; padding: 0; }
            .sidebar-menu li { margin: 2px 8px; }
            .sidebar-menu li a {
                display: flex; align-items: center; gap: 10px;
                padding: 10px 12px; border-radius: 8px;
                color: var(--text-main); text-decoration: none;
                font-size: 14px; font-weight: 500;
                transition: all 0.2s ease;
            }
            .sidebar-menu li a:hover {
                background: rgba(255,255,255,0.08);
                transform: translateX(4px);
            }
            .sidebar-menu li a i { font-size: 15px; width: 20px; text-align: center; }
        </style>
        <div class="menu-section">
            <span class="section-title">Contas / Workspaces</span>
            <ul id="sidebar-ws-list"></ul>
        </div>
        <div class="menu-section">
            <span class="section-title">Minha Mesa</span>
            <ul>
    `;
    
    menuConfig.minhaMesa.forEach(item => {
        html += `<li><a href="${item.href}"><i class="fa-solid ${item.icon}"></i> ${item.label}</a></li>`;
    });
    html += `</ul></div>`;
    
    html += `<div class="menu-section"><span class="section-title">Gestão e Liderança</span><ul>`;
    menuConfig.gestao.forEach(item => {
        if (item.roles && !item.roles.includes(userRole)) return;
        html += `<li><a href="${item.href}"><i class="fa-solid ${item.icon}"></i> ${item.label}</a></li>`;
    });
    html += `</ul></div>`;

    container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', renderSidebarMenu);