// === SECURITY GUARD ===
const TEMPLUM_TOKEN = localStorage.getItem('templum-auth-token');
if (!TEMPLUM_TOKEN) {
    window.location.href = '/login.html';
}
const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + TEMPLUM_TOKEN
};
const getAuthHeaders = () => ({ 'Authorization': 'Bearer ' + localStorage.getItem('templum-auth-token') });

async function syncCurrentUser() {
    try {
        const response = await fetch('/api/me', { headers: getAuthHeaders() });
        if (!response.ok) return;
        const user = await response.json();
        localStorage.setItem('templum-auth-user', user.email);
        localStorage.setItem('templum-auth-role', user.role || 'membro');
        updateRoleBasedNavigation(user.role || 'membro');
    } catch (err) {
        console.error('Current user sync error', err);
    }
}

function updateRoleBasedNavigation(role) {
    document.querySelectorAll('li[onclick*="admin-settings.html"]').forEach((item) => {
        item.style.display = role === 'master' ? '' : 'none';
    });
    const createColumnBtn = document.getElementById('create-column-btn');
    if (createColumnBtn) {
        createColumnBtn.style.display = role === 'master' || role === 'gestor' ? 'inline-flex' : 'none';
    }
}

// State Object to track the dynamic state
let boardState = { columns: [] };
let activeWorkspaceId = localStorage.getItem('templum-active-ws') || 'lagoinhaalphaville.sp';
let activeCategory = new URLSearchParams(window.location.search).get('category') || 'editorial';
let activeCardData = null;
let availableWorkspaces = [];
let labelPresets = [];
let activeCardId = null;
let activeCardColId = null;
let activeColumnId = null;
let suppressCardClickOnce = false;

// Modal elements - declare all here to avoid redeclaration
let modalOverlay, modalBox, closeModalBtn, saveCardBtn, deleteCardBtn;
let editTitleInput, editDescriptionInput, editPlatformInput, editDateInput, editTimeInput, editRecurrenceInput;
let modalListName, modalTitle, memberInput, membersList, addMemberBtn;
let labelsEditor, presetLabelsList;
let checklistInput, checklistItems, addChecklistBtn;
let commentInput, commentsList, addCommentBtn;
let imageInput, imagesList, fileInput, filesList;
let removeCardFromWorkspaceBtn, duplicateCardBtn;
let columnModal, closeColumnModalBtn, editColumnTitleInput;
let saveColumnBtn, deleteColumnBtn, createColumnBtn;
let moveColumnLeftBtn, moveColumnRightBtn, columnReorderActions;
let fabGlobalCreate, newCardModal, closeNewModal, submitNewCardBtn;
let ncTitle, ncPlatform, ncDate, ncTime, ncRecurrence, ncAssignee, ncWorkspaces;
let requestDesignBtn, linkedDesignInfo;
let memberSuggestionsCache = [];

