// ===================================================
// js/ui.js — UI, Navigation & Theme
// Depends on: state.js, api.js
// ===================================================

function updateRoleBasedNavigation(role) {
    document.querySelectorAll('li[onclick*="admin-settings.html"]').forEach((item) => {
        item.style.display = role === 'master' ? '' : 'none';
    });
    const createColumnBtn = document.getElementById('create-column-btn');
    if (createColumnBtn) {
        createColumnBtn.style.display = role === 'master' || role === 'gestor' ? 'inline-flex' : 'none';
    }
}

function setSidebarOpen(isOpen) {
    document.body.classList.toggle('sidebar-open', Boolean(isOpen));
}

function initMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    let gestureStartX = null;
    let gestureStartY = null;

    let toggleBtn = document.querySelector('.mobile-menu-toggle');
    if (!toggleBtn) {
        toggleBtn = document.createElement('button');
        toggleBtn.className = 'mobile-menu-toggle';
        toggleBtn.setAttribute('aria-label', 'Abrir menu');
        toggleBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
        document.body.appendChild(toggleBtn);
    }

    let backdrop = document.querySelector('.mobile-sidebar-backdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'mobile-sidebar-backdrop';
        document.body.appendChild(backdrop);
    }

    let closeBtn = sidebar.querySelector('.mobile-sidebar-close');
    if (!closeBtn) {
        closeBtn = document.createElement('button');
        closeBtn.className = 'mobile-sidebar-close';
        closeBtn.setAttribute('aria-label', 'Fechar menu');
        closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        const header = sidebar.querySelector('.sidebar-header');
        if (header) header.appendChild(closeBtn);
    }

    toggleBtn.onclick = () => setSidebarOpen(true);
    closeBtn.onclick = () => setSidebarOpen(false);
    backdrop.onclick = () => setSidebarOpen(false);

    sidebar.querySelectorAll('li').forEach((item) => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) setSidebarOpen(false);
        });
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) setSidebarOpen(false);
    });

    document.addEventListener('touchstart', (event) => {
        if (event.touches.length !== 1) return;
        gestureStartX = event.touches[0].clientX;
        gestureStartY = event.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', (event) => {
        if (gestureStartX === null || gestureStartY === null || window.innerWidth > 768) return;
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - gestureStartX;
        const deltaY = touch.clientY - gestureStartY;

        if (Math.abs(deltaY) < 80) {
            if (!document.body.classList.contains('sidebar-open') && gestureStartX < 32 && deltaX > 70) {
                setSidebarOpen(true);
            }
            if (document.body.classList.contains('sidebar-open') && deltaX < -70) {
                setSidebarOpen(false);
            }
        }

        gestureStartX = null;
        gestureStartY = null;
    }, { passive: true });
}