function getSaoPauloNowParts() {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    const parts = Object.fromEntries(formatter.formatToParts(new Date()).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function formatPostSchedule(postDate, postTime) {
    if (!postDate) return '';
    const spl = postDate.split('-');
    if (spl.length !== 3) return postDate;
    return postTime ? `${spl[2]}/${spl[1]} ${postTime}` : `${spl[2]}/${spl[1]}`;
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
// injection moved below variable declarations

// injection moved below variable declarations

function reinitializeModalElements() {
    modalOverlay = document.getElementById('card-modal');
    modalBox = document.querySelector('.card-modal-content');
    closeModalBtn = document.querySelector('#card-modal .close-modal');
    saveCardBtn = document.getElementById('save-card-btn');
    deleteCardBtn = document.getElementById('delete-card-btn');
    editTitleInput = document.getElementById('edit-card-title');
    editDescriptionInput = document.getElementById('edit-card-description');
    editPlatformInput = document.getElementById('edit-card-platform');
    editDateInput = document.getElementById('edit-card-date');
    editTimeInput = document.getElementById('edit-card-time');
    editRecurrenceInput = document.getElementById('edit-card-recurrence');
    removeRecurrenceBtn = document.getElementById('remove-recurrence-btn');
    modalListName = document.getElementById('modal-list-name');
    modalTitle = document.getElementById('modal-title');
    memberInput = document.getElementById('member-input');
    membersList = document.getElementById('members-list');
    addMemberBtn = document.getElementById('add-member-btn');
    labelsEditor = document.getElementById('labels-editor');
    presetLabelsList = document.getElementById('preset-labels-list');
    checklistInput = document.getElementById('checklist-input');
    checklistItems = document.getElementById('checklist-items');
    addChecklistBtn = document.getElementById('add-checklist-btn');
    commentInput = document.getElementById('comment-input');
    commentsList = document.getElementById('comments-list');
    addCommentBtn = document.getElementById('add-comment-btn');
    imageInput = document.getElementById('image-input');
    imagesList = document.getElementById('images-list');
    fileInput = document.getElementById('file-input');
    filesList = document.getElementById('files-list');
    removeCardFromWorkspaceBtn = document.getElementById('remove-card-from-workspace-btn');
    duplicateCardBtn = document.getElementById('duplicate-card-btn');
    columnModal = document.getElementById('column-modal');
    closeColumnModalBtn = document.getElementById('close-column-modal');
    editColumnTitleInput = document.getElementById('edit-column-title');
    saveColumnBtn = document.getElementById('save-column-btn');
    deleteColumnBtn = document.getElementById('delete-column-btn');
    createColumnBtn = document.getElementById('create-column-btn');
    moveColumnLeftBtn = document.getElementById('move-column-left-btn');
    moveColumnRightBtn = document.getElementById('move-column-right-btn');
    columnReorderActions = document.getElementById('column-reorder-actions');
    
    // FAB / New Card
    fabGlobalCreate = document.getElementById('fab-global-create');
    newCardModal = document.getElementById('new-card-modal');
    closeNewModal = document.getElementById('close-new-modal');
    submitNewCardBtn = document.getElementById('submit-new-card');
    ncTitle = document.getElementById('nc-title');
    ncPlatform = document.getElementById('nc-platform');
    ncDate = document.getElementById('nc-date');
    ncTime = document.getElementById('nc-time');
    ncRecurrence = document.getElementById('nc-recurrence');
    ncAssignee = document.getElementById('nc-assignee');
    ncWorkspaces = document.getElementById('new-card-workspaces');
    
    // Re-bind theme toggle if it was missing
    themeToggleBtn = document.getElementById('theme-toggle');
    requestDesignBtn = document.getElementById('request-design-btn');
    linkedDesignInfo = document.getElementById('linked-design-info');
}

async function loadStateFromServer() {
    const boardCanvas = document.getElementById('board-canvas');
    if (!boardCanvas) return; // Not on the Kanban page
    
    try {
        const response = await fetch(`/api/board?workspace=${activeWorkspaceId}&category=${activeCategory}`, { headers: getAuthHeaders() });
        if (response.status === 401 || response.status === 403) {
            window.location.href = '/login.html';
            return;
        }
        if (response.ok) {
            const data = await response.json();
            boardState.columns = data.columns;
            renderBoard();
        }
    } catch(err) {
        console.error('Failed to load board state, fallback to empty', err);
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

function resetNewCardModal() {
    document.getElementById('nc-title').value = '';
    const nowParts = getSaoPauloNowParts();
    document.getElementById('nc-date').value = nowParts.date;
    const timeField = document.getElementById('nc-time');
    if (timeField) timeField.value = nowParts.time;
    const recurrenceField = document.getElementById('nc-recurrence');
    if (recurrenceField) recurrenceField.value = 'none';
    document.getElementById('nc-platform').value = '';
    const aField = document.getElementById('nc-assignee');
    if (aField) aField.value = '';
    renderWorkspaceSelector('new-card-workspaces', [activeWorkspaceId]);
}

async function loadMemberSuggestions(search = '') {
    const datalist = document.getElementById('member-suggestions');
    if (!datalist) return;
    try {
        const response = await fetch('/api/users/options?q=' + encodeURIComponent(search), { headers: getAuthHeaders() });
        if (!response.ok) return;
        const users = await response.json();
        memberSuggestionsCache = Array.isArray(users) ? users : [];
        datalist.innerHTML = users.map((user) => `<option value="${user.email}"></option>`).join('');
    } catch (err) {
        console.error('Member suggestions error', err);
    }
}

async function isValidMemberEmail(email) {
    try {
        const response = await fetch('/api/users/options?q=' + encodeURIComponent(email), { headers: getAuthHeaders() });
        if (!response.ok) return false;
        const users = await response.json();
        return users.some((user) => (user.email || '').toLowerCase() === email.toLowerCase());
    } catch (err) {
        return false;
    }
}

async function loadLabelPresets() {
    try {
        const response = await fetch('/api/label-presets', { headers: getAuthHeaders() });
        if (!response.ok) return;
        labelPresets = await response.json();
        renderPresetLabels();
    } catch (err) {
        console.error('Label presets error', err);
    }
}

async function initBranding() {
    try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.primary_color) {
            document.documentElement.style.setProperty('--primary', data.primary_color);
        }
        updateLogo(data);
        const observer = new MutationObserver(() => {
            updateLogo(data);
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    } catch(err) {
        console.error('Sem conexao, mantendo cor original.');
    }
}

function updateLogo(data) {
    const logoContainer = document.querySelector('.logo');
    if (logoContainer) {
        const existingImg = logoContainer.querySelector('.custom-logo');
        if (existingImg) existingImg.remove();
        const logoIcon = logoContainer.querySelector('.logo-icon');
        const logoText = logoContainer.querySelector('.logo-text');
        if (logoIcon) logoIcon.style.display = 'none';
        if (logoText) logoText.style.display = 'none';
        
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const logoUrl = isDark ? data.logo_dark_url : data.logo_light_url;
        
        if (logoUrl) {
            const img = document.createElement('img');
            img.src = logoUrl;
            img.className = 'custom-logo';
            img.style.cssText = 'max-height: 36px; max-width: 120px; border-radius: 6px;';
            logoContainer.insertBefore(img, logoContainer.firstChild);
        }
    }
}
initBranding();
updateRoleBasedNavigation(localStorage.getItem('templum-auth-role') || 'membro');
syncCurrentUser();
loadStateFromServer();
loadNotifications();
loadLabelPresets();

async function loadNotifications() {
    const badge = document.getElementById('notifications-badge');
    const list = document.getElementById('notifications-list');
    const countLabel = document.getElementById('notifications-count-label');
    if (!badge || !list || !countLabel) return;

    try {
        const response = await fetch('/api/notifications?workspace=' + encodeURIComponent(activeWorkspaceId), { headers: getAuthHeaders() });
        if (!response.ok) return;
        const data = await response.json();
        const notifications = Array.isArray(data.notifications) ? data.notifications : [];
        badge.innerText = String(notifications.length);
        badge.style.display = notifications.length ? 'flex' : 'none';
        countLabel.innerText = `${notifications.length} item(ns)`;
        list.innerHTML = notifications.length
            ? notifications.map((notification) => `
                <div class="notification-item notification-${notification.type}">
                    <strong>${notification.title}</strong>
                    <span>${notification.detail}</span>
                </div>
            `).join('')
            : '<div class="notifications-empty">Sem notificações no momento.</div>';
    } catch (err) {
        console.error('Notifications error', err);
    }
}

// Reference to DOM elements
let themeToggleBtn = document.getElementById('theme-toggle');
const notificationsBtn = document.getElementById('notifications-btn');
const notificationsPanel = document.getElementById('notifications-panel');

// --- Render Logic --- //

function renderBoard() {
    const boardCanvasEl = document.getElementById('board-canvas');
    if (!boardCanvasEl) return;
    boardCanvasEl.innerHTML = '';
    
    boardState.columns.forEach(column => {
        // Create Column
        const colEl = document.createElement('div');
        colEl.className = 'column';
        colEl.dataset.colId = column.id;
        
        // Header
        const headerEl = document.createElement('div');
        headerEl.className = 'column-header';
        headerEl.innerHTML = `
            <div>${column.title} <span class="count">${column.cards.length}</span></div>
            <button class="column-menu-btn"><i class="fa-solid fa-ellipsis"></i></button>
        `;
        const menuBtn = headerEl.querySelector('button');
        if (menuBtn) {
            menuBtn.onclick = () => {
                openColumnModal(column);
            };
        }
        
        // Body (Droppable)
        const bodyEl = document.createElement('div');
        bodyEl.className = 'column-body';
        bodyEl.dataset.colId = column.id;
        
        // Attach Drop Listeners to column body
        bodyEl.addEventListener('dragover', handleDragOver);
        bodyEl.addEventListener('dragenter', handleDragEnter);
        bodyEl.addEventListener('dragleave', handleDragLeave);
        bodyEl.addEventListener('drop', handleDrop);
        
        // Cards
        column.cards.forEach(card => {
            const cardEl = createCardElement(card, column.id);
            bodyEl.appendChild(cardEl);
        });
        
        colEl.appendChild(headerEl);
        colEl.appendChild(bodyEl);
        
        // Add button
        const addBtn = document.createElement('button');
        addBtn.className = 'add-card-btn';
        addBtn.innerHTML = `<i class="fa-solid fa-plus"></i> Adicionar um cartão`;
        addBtn.onclick = () => {
            const m = document.getElementById('new-card-modal');
            m.classList.add('active');
            resetNewCardModal();
            
            document.getElementById('submit-new-card').onclick = async () => {
                const title = document.getElementById('nc-title').value;
                const platform = document.getElementById('nc-platform').value;
                const post_date = document.getElementById('nc-date').value;
                const post_time = document.getElementById('nc-time').value;
                const recurrence_type = document.getElementById('nc-recurrence').value;
                const aField = document.getElementById('nc-assignee');
                const assignee = aField ? aField.value : '';
                const visible_workspaces = getSelectedWorkspaceIds('new-card-workspaces');
                
                if (!title || title.trim() === '') return alert('Preencha a pauta!');
                
                document.getElementById('submit-new-card').innerHTML = 'Gravando...';
                try {
                    await fetch('/api/cards', {
                        method: 'POST',
                        headers: authHeaders,
                        body: JSON.stringify({ title, column_id: column.id, platform, post_date, post_time, recurrence_type, workspace_id: activeWorkspaceId, assignee, visible_workspaces, images: [], category: activeCategory })
                    });
                    m.classList.remove('active');
                    loadStateFromServer();
                } catch(err) {
                    alert('Erro de conexão ao criar card');
                } finally {
                    document.getElementById('submit-new-card').innerHTML = 'Criar Cartão <i class="fa-solid fa-check" style="margin-left: 6px;"></i>';
                }
            };
            
            document.getElementById('close-new-modal').onclick = () => m.classList.remove('active');
        };
        colEl.appendChild(addBtn);
        
        boardCanvasEl.appendChild(colEl);
    });
}

// --- FAB CREATE LOGIC ---
const fabBtn = document.getElementById('fab-global-create');
if (fabBtn) {
    fabBtn.onclick = () => {
        // Find default col (col-1 or first)
        const colId = boardState.columns.length > 0 ? boardState.columns[0].id : 'col-1';
        
        const m = document.getElementById('new-card-modal');
        m.classList.add('active');
        resetNewCardModal();
        const aField = document.getElementById('nc-assignee');
        
        document.getElementById('submit-new-card').onclick = async () => {
            const title = document.getElementById('nc-title').value;
            const platform = document.getElementById('nc-platform').value;
            const post_date = document.getElementById('nc-date').value;
            const post_time = document.getElementById('nc-time').value;
            const recurrence_type = document.getElementById('nc-recurrence').value;
            const assignee = aField ? aField.value : '';
            const visible_workspaces = getSelectedWorkspaceIds('new-card-workspaces');
            
            if (!title || title.trim() === '') return alert('Preencha a pauta!');
            
            document.getElementById('submit-new-card').innerHTML = 'Gravando...';
            try {
                await fetch('/api/cards', {
                    method: 'POST',
                    headers: authHeaders,
                    body: JSON.stringify({ title, column_id: colId, platform, post_date, post_time, recurrence_type, workspace_id: activeWorkspaceId, assignee, visible_workspaces, images: [], category: activeCategory })
                });
                m.classList.remove('active');
                loadStateFromServer();
            } catch(err) {
                alert('Erro de conexão ao criar card');
            } finally {
                document.getElementById('submit-new-card').innerHTML = 'Criar Cartão <i class="fa-solid fa-check" style="margin-left: 6px;"></i>';
            }
        };
        document.getElementById('close-new-modal').onclick = () => m.classList.remove('active');
    };
}

function createCardElement(card, colId) {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    cardEl.draggable = true;
    cardEl.dataset.cardId = card.id;
    cardEl.dataset.colId = colId;
    
    let labelsHTML = '';
    if (card.labels && card.labels.length > 0) {
        if (typeof card.labels === 'string') card.labels = JSON.parse(card.labels);
        labelsHTML = `<div class="card-labels">
            ${card.labels.map(l => `<span class="label ${l.color}">${l.text}</span>`).join('')}
        </div>`;
    }
    
    let platformHtml = '';
    if (card.platform) {
        let pcolor = 'var(--text-muted)';
        let picon = 'fa-globe';
        if(card.platform === 'instagram') { pcolor = 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)'; picon = 'fa-instagram'; }
        if(card.platform === 'tiktok') { pcolor = '#000000'; picon = 'fa-tiktok'; }
        if(card.platform === 'youtube') { pcolor = '#FF0000'; picon = 'fa-youtube'; }
        if(card.platform === 'facebook') { pcolor = '#1877F2'; picon = 'fa-facebook'; }
        platformHtml = `<span class="card-label" style="background: ${pcolor}; color: white; display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px;"><i class="fa-brands ${picon}"></i></span>`;
    }
    
    let dateHtml = '';
    if (card.post_date) {
        const scheduleLabel = formatPostSchedule(card.post_date, card.post_time);
        if(scheduleLabel) dateHtml = `<span style="font-size: 11px; margin-left: 8px; color: var(--text-main); font-weight: 600;"><i class="fa-regular fa-calendar"></i> ${scheduleLabel}</span>`;
    }

    const cardImages = normalizeArray(card.images);
    const thumbnailHtml = cardImages.length > 0 ? `<img src="${cardImages[0]}" alt="Preview da demanda" class="card-thumbnail">` : '';
    const workspaceTagHtml = activeWorkspaceId === '__all__' && (card.workspace_name || card.workspace_id)
        ? `<span class="label gray">${escapeHtml(card.workspace_name || card.workspace_id)}</span>`
        : '';

    cardEl.innerHTML = `
        ${(platformHtml || dateHtml || labelsHTML || workspaceTagHtml) ? `<div class="card-labels" style="display:flex; align-items:center; flex-wrap:wrap; gap:4px;">
            ${platformHtml}
            ${dateHtml}
            ${workspaceTagHtml ? `<div style="margin-left:4px;">${workspaceTagHtml}</div>` : ''}
            ${labelsHTML ? `<div style="margin-left:4px;">${labelsHTML}</div>` : ''}
        </div>` : ''}
        ${thumbnailHtml}
        <div class="card-title">${card.title}</div>
        <div class="card-footer">
            <div class="card-badges">
                ${card.parent_id ? `<span title="Vinculado a uma postagem" style="color: var(--primary); font-weight: bold;"><i class="fa-solid fa-link"></i> Arte</span>` : ''}
                ${card.comments > 0 ? `<span><i class="fa-regular fa-comment"></i> ${card.comments}</span>` : ''}
                ${card.attachments > 0 ? `<span><i class="fa-solid fa-paperclip"></i> ${card.attachments}</span>` : ''}
            </div>
        </div>
    `;

    // Drag Listeners
    cardEl.addEventListener('dragstart', handleDragStart);
    cardEl.addEventListener('dragend', handleDragEnd);
    cardEl.addEventListener('touchstart', handleTouchCardStart, { passive: true });
    cardEl.addEventListener('touchmove', handleTouchCardMove, { passive: false });
    cardEl.addEventListener('touchend', handleTouchCardEnd, { passive: false });
    cardEl.addEventListener('touchcancel', handleTouchCardCancel, { passive: true });
    
    // Click Listener for Modal
    cardEl.addEventListener('click', () => {
        if (suppressCardClickOnce) {
            suppressCardClickOnce = false;
            return;
        }
        openModal(card, colId);
    });

    return cardEl;
}

// --- Drag & Drop Logic --- //
let draggedCardId = null;
let sourceColId = null;
let touchDragState = null;

function moveCardToColumn(cardId, fromColId, targetColId) {
    if (!cardId || !fromColId || !targetColId || fromColId === targetColId) return;

    const sourceCol = boardState.columns.find(c => c.id === fromColId);
    const targetCol = boardState.columns.find(c => c.id === targetColId);
    if (!sourceCol || !targetCol) return;

    const cardIndex = sourceCol.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const [card] = sourceCol.cards.splice(cardIndex, 1);
    targetCol.cards.push(card);
    renderBoard();

    fetch('/api/board/move', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
            cardId,
            targetColId,
            newOrder: targetCol.cards.length,
            workspace_id: activeWorkspaceId
        })
    }).catch(err => console.error('Failed pushing move to DB', err));
}

function clearColumnHover() {
    document.querySelectorAll('.column-body').forEach(el => el.classList.remove('drag-over', 'touch-drop-target'));
}

function cleanupTouchDrag() {
    if (touchDragState?.pressTimer) clearTimeout(touchDragState.pressTimer);
    if (touchDragState?.ghost) touchDragState.ghost.remove();
    if (touchDragState?.sourceEl) touchDragState.sourceEl.classList.remove('touch-drag-source');
    clearColumnHover();
    touchDragState = null;
}

function beginTouchDrag(touch) {
    if (!touchDragState || touchDragState.dragging) return;
    touchDragState.dragging = true;
    const rect = touchDragState.sourceEl.getBoundingClientRect();
    const ghost = touchDragState.sourceEl.cloneNode(true);
    ghost.classList.add('mobile-drag-ghost');
    ghost.style.width = rect.width + 'px';
    ghost.style.left = rect.left + 'px';
    ghost.style.top = rect.top + 'px';
    document.body.appendChild(ghost);
    touchDragState.ghost = ghost;
    touchDragState.sourceEl.classList.add('touch-drag-source');
    updateTouchDragPosition(touch);
}

function updateTouchDragPosition(touch) {
    if (!touchDragState?.dragging || !touchDragState.ghost) return;
    touchDragState.ghost.style.left = (touch.clientX - touchDragState.offsetX) + 'px';
    touchDragState.ghost.style.top = (touch.clientY - touchDragState.offsetY) + 'px';

    clearColumnHover();
    const target = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.column-body');
    if (target) {
        target.classList.add('drag-over', 'touch-drop-target');
        touchDragState.targetColId = target.dataset.colId;
    } else {
        touchDragState.targetColId = null;
    }
}

function handleTouchCardStart(e) {
    if (window.innerWidth > 1024 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    touchDragState = {
        cardId: e.currentTarget.dataset.cardId,
        sourceColId: e.currentTarget.dataset.colId,
        sourceEl: e.currentTarget,
        startX: touch.clientX,
        startY: touch.clientY,
        offsetX: rect.width / 2,
        offsetY: 24,
        dragging: false,
        moved: false,
        targetColId: null,
        pressTimer: setTimeout(() => beginTouchDrag(touch), 220)
    };
}

function handleTouchCardMove(e) {
    if (!touchDragState || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchDragState.startX);
    const deltaY = Math.abs(touch.clientY - touchDragState.startY);

    if (!touchDragState.dragging && (deltaX > 8 || deltaY > 8)) {
        touchDragState.moved = true;
        clearTimeout(touchDragState.pressTimer);
        return;
    }

    if (touchDragState.dragging) {
        e.preventDefault();
        updateTouchDragPosition(touch);
    }
}

function handleTouchCardEnd(e) {
    if (!touchDragState) return;
    clearTimeout(touchDragState.pressTimer);

    if (touchDragState.dragging) {
        e.preventDefault();
        suppressCardClickOnce = true;
        moveCardToColumn(touchDragState.cardId, touchDragState.sourceColId, touchDragState.targetColId);
    }

    cleanupTouchDrag();
}

function handleTouchCardCancel() {
    cleanupTouchDrag();
}

function handleDragStart(e) {
    draggedCardId = e.currentTarget.dataset.cardId;
    sourceColId = e.currentTarget.dataset.colId;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires some data attached to drag
    e.dataTransfer.setData('text/plain', draggedCardId);
}

function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    clearColumnHover();
}

function handleDragOver(e) {
    e.preventDefault(); // allow drop
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    if(e.currentTarget.classList.contains('column-body')) {
        e.currentTarget.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    if(e.currentTarget.classList.contains('column-body')) {
        e.currentTarget.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    const targetColBody = e.currentTarget;
    targetColBody.classList.remove('drag-over');
    
    const targetColId = targetColBody.dataset.colId;
    moveCardToColumn(draggedCardId, sourceColId, targetColId);
}

// --- Modal Selection & Event Logic --- //

function injectModalsIfNeeded() {
    if (document.getElementById('card-modal')) return;

    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = `
        <!-- Card Detail Modal Overlay -->
        <div class="modal-overlay" id="card-modal">
            <div class="card-modal-content">
                <button class="close-modal"><i class="fa-solid fa-times"></i></button>
                <div class="modal-header">
                    <div class="modal-label">Na lista <strong id="modal-list-name">...</strong></div>
                    <h2 id="modal-title">Título do Card</h2>
                    <div id="modal-parent-link" style="margin-top: 8px; font-size: 13px;"></div>
                </div>
                
                <div class="modal-body-layout">
                    <div class="modal-main">
                        <div class="modal-section">
                            <h3><i class="fa-solid fa-pen-to-square"></i> Editar Card</h3>
                            <div style="display:flex; flex-direction:column; gap:16px; margin-top:16px;">
                                <div>
                                    <label style="display:block; margin-bottom:8px; color: var(--text-muted); font-weight:500; font-size:13px;">TÍTULO / PAUTA</label>
                                    <input type="text" id="edit-card-title" autocomplete="off" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-app); color: var(--text-main); font-family:var(--font); outline:none;">
                                </div>
                                <div>
                                    <label style="display:block; margin-bottom:8px; color: var(--text-muted); font-weight:500; font-size:13px;">REDE SOCIAL</label>
                                    <select id="edit-card-platform" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-app); color: var(--text-main); font-family:var(--font); outline:none;">
                                        <option value="">Nenhuma / Geral</option>
                                        <option value="instagram">Instagram</option>
                                        <option value="tiktok">TikTok</option>
                                        <option value="youtube">YouTube</option>
                                        <option value="facebook">Facebook</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="display:block; margin-bottom:8px; color: var(--text-muted); font-weight:500; font-size:13px;">DATA DO POST</label>
                                    <input type="date" id="edit-card-date" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-app); color: var(--text-main); font-family:var(--font); outline:none;">
                                </div>
                                <div>
                                    <label style="display:block; margin-bottom:8px; color: var(--text-muted); font-weight:500; font-size:13px;">HORÁRIO DO POST</label>
                                    <input type="time" id="edit-card-time" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-app); color: var(--text-main); font-family:var(--font); outline:none;">
                                </div>
                                <div>
                                    <label style="display:block; margin-bottom:8px; color: var(--text-muted); font-weight:500; font-size:13px;">RECORRÊNCIA</label>
                                    <div style="display:flex; gap:8px;">
                                        <select id="edit-card-recurrence" style="flex:1; padding: 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-app); color: var(--text-main); font-family:var(--font); outline:none;">
                                            <option value="none">Sem recorrência</option>
                                            <option value="weekly">Semanal</option>
                                            <option value="monthly">Mensal</option>
                                        </select>
                                        <button type="button" id="remove-recurrence-btn" title="Remover recorrência" style="padding:12px; border-radius:8px; border:1px solid var(--border); background:var(--bg-app); color:var(--text-main); cursor:pointer; display:none;">
                                            <i class="fa-solid fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label style="display:block; margin-bottom:8px; color: var(--text-muted); font-weight:500; font-size:13px;">DESCRIÇÃO</label>
                                    <textarea id="edit-card-description" class="desc-editor" placeholder="Detalhes da demanda, briefing e observacoes..."></textarea>
                                </div>
                            </div>
                        </div>
                        <div class="modal-section">
                            <h3><i class="fa-regular fa-user"></i> Membros</h3>
                            <div class="inline-form-row">
                                <input type="text" id="member-input" class="modal-text-input" placeholder="Email do membro" list="member-suggestions">
                                <datalist id="member-suggestions"></datalist>
                                <button type="button" class="sidebar-btn compact-btn" id="add-member-btn"><i class="fa-solid fa-plus"></i> Adicionar</button>
                            </div>
                            <div id="members-list" class="pill-list"></div>
                        </div>
                        <div class="modal-section">
                            <h3><i class="fa-solid fa-layer-group"></i> Contas / Collab</h3>
                            <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 12px;">Escolha em quais workspaces a demanda deve aparecer.</p>
                            <div id="edit-card-workspaces" class="workspace-selector"></div>
                        </div>
                        <div class="modal-section">
                            <h3><i class="fa-solid fa-tag"></i> Etiquetas</h3>
                            <div id="preset-labels-list" class="preset-labels-list"></div>
                            <div id="labels-editor" class="pill-list"></div>
                        </div>
                        <div class="modal-section">
                            <h3><i class="fa-solid fa-list-check"></i> Checklist</h3>
                            <div class="inline-form-row">
                                <input type="text" id="checklist-input" class="modal-text-input" placeholder="Novo item do checklist">
                                <button type="button" class="sidebar-btn compact-btn" id="add-checklist-btn"><i class="fa-solid fa-plus"></i> Adicionar</button>
                            </div>
                            <ul class="checklist-items" id="checklist-items"></ul>
                        </div>
                        <div class="modal-section">
                            <h3><i class="fa-regular fa-image"></i> Imagens da Demanda</h3>
                            <div class="inline-form-row">
                                <input type="file" id="image-input" class="modal-text-input" accept="image/*" multiple>
                            </div>
                            <div id="images-list" class="image-grid"></div>
                        </div>
                        <div class="modal-section">
                            <h3><i class="fa-solid fa-paperclip"></i> Arquivos Anexos</h3>
                            <div class="inline-form-row">
                                <input type="file" id="file-input" class="modal-text-input" multiple>
                            </div>
                            <div id="files-list" class="file-list"></div>
                        </div>
                        <div class="modal-section">
                            <h3><i class="fa-regular fa-comments"></i> Atividade</h3>
                            <div id="comments-list" class="comments-list"></div>
                            <div class="inline-form-row" style="margin-top:12px;">
                                <input type="text" id="comment-input" class="modal-text-input" placeholder="Escreva um comentario...">
                                <button type="button" class="sidebar-btn compact-btn" id="add-comment-btn"><i class="fa-solid fa-paper-plane"></i> Publicar</button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-sidebar">
                        <span class="sidebar-title">Ações</span>
                        <button class="sidebar-btn" id="save-card-btn"><i class="fa-solid fa-floppy-disk"></i> Salvar</button>
                        <button class="sidebar-btn" id="request-design-btn" style="background: #fbbf24; color: #78350f; display:none;"><i class="fa-solid fa-palette"></i> Solicitar Arte</button>
                        <div id="linked-design-info" style="margin-top: 8px; margin-bottom: 8px; font-size: 12px; padding: 10px; background: var(--bg-app); border-radius: 8px; border: 1px dashed var(--border); display:none;"></div>
                        <button class="sidebar-btn" id="remove-card-from-workspace-btn"><i class="fa-solid fa-layer-group"></i> Remover desta conta</button>
                        <button class="sidebar-btn" id="duplicate-card-btn"><i class="fa-solid fa-copy"></i> Duplicar</button>
                        <button class="sidebar-btn danger" id="delete-card-btn"><i class="fa-solid fa-trash"></i> Excluir</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal-overlay" id="column-modal">
            <div class="modal-box" style="width: 420px; max-width: 90%;">
                <button class="close-modal" id="close-column-modal"><i class="fa-solid fa-xmark"></i></button>
                <h2 style="margin-bottom: 20px; color: var(--text-main);">Editar Quadro</h2>
                <div style="margin-bottom: 20px;">
                    <label style="display:block; margin-bottom: 8px; color: var(--text-muted); font-weight: 500; font-size: 13px;">NOME DO QUADRO</label>
                    <input type="text" id="edit-column-title" class="modal-text-input" autocomplete="off">
                </div>
                <div id="column-reorder-actions" style="display:flex; gap:8px; margin-bottom:12px;">
                    <button id="move-column-left-btn" style="flex:1; padding: 10px; border-radius: 8px; background: var(--bg-surface); color: var(--text-main); border: 1px solid var(--border); font-weight: 600; cursor: pointer; transition: 0.2s; font-size: 13px;"><i class="fa-solid fa-arrow-left"></i> Esquerda</button>
                    <button id="move-column-right-btn" style="flex:1; padding: 10px; border-radius: 8px; background: var(--bg-surface); color: var(--text-main); border: 1px solid var(--border); font-weight: 600; cursor: pointer; transition: 0.2s; font-size: 13px;">Direita <i class="fa-solid fa-arrow-right"></i></button>
                </div>
                <button id="save-column-btn" style="width: 100%; padding: 14px; border-radius: 8px; background: var(--primary); color: white; border: none; font-weight: 600; cursor: pointer; transition: 0.2s; font-size: 14px;">Salvar Quadro</button>
                <button id="delete-column-btn" style="width: 100%; padding: 14px; border-radius: 8px; background: rgba(239, 68, 68, 0.12); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.18); font-weight: 600; cursor: pointer; transition: 0.2s; font-size: 14px; margin-top: 12px; display:none;">Excluir Quadro</button>
            </div>
        </div>

        <!-- FAB / Novo Card Modal se necessário -->
        <div class="modal-overlay" id="new-card-modal">
            <div class="modal-box" style="width: 400px; max-width: 90%;">
                <button class="close-modal" id="close-new-modal"><i class="fa-solid fa-xmark"></i></button>
                <h2 style="margin-bottom: 24px; color: var(--text-main);">Programar Conteúdo</h2>
                <div style="margin-bottom: 16px;">
                    <label style="display:block; margin-bottom: 8px; color: var(--text-muted); font-weight: 500; font-size: 13px;">TÍTULO / PAUTA</label>
                    <input type="text" id="nc-title" autocomplete="off" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-app); color: var(--text-main); font-family:var(--font); outline:none;">
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display:block; margin-bottom: 8px; color: var(--text-muted); font-weight: 500; font-size: 13px;">REDE SOCIAL</label>
                    <select id="nc-platform" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-app); color: var(--text-main); font-family:var(--font); outline:none;">
                        <option value="">Nenhuma / Geral</option>
                        <option value="instagram">Instagram</option>
                        <option value="tiktok">TikTok</option>
                        <option value="youtube">YouTube</option>
                        <option value="facebook">Facebook</option>
                    </select>
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display:block; margin-bottom: 8px; color: var(--text-muted); font-weight: 500; font-size: 13px;">DATA DO POST</label>
                    <input type="date" id="nc-date" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-app); color: var(--text-main); font-family:var(--font); outline:none;">
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display:block; margin-bottom: 8px; color: var(--text-muted); font-weight: 500; font-size: 13px;">HORÁRIO DO POST</label>
                    <input type="time" id="nc-time" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-app); color: var(--text-main); font-family:var(--font); outline:none;">
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display:block; margin-bottom: 8px; color: var(--text-muted); font-weight: 500; font-size: 13px;">RECORRÊNCIA</label>
                    <select id="nc-recurrence" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-app); color: var(--text-main); font-family:var(--font); outline:none;">
                        <option value="none">Sem recorrência</option>
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensal</option>
                    </select>
                </div>
                <div style="margin-bottom: 24px;">
                    <label style="display:block; margin-bottom: 8px; color: var(--text-muted); font-weight: 500; font-size: 13px;">ATRIBUIR PARA (MEU EMAIL)</label>
                    <input type="text" id="nc-assignee" placeholder="Deixe em branco ou email do membro" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-app); color: var(--text-main); font-family:var(--font); outline:none;">
                </div>
                <div style="margin-bottom: 24px;">
                    <label style="display:block; margin-bottom: 8px; color: var(--text-muted); font-weight: 500; font-size: 13px;">ONDE ESSA DEMANDA APARECE</label>
                    <div id="new-card-workspaces" class="workspace-selector"></div>
                </div>
                <button id="submit-new-card" style="width: 100%; padding: 14px; border-radius: 8px; background: var(--primary); color: white; border: none; font-weight: 600; cursor: pointer; transition: 0.2s; font-size: 14px;">Criar Cartão <i class="fa-solid fa-check" style="margin-left: 6px;"></i></button>
            </div>
        </div>

        <!-- FAB GLOBAL se necessário -->
        <button id="fab-global-create" style="position: fixed; bottom: 32px; right: 32px; width: 64px; height: 64px; border-radius: 32px; background: var(--primary); color: white; display: none; align-items: center; justify-content: center; font-size: 24px; border: none; cursor: pointer; box-shadow: 0 10px 25px rgba(79,70,229,0.4); z-index: 100; transition: 0.3s;"><i class="fa-solid fa-plus"></i></button>
    `;
    document.body.appendChild(modalContainer);

    // Re-attach listeners to ensure everything is bound
    reinitializeModalElements();
}

function normalizeArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch (e) {
            return [];
        }
    }
    return [];
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function readFilesAsDataUrls(fileList) {
    const files = Array.from(fileList || []);
    return Promise.all(files.map((file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    })));
}

function formatFilePayload(files, dataUrls) {
    return Array.from(files || []).map((file, index) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        data: dataUrls[index]
    }));
}

function renderMembersEditor() {
    if (!membersList || !activeCardData) return;
    membersList.innerHTML = activeCardData.members.length
        ? activeCardData.members.map((member, index) => `<span class="editor-pill">${escapeHtml(member)} <button type="button" data-member-index="${index}"><i class="fa-solid fa-xmark"></i></button></span>`).join('')
        : '<span style="color: var(--text-muted); font-size: 13px;">Nenhum membro vinculado.</span>';

    membersList.querySelectorAll('[data-member-index]').forEach((btn) => {
        btn.onclick = () => {
            activeCardData.members.splice(Number(btn.dataset.memberIndex), 1);
            renderMembersEditor();
        };
    });
}

function renderLabelsEditor() {
    if (!labelsEditor || !activeCardData) return;
    labelsEditor.innerHTML = activeCardData.labels.length
        ? activeCardData.labels.map((label, index) => `<span class="editor-pill"><span class="label ${escapeHtml(label.color || 'blue')}">${escapeHtml(label.text || '')}</span><button type="button" data-label-index="${index}"><i class="fa-solid fa-xmark"></i></button></span>`).join('')
        : '<span style="color: var(--text-muted); font-size: 13px;">Nenhuma etiqueta criada.</span>';

    labelsEditor.querySelectorAll('[data-label-index]').forEach((btn) => {
        btn.onclick = () => {
            activeCardData.labels.splice(Number(btn.dataset.labelIndex), 1);
            renderLabelsEditor();
        };
    });
}