async function initWorkspaces() {
    try {
        const res = await fetch('/api/workspaces', { headers: getAuthHeaders() });
        const wss = await res.json();
        availableWorkspaces = Array.isArray(wss) ? wss : [];
        if (availableWorkspaces.length > 0 && !availableWorkspaces.some((workspace) => workspace.id === activeWorkspaceId)) {
            activeWorkspaceId = availableWorkspaces[0].id;
            localStorage.setItem('templum-active-ws', activeWorkspaceId);
        }
        const sw = document.getElementById('ws-switcher');
        if(sw) {
            if (sw.dataset.defaultAll === 'true') {
                activeWorkspaceId = '__all__';
            }
            sw.innerHTML = '';
            const includeAllOption = sw.dataset.includeAll === 'true';
            if (includeAllOption) {
                const allOpt = document.createElement('option');
                allOpt.value = '__all__';
                allOpt.innerText = 'Todas as contas';
                if (activeWorkspaceId === '__all__') allOpt.selected = true;
                sw.appendChild(allOpt);
            }
            wss.forEach(w => {
                const opt = document.createElement('option');
                opt.value = w.id;
                opt.innerText = w.name;
                if(w.id === activeWorkspaceId) opt.selected = true;
                sw.appendChild(opt);
            });
            sw.value = activeWorkspaceId;
            const dynamicTitle = document.getElementById('dyn-board-title');
            if (dynamicTitle) {
                const wsName = activeWorkspaceId === '__all__' ? 'Todas as contas' : (wss.find(w => w.id === activeWorkspaceId)?.name || 'Board');
                const catName = activeCategory === 'design' ? ' (Produção Agência)' : ' (Editorial)';
                dynamicTitle.innerText = wsName + catName;
            }
            sw.onchange = (e) => {
                activeWorkspaceId = e.target.value;
                if (activeWorkspaceId !== '__all__') {
                    localStorage.setItem('templum-active-ws', activeWorkspaceId);
                }
                if (dynamicTitle) dynamicTitle.innerText = e.target.options[e.target.selectedIndex].text;
                loadStateFromServer();
                loadNotifications();
                if (window.renderCalendarPage) window.renderCalendarPage();
            };
            if (window.renderCalendarPage) window.renderCalendarPage();
        }
        
        const sideWs = document.getElementById('sidebar-ws-list');
        if(sideWs) {
            sideWs.innerHTML = `
                <li style="padding: 0; margin: 0 12px; background: transparent;">
                    <div class="workspace-switcher-box">
                        <label class="workspace-switcher-label" for="sidebar-workspace-select">Conta ativa</label>
                        <select id="sidebar-workspace-select" class="workspace-switcher-select"></select>
                    </div>
                </li>
            `;
            const sideSelect = document.getElementById('sidebar-workspace-select');
            if (sideSelect) {
                wss.forEach((workspace) => {
                    const opt = document.createElement('option');
                    opt.value = workspace.id;
                    opt.innerText = workspace.name;
                    if (workspace.id === activeWorkspaceId) opt.selected = true;
                    sideSelect.appendChild(opt);
                });
                sideSelect.onchange = (event) => {
                    activeWorkspaceId = event.target.value;
                    localStorage.setItem('templum-active-ws', activeWorkspaceId);
                    if (sw) sw.value = activeWorkspaceId;
                    loadNotifications();
                    if (window.renderCalendarPage) {
                        window.renderCalendarPage();
                    } else if (window.location.pathname === '/' || window.location.pathname.endsWith('.html')) {
                        window.location.reload();
                    }
                };
            }
        }

        renderWorkspaceSelector('new-card-workspaces', [activeWorkspaceId]);
        if (activeCardData) {
            renderWorkspaceSelector('edit-card-workspaces', activeCardData.visible_workspaces || [activeWorkspaceId]);
        }
    } catch(err) {
        console.error('WS Load Error', err);
        const sideWs = document.getElementById('sidebar-ws-list');
        if (sideWs) {
            sideWs.innerHTML = '<li style="padding: 0; margin: 0 12px; background: transparent;"><div class="workspace-switcher-box"><span class="workspace-switcher-empty">Nao foi possivel carregar as contas.</span></div></li>';
        }
    }
}

function renderWorkspaceSelector(containerId, selectedIds) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const selected = new Set(Array.isArray(selectedIds) ? selectedIds : [activeWorkspaceId]);
    selected.add(activeWorkspaceId);

    container.innerHTML = availableWorkspaces.map((workspace) => `
        <label class="workspace-option">
            <input type="checkbox" value="${workspace.id}" ${selected.has(workspace.id) ? 'checked' : ''}>
            <span>${workspace.name}</span>
        </label>
    `).join('');
}

function getSelectedWorkspaceIds(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [activeWorkspaceId];
    const selected = Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map((input) => input.value);
    if (!selected.includes(activeWorkspaceId)) selected.push(activeWorkspaceId);
    return selected;
}

// --- Theme Toggle Logic --- //
function initTheme() {
    const savedTheme = localStorage.getItem('templum-theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    if (themeToggleBtn) {
        themeToggleBtn.innerHTML = savedTheme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    }
}

function initThemeToggle() {
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (isDark) {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('templum-theme', 'light');
                themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('templum-theme', 'dark');
                themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
            }
        });
    }
}

function initNotificationsPanel() {
    if (notificationsBtn && notificationsPanel) {
        notificationsBtn.addEventListener('click', async (event) => {
            event.stopPropagation();
            await loadNotifications();
            notificationsPanel.classList.toggle('active');
        });

        document.addEventListener('click', (event) => {
            if (!notificationsPanel.contains(event.target) && !notificationsBtn.contains(event.target)) {
                notificationsPanel.classList.remove('active');
            }
        });
    }
}