function renderPresetLabels() {
    if (!presetLabelsList) return;
    presetLabelsList.innerHTML = labelPresets.length
        ? labelPresets.map((label) => `<button type="button" class="preset-label-chip ${label.color}" data-preset-label-id="${label.id}">${escapeHtml(label.name)}</button>`).join('')
        : '<span style="color: var(--text-muted); font-size: 13px;">Nenhuma etiqueta padrão cadastrada.</span>';

    presetLabelsList.querySelectorAll('[data-preset-label-id]').forEach((button) => {
        button.onclick = () => {
            if (!activeCardData) return;
            const preset = labelPresets.find((item) => String(item.id) === button.dataset.presetLabelId);
            if (!preset) return;
            const alreadyExists = activeCardData.labels.some((label) => label.text === preset.name && label.color === preset.color);
            if (alreadyExists) return;
            activeCardData.labels.push({ text: preset.name, color: preset.color });
            renderLabelsEditor();
        };
    });
}

function renderChecklistEditor() {
    if (!checklistItems || !activeCardData) return;
    checklistItems.innerHTML = activeCardData.checklist.length
        ? activeCardData.checklist.map((item, index) => `
            <li draggable="true" data-check-item-index="${index}">
                <span class="checklist-handle"><i class="fa-solid fa-grip-vertical"></i></span>
                <input type="checkbox" data-check-index="${index}" ${item.done ? 'checked' : ''}>
                <input type="text" class="checklist-edit-input" data-check-text-index="${index}" value="${escapeHtml(item.text || '')}">
                <button type="button" class="checklist-delete" data-check-delete="${index}"><i class="fa-solid fa-trash"></i></button>
            </li>
        `).join('')
        : '<li style="color: var(--text-muted);">Nenhum item no checklist.</li>';

    checklistItems.querySelectorAll('[data-check-index]').forEach((input) => {
        input.onchange = () => {
            activeCardData.checklist[Number(input.dataset.checkIndex)].done = input.checked;
        };
    });
    checklistItems.querySelectorAll('[data-check-text-index]').forEach((input) => {
        input.oninput = () => {
            activeCardData.checklist[Number(input.dataset.checkTextIndex)].text = input.value;
        };
    });
    checklistItems.querySelectorAll('[data-check-delete]').forEach((btn) => {
        btn.onclick = () => {
            activeCardData.checklist.splice(Number(btn.dataset.checkDelete), 1);
            renderChecklistEditor();
        };
    });
    checklistItems.querySelectorAll('[data-check-item-index]').forEach((itemEl) => {
        itemEl.addEventListener('dragstart', () => {
            draggedChecklistIndex = Number(itemEl.dataset.checkItemIndex);
            itemEl.classList.add('dragging');
        });
        itemEl.addEventListener('dragend', () => {
            itemEl.classList.remove('dragging');
            draggedChecklistIndex = null;
        });
        itemEl.addEventListener('dragover', (event) => {
            event.preventDefault();
        });
        itemEl.addEventListener('drop', (event) => {
            event.preventDefault();
            const targetIndex = Number(itemEl.dataset.checkItemIndex);
            if (draggedChecklistIndex === null || draggedChecklistIndex === targetIndex) return;
            const [movedItem] = activeCardData.checklist.splice(draggedChecklistIndex, 1);
            activeCardData.checklist.splice(targetIndex, 0, movedItem);
            renderChecklistEditor();
        });
    });
}

function renderCommentsEditor() {
    if (!commentsList || !activeCardData) return;
    commentsList.innerHTML = activeCardData.comments.length
        ? activeCardData.comments.map((comment, index) => `
            <div class="comment-item">
                <div class="comment-meta">
                    <span>${escapeHtml(comment.author || 'Sistema')}</span>
                    <span>${escapeHtml(comment.created_at || '')} <button type="button" class="comment-delete" data-comment-delete="${index}"><i class="fa-solid fa-trash"></i></button></span>
                </div>
                <div>${escapeHtml(comment.text || '')}</div>
            </div>
        `).join('')
        : '<div style="color: var(--text-muted); font-size: 13px;">Nenhum comentario ainda.</div>';

    commentsList.querySelectorAll('[data-comment-delete]').forEach((btn) => {
        btn.onclick = () => {
            activeCardData.comments.splice(Number(btn.dataset.commentDelete), 1);
            renderCommentsEditor();
        };
    });
}

function renderImagesEditor() {
    if (!imagesList || !activeCardData) return;
    imagesList.innerHTML = activeCardData.images.length
        ? activeCardData.images.map((imageSrc, index) => `
            <div class="image-card">
                <img src="${imageSrc}" alt="Imagem da demanda ${index + 1}">
                <button type="button" class="image-remove" data-image-index="${index}"><i class="fa-solid fa-trash"></i></button>
            </div>
        `).join('')
        : '<div style="color: var(--text-muted); font-size: 13px;">Nenhuma imagem anexada.</div>';

    imagesList.querySelectorAll('[data-image-index]').forEach((btn) => {
        btn.onclick = () => {
            activeCardData.images.splice(Number(btn.dataset.imageIndex), 1);
            renderImagesEditor();
        };
    });
}

function renderFilesEditor() {
    if (!filesList || !activeCardData) return;
    filesList.innerHTML = activeCardData.files.length
        ? activeCardData.files.map((file, index) => `
            <div class="file-item">
                <a class="file-link" href="${file.data}" download="${escapeHtml(file.name || 'anexo')}"><i class="fa-solid fa-paperclip"></i> ${escapeHtml(file.name || 'Arquivo')}</a>
                <button type="button" class="comment-delete" data-file-index="${index}"><i class="fa-solid fa-trash"></i></button>
            </div>
        `).join('')
        : '<div style="color: var(--text-muted); font-size: 13px;">Nenhum arquivo anexado.</div>';

    filesList.querySelectorAll('[data-file-index]').forEach((btn) => {
        btn.onclick = () => {
            activeCardData.files.splice(Number(btn.dataset.fileIndex), 1);
            renderFilesEditor();
        };
    });
}

function openModal(card, colId) {
    activeCardId = card.id;
    activeCardColId = colId;
    activeCardData = {
        ...card,
        workspace_id: card.workspace_id || activeWorkspaceId,
        labels: normalizeArray(card.labels),
        members: normalizeArray(card.members),
        checklist: normalizeArray(card.checklist),
        comments: normalizeArray(card.comments_data),
        images: normalizeArray(card.images),
        files: normalizeArray(card.files),
        visible_workspaces: Array.from(new Set([card.workspace_id || activeWorkspaceId, ...normalizeArray(card.visible_workspaces)]))
    };
    let colName = 'Demanda';
    if (colId) {
        const foundCol = boardState.columns.find(c => c.id === colId);
        if (foundCol) colName = foundCol.title;
        else if (card.column_name) colName = card.column_name;
    } else if (card.column_name) {
        colName = card.column_name;
    }

    if (document.getElementById('modal-list-name')) {
        document.getElementById('modal-list-name').innerText = colName;
    }
    if (document.getElementById('modal-title')) {
        document.getElementById('modal-title').innerText = card.title;
    }
    if (editTitleInput) editTitleInput.value = card.title || '';
    if (editDescriptionInput) editDescriptionInput.value = card.description || '';
    if (editPlatformInput) editPlatformInput.value = card.platform || '';
    if (editDateInput) editDateInput.value = card.post_date || '';
    if (editTimeInput) editTimeInput.value = card.post_time || '';
    if (editRecurrenceInput) {
        editRecurrenceInput.value = card.recurrence_type || 'none';
        const removeBtn = document.getElementById('remove-recurrence-btn');
        if (removeBtn) {
            removeBtn.style.display = (card.recurrence_type && card.recurrence_type !== 'none') ? 'block' : 'none';
        }
    }
    if (memberInput) memberInput.value = '';
    if (checklistInput) checklistInput.value = '';
    if (commentInput) commentInput.value = '';
    if (imageInput) imageInput.value = '';
    if (fileInput) fileInput.value = '';
    renderWorkspaceSelector('edit-card-workspaces', activeCardData.visible_workspaces);
    if (removeCardFromWorkspaceBtn) {
        removeCardFromWorkspaceBtn.style.display = activeCardData.visible_workspaces.length > 1 ? 'flex' : 'none';
    }
    loadMemberSuggestions();
    renderMembersEditor();
    renderPresetLabels();
    renderLabelsEditor();
    renderChecklistEditor();
    renderCommentsEditor();
    renderImagesEditor();
    renderFilesEditor();

    // Custom Sector Logic
    if (requestDesignBtn) {
        requestDesignBtn.style.display = (activeCategory === 'editorial') ? 'block' : 'none';
        requestDesignBtn.onclick = async () => {
            const originalText = requestDesignBtn.innerHTML;
            requestDesignBtn.disabled = true;
            requestDesignBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Solicitando...';
            try {
                const res = await fetch(`/api/cards/${card.id}/request-design?workspace=${activeWorkspaceId}`, {
                    method: 'POST',
                    headers: authHeaders
                });
                const data = await res.json();
                if (res.ok) {
                    alert('Pedido de arte criado com sucesso no setor de Design!');
                    modalOverlay.classList.remove('active');
                    loadStateFromServer();
                } else {
                    alert(data.error || 'Erro ao solicitar arte');
                }
            } catch (err) {
                console.error('Solicitar Arte error:', err);
                alert('Erro na requisição: ' + err.message);
            } finally {
                requestDesignBtn.disabled = false;
                requestDesignBtn.innerHTML = originalText;
            }
        };
    }

    const parentLinkEl = document.getElementById('modal-parent-link');
    if (parentLinkEl) {
        if (card.parent_id) {
            parentLinkEl.innerHTML = `<a href="#" onclick="event.preventDefault(); window.location.href='index.html?category=editorial&open=${card.parent_id}'" style="color: var(--primary); text-decoration: none;"><i class="fa-solid fa-link"></i> Ver Postagem Original</a>`;
            parentLinkEl.style.display = 'block';
        } else {
            parentLinkEl.style.display = 'none';
        }
    }

    modalOverlay.classList.add('active');
}

function openColumnModal(column = null) {
    activeColumnId = column ? column.id : null;
    if (editColumnTitleInput) editColumnTitleInput.value = column ? column.title : '';
    const titleEl = columnModal ? columnModal.querySelector('h2') : null;
    if (titleEl) titleEl.innerText = column ? 'Editar Quadro' : 'Novo Quadro';
    if (saveColumnBtn) saveColumnBtn.innerText = column ? 'Salvar Quadro' : 'Criar Quadro';
    if (deleteColumnBtn) {
        const role = localStorage.getItem('templum-auth-role');
        deleteColumnBtn.style.display = column && role === 'master' ? 'block' : 'none';
    }
    if (columnReorderActions) {
        columnReorderActions.style.display = column ? 'flex' : 'none';
    }
    if (columnModal) columnModal.classList.add('active');
}

async function moveColumn(id, direction) {
    console.log(`[FRONTEND] Move Column: ID=${id}, Direction=${direction}`);
    try {
        const response = await fetch(`/api/columns/${id}/move`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ direction })
        });
        const data = await response.json();
        console.log(`[FRONTEND] Move Response:`, data);
        if (!response.ok) throw new Error(data.error || 'Move failed');
        loadStateFromServer();
        if (columnModal) columnModal.classList.remove('active');
    } catch (err) {
        console.error(`[FRONTEND] Move Error:`, err);
        alert('Erro ao mover quadro: ' + err.message);
    }
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

window.openCardDetail = async (cardId) => {
    try {
        let found = null;
        if (boardState && boardState.columns) {
            boardState.columns.forEach(col => {
                const card = col.cards.find(c => c.id === cardId);
                if (card) found = { card, colId: col.id };
            });
        }

        if (found) {
            openModal(found.card, found.colId);
        } else {
            try {
                const ws = activeWorkspaceId || localStorage.getItem('templum-active-ws') || 'lagoinhaalphaville.sp';
                const res = await fetch(`/api/cards/${cardId}?workspace=${encodeURIComponent(ws)}`, { 
                    headers: getAuthHeaders() 
                });
                if (!res.ok) throw new Error('Card not found');
                const card = await res.json();
                openModal(card, card.column_id);
            } catch (err) {
                console.warn('Card not found in current boardState or API.');
                alert('Não foi possível carregar os detalhes desta demanda. Ela pode ter sido removida ou está em outra conta.');
            }
        }
    } catch(e) { console.error(e); }
};


// Re-attach event handlers after modal injection
function attachModalHandlers() {
    if (saveCardBtn) {
        saveCardBtn.onclick = async () => {
            console.log('Save button clicked', { saveCardBtn, editTitleInput });
            if (!activeCardId || !activeCardData) return;
            const title = editTitleInput ? editTitleInput.value.trim() : '';
            const description = editDescriptionInput ? editDescriptionInput.value.trim() : '';
            const platform = editPlatformInput ? editPlatformInput.value : '';
            const post_date = editDateInput ? editDateInput.value : '';
            const post_time = editTimeInput ? editTimeInput.value : '';
            const recurrence_type = editRecurrenceInput ? editRecurrenceInput.value : 'none';
            const assignee = activeCardData.members.length > 0 ? activeCardData.members[0] : '';
            const visible_workspaces = getSelectedWorkspaceIds('edit-card-workspaces');
            activeCardData.visible_workspaces = visible_workspaces;
            if (!title) return alert('Preencha o titulo do card.');
            const originalText = saveCardBtn.innerHTML;
            saveCardBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Salvando';
            try {
                const response = await fetch('/api/cards/' + activeCardId + '?workspace=' + encodeURIComponent(activeWorkspaceId), {
                    method: 'PUT',
                    headers: authHeaders,
                    body: JSON.stringify({ title, description, platform, post_date, post_time, recurrence_type, assignee, labels: activeCardData.labels, members: activeCardData.members, checklist: activeCardData.checklist, comments: activeCardData.comments, images: activeCardData.images, files: activeCardData.files, visible_workspaces, primary_workspace_id: activeCardData.workspace_id, category: activeCardData.category, parent_id: activeCardData.parent_id })
                });
                if (!response.ok) throw new Error('save failed');
                const activeColumn = boardState.columns.find(c => c.id === activeCardColId);
                const activeCard = activeColumn && activeColumn.cards.find(c => c.id === activeCardId);
                if (activeCard) {
                    activeCard.title = title; activeCard.description = description;
                    activeCard.platform = platform; activeCard.post_date = post_date;
                    activeCard.post_time = post_time; activeCard.recurrence_type = recurrence_type;
                    activeCard.assignee = assignee; activeCard.labels = activeCardData.labels;
                    activeCard.members = activeCardData.members; activeCard.checklist = activeCardData.checklist;
                    activeCard.comments_data = activeCardData.comments; activeCard.images = activeCardData.images;
                    activeCard.files = activeCardData.files; activeCard.visible_workspaces = visible_workspaces;
                    activeCard.comments = activeCardData.comments.length;
                    activeCard.attachments = activeCardData.images.length + activeCardData.files.length;
                }
                document.getElementById('modal-title').innerText = title;
                modalOverlay.classList.remove('active');
                loadStateFromServer();
            } catch (e) { alert('Erro ao salvar card'); }
            finally { saveCardBtn.innerHTML = originalText; }
        };
    }
    
    if (closeModalBtn) {
        closeModalBtn.onclick = () => modalOverlay.classList.remove('active');
    }
    
    if (deleteCardBtn) {
        deleteCardBtn.onclick = async () => {
            if (!activeCardId) return;
            if(confirm('Tem certeza que deseja excluir DEIFINITIVAMENTE este cartão do Banco de Dados?')) {
                try {
                    await fetch('/api/cards/' + activeCardId + '?workspace=' + encodeURIComponent(activeWorkspaceId), { method: 'DELETE', headers: authHeaders });
                    modalOverlay.classList.remove('active');
                    loadStateFromServer();
                } catch(e) { alert('Erro ao excluir card'); }
            }
        };
    }
    
    if (duplicateCardBtn) {
        duplicateCardBtn.onclick = async () => {
            if (!activeCardId || !confirm('Deseja duplicar esta demanda?')) return;
            const originalText = duplicateCardBtn.innerHTML;
            duplicateCardBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Duplicando';
            try {
                const res = await fetch('/api/cards/' + activeCardId + '?workspace=' + encodeURIComponent(activeWorkspaceId), { headers: authHeaders });
                const card = await res.json();
                delete card.id; delete card.created_at;
                card.title = card.title + ' (cópia)';
                card.category = card.category || 'editorial';
                await fetch('/api/cards?workspace=' + encodeURIComponent(activeWorkspaceId), { method: 'POST', headers: authHeaders, body: JSON.stringify(card) });
                modalOverlay.classList.remove('active');
                loadStateFromServer();
            } catch(e) { alert('Erro ao duplicar card'); }
            finally { duplicateCardBtn.innerHTML = originalText; }
        };
    }
    
    if (memberInput) {
        memberInput.addEventListener('input', () => {
            loadMemberSuggestions(memberInput.value.trim());
        });
    }

    if (addMemberBtn) {
        addMemberBtn.onclick = async () => {
            if (!activeCardData || !memberInput) return;
            const email = memberInput.value.trim().toLowerCase();
            if (!email) return;
            if (activeCardData.members.some(m => m.toLowerCase() === email)) return alert('Membro ja adicionado.');
            if (!(await isValidMemberEmail(email))) return alert('Usuario não encontrado no sistema.');
            activeCardData.members.push(email);
            memberInput.value = '';
            renderMembersEditor();
        };
    }

    if (addChecklistBtn) {
        addChecklistBtn.onclick = () => {
            if (!activeCardData || !checklistInput) return;
            const text = checklistInput.value.trim();
            if (!text) return;
            activeCardData.checklist.push({ text, done: false });
            checklistInput.value = '';
            renderChecklistEditor();
        };
    }

    if (addCommentBtn) {
        addCommentBtn.onclick = () => {
            if (!activeCardData || !commentInput) return;
            const text = commentInput.value.trim();
            if (!text) return;
            activeCardData.comments.push({ author: localStorage.getItem('templum-auth-user') || 'Usuario', text, created_at: new Date().toLocaleString('pt-BR') });
            commentInput.value = '';
            renderCommentsEditor();
        };
    }

    if (imageInput) {
        imageInput.onchange = async () => {
            if (!activeCardData) return;
            try {
                const loadedImages = await readFilesAsDataUrls(imageInput.files);
                activeCardData.images.push(...loadedImages);
                renderImagesEditor();
                imageInput.value = '';
            } catch (e) {
                alert('Erro ao carregar imagem');
            }
        };
    }

    if (fileInput) {
        fileInput.onchange = async () => {
            if (!activeCardData) return;
            try {
                const loadedFiles = await readFilesAsDataUrls(fileInput.files);
                activeCardData.files.push(...formatFilePayload(fileInput.files, loadedFiles));
                renderFilesEditor();
                fileInput.value = '';
            } catch (e) {
                alert('Erro ao carregar arquivo');
            }
        };
    }

    if (removeCardFromWorkspaceBtn) {
        removeCardFromWorkspaceBtn.onclick = async () => {
            if (!activeCardId || !activeCardData) return;
            if ((activeCardData.visible_workspaces || []).length <= 1) {
                return alert('Esse card so aparece nesta conta. Use excluir para apagar de vez.');
            }
            if (!confirm('Remover esta demanda apenas da conta atual? Ela continuara visivel nas outras contas selecionadas.')) return;

            try {
                const response = await fetch('/api/cards/' + activeCardId + '/remove-workspace?workspace=' + encodeURIComponent(activeWorkspaceId), {
                    method: 'POST',
                    headers: authHeaders
                });
                if (!response.ok) throw new Error('remove workspace failed');
                modalOverlay.classList.remove('active');
                loadStateFromServer();
            } catch (e) {
                alert('Erro ao remover card desta conta');
            }
        };
    }

    if (typeof removeRecurrenceBtn !== 'undefined' && removeRecurrenceBtn) {
        removeRecurrenceBtn.onclick = () => {
            if (!activeCardId || !activeCardData) return;
            if (!confirm('Remover a recorrência desta demanda? Os cards futuros já criados continuarão existindo.')) return;
            if (editRecurrenceInput) editRecurrenceInput.value = 'none';
            const removeBtn = document.getElementById('remove-recurrence-btn');
            if (removeBtn) removeBtn.style.display = 'none';
        };
    }

    // Column modal handlers
    if (document.getElementById('close-column-modal') && document.getElementById('column-modal')) {
        const closeColBtn = document.getElementById('close-column-modal');
        const colModalEl = document.getElementById('column-modal');
        closeColBtn.addEventListener('click', () => colModalEl.classList.remove('active'));
        colModalEl.addEventListener('click', (e) => { if (e.target === colModalEl) colModalEl.classList.remove('active'); });
    }
    
    // New card modal handlers
    if (document.getElementById('close-new-modal') && document.getElementById('new-card-modal')) {
        const closeNewBtn = document.getElementById('close-new-modal');
        const newCardModal = document.getElementById('new-card-modal');
        closeNewBtn.addEventListener('click', () => newCardModal.classList.remove('active'));
    }
    
    // Column (Quadro) handlers
    const saveColumnBtnEl = document.getElementById('save-column-btn');
    if (saveColumnBtnEl) {
        saveColumnBtnEl.onclick = async () => {
            const editColumnTitleInputEl = document.getElementById('edit-column-title');
            if (!editColumnTitleInputEl) return;
            const nextTitle = editColumnTitleInputEl.value.trim();
            if (!nextTitle) return alert('Preencha o nome do quadro.');
            const originalText = saveColumnBtnEl.innerHTML;
            saveColumnBtnEl.innerHTML = 'Salvando...';
            try {
                const isEditing = Boolean(activeColumnId);
                const response = await fetch(isEditing ? '/api/columns/' + activeColumnId : '/api/columns', {
                    method: isEditing ? 'PUT' : 'POST',
                    headers: authHeaders,
                    body: JSON.stringify({ title: nextTitle })
                });
                if (!response.ok) throw new Error('column update failed');
                const data = await response.json().catch(() => ({}));
                if (isEditing) {
                    const column = boardState.columns.find((item) => item.id === activeColumnId);
                    if (column) column.title = nextTitle;
                } else if (data.id) {
                    boardState.columns.push({ id: data.id, title: data.title || nextTitle, col_order: data.col_order || (boardState.columns.length + 1), cards: [] });
                    boardState.columns.sort((a, b) => (a.col_order || 0) - (b.col_order || 0));
                }
                const columnModalEl = document.getElementById('column-modal');
                if (columnModalEl) columnModalEl.classList.remove('active');
                renderBoard();
            } catch (err) {
                alert('Nao foi possivel editar esse quadro.');
            } finally {
                saveColumnBtnEl.innerHTML = originalText;
            }
        };
    }
    
    const deleteColumnBtnEl = document.getElementById('delete-column-btn');
    if (deleteColumnBtnEl) {
        deleteColumnBtnEl.onclick = async () => {
            if (!activeColumnId) return;
            if (!confirm('Excluir este quadro? Ele precisa estar vazio para ser removido.')) return;
            const originalText = deleteColumnBtnEl.innerHTML;
            deleteColumnBtnEl.innerHTML = 'Excluindo...';
            try {
                const response = await fetch('/api/columns/' + activeColumnId, { method: 'DELETE', headers: authHeaders });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(data.error || 'delete failed');
                boardState.columns = boardState.columns.filter((item) => item.id !== activeColumnId);
                const columnModalEl = document.getElementById('column-modal');
                if (columnModalEl) columnModalEl.classList.remove('active');
                renderBoard();
            } catch (err) {
                alert(err.message || 'Nao foi possivel excluir esse quadro.');
            } finally {
                deleteColumnBtnEl.innerHTML = originalText;
            }
        };
    }
    
    const createColumnBtnEl = document.getElementById('create-column-btn');
    if (createColumnBtnEl) {
        createColumnBtnEl.onclick = () => openColumnModal(null);
    }
    
    const moveColumnLeftBtnEl = document.getElementById('move-column-left-btn');
    if (moveColumnLeftBtnEl) {
        moveColumnLeftBtnEl.onclick = () => { if (activeColumnId) moveColumn(activeColumnId, 'left'); };
    }
    
    const moveColumnRightBtnEl = document.getElementById('move-column-right-btn');
    if (moveColumnRightBtnEl) {
        moveColumnRightBtnEl.onclick = () => { if (activeColumnId) moveColumn(activeColumnId, 'right'); };
    }
}

// --- GLOBAL INITIALIZATION ---
// Ensure modals are injected first so that subsequent initializations
// can find and bind to their DOM elements.
injectModalsIfNeeded();
initTheme();
attachModalHandlers();
initWorkspaces();
initMobileMenu();
