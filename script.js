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

// State Object to track the dynamic state
let boardState = { columns: [] };
let activeWorkspaceId = localStorage.getItem('templum-active-ws') || 'lagoinhaalphaville.sp';
let activeCardData = null;
let availableWorkspaces = [];
let labelPresets = [];
let suppressCardClickOnce = false;

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
            const dynamicTitle = document.getElementById('dyn-board-title');
            if (dynamicTitle) dynamicTitle.innerText = activeWorkspaceId === '__all__' ? 'Todas as contas' : (wss.find(w => w.id === activeWorkspaceId)?.name || 'Board');
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
initWorkspaces();
initMobileMenu();

async function loadStateFromServer() {
    const boardCanvas = document.getElementById('board-canvas');
    if (!boardCanvas) return; // Not on the Kanban page
    
    try {
        const response = await fetch('/api/board?workspace=' + activeWorkspaceId, { headers: getAuthHeaders() });
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
    document.getElementById('nc-date').value = '';
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
        datalist.innerHTML = users.map((user) => `<option value="${user.email}"></option>`).join('');
    } catch (err) {
        console.error('Member suggestions error', err);
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
    } catch(err) {
        console.error('Sem conexao, mantendo cor original.');
    }
}
initBranding();
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
const boardCanvas = document.getElementById('board-canvas');
const themeToggleBtn = document.getElementById('theme-toggle');
const modalOverlay = document.getElementById('card-modal');
const closeModalBtn = document.querySelector('.close-modal');
const notificationsBtn = document.getElementById('notifications-btn');
const notificationsPanel = document.getElementById('notifications-panel');

// --- Render Logic --- //

function renderBoard() {
    boardCanvas.innerHTML = '';
    
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
                activeColumnId = column.id;
                if (editColumnTitleInput) editColumnTitleInput.value = column.title;
                if (columnModal) columnModal.classList.add('active');
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
                const aField = document.getElementById('nc-assignee');
                const assignee = aField ? aField.value : '';
                const visible_workspaces = getSelectedWorkspaceIds('new-card-workspaces');
                
                if (!title || title.trim() === '') return alert('Preencha a pauta!');
                
                document.getElementById('submit-new-card').innerHTML = 'Gravando...';
                try {
                    await fetch('/api/cards', {
                        method: 'POST',
                        headers: authHeaders,
                        body: JSON.stringify({ title, column_id: column.id, platform, post_date, workspace_id: activeWorkspaceId, assignee, visible_workspaces, images: [] })
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
        
        boardCanvas.appendChild(colEl);
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
            const assignee = aField ? aField.value : '';
            const visible_workspaces = getSelectedWorkspaceIds('new-card-workspaces');
            
            if (!title || title.trim() === '') return alert('Preencha a pauta!');
            
            document.getElementById('submit-new-card').innerHTML = 'Gravando...';
            try {
                await fetch('/api/cards', {
                    method: 'POST',
                    headers: authHeaders,
                    body: JSON.stringify({ title, column_id: colId, platform, post_date, workspace_id: activeWorkspaceId, assignee, visible_workspaces, images: [] })
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
        const spl = card.post_date.split('-');
        if(spl.length === 3) dateHtml = `<span style="font-size: 11px; margin-left: 8px; color: var(--text-main); font-weight: 600;"><i class="fa-regular fa-calendar"></i> ${spl[2]}/${spl[1]}</span>`;
    }

    const cardImages = normalizeArray(card.images);
    const thumbnailHtml = cardImages.length > 0 ? `<img src="${cardImages[0]}" alt="Preview da demanda" class="card-thumbnail">` : '';

    cardEl.innerHTML = `
        ${(platformHtml || dateHtml || labelsHTML) ? `<div class="card-labels" style="display:flex; align-items:center; flex-wrap:wrap; gap:4px;">
            ${platformHtml}
            ${dateHtml}
            ${labelsHTML ? `<div style="margin-left:4px;">${labelsHTML}</div>` : ''}
        </div>` : ''}
        ${thumbnailHtml}
        <div class="card-title">${card.title}</div>
        <div class="card-footer">
            <div class="card-badges">
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

// --- Modal Logic --- //
let activeCardId = null;
let activeCardColId = null;
let draggedChecklistIndex = null;
let activeColumnId = null;

const editTitleInput = document.getElementById('edit-card-title');
const editDescriptionInput = document.getElementById('edit-card-description');
const editPlatformInput = document.getElementById('edit-card-platform');
const editDateInput = document.getElementById('edit-card-date');
const saveCardBtn = document.getElementById('save-card-btn');
const memberInput = document.getElementById('member-input');
const membersList = document.getElementById('members-list');
const addMemberBtn = document.getElementById('add-member-btn');
const labelInput = document.getElementById('label-input');
const labelColorInput = document.getElementById('label-color');
const labelsEditor = document.getElementById('labels-editor');
const presetLabelsList = document.getElementById('preset-labels-list');
const addLabelBtn = document.getElementById('add-label-btn');
const checklistInput = document.getElementById('checklist-input');
const checklistItems = document.getElementById('checklist-items');
const addChecklistBtn = document.getElementById('add-checklist-btn');
const commentInput = document.getElementById('comment-input');
const commentsList = document.getElementById('comments-list');
const addCommentBtn = document.getElementById('add-comment-btn');
const imageInput = document.getElementById('image-input');
const imagesList = document.getElementById('images-list');
const fileInput = document.getElementById('file-input');
const filesList = document.getElementById('files-list');
const removeCardFromWorkspaceBtn = document.getElementById('remove-card-from-workspace-btn');
const columnModal = document.getElementById('column-modal');
const closeColumnModalBtn = document.getElementById('close-column-modal');
const editColumnTitleInput = document.getElementById('edit-column-title');
const saveColumnBtn = document.getElementById('save-column-btn');

function normalizeArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch {
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
    const colName = boardState.columns.find(c => c.id === colId).title;
    document.getElementById('modal-list-name').innerText = colName;
    document.getElementById('modal-title').innerText = card.title;
    if (editTitleInput) editTitleInput.value = card.title || '';
    if (editDescriptionInput) editDescriptionInput.value = card.description || '';
    if (editPlatformInput) editPlatformInput.value = card.platform || '';
    if (editDateInput) editDateInput.value = card.post_date || '';
    if (memberInput) memberInput.value = '';
    if (labelInput) labelInput.value = '';
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
    modalOverlay.classList.add('active');
}

if (addMemberBtn) {
    addMemberBtn.onclick = () => {
        if (!activeCardData || !memberInput) return;
        const member = memberInput.value.trim();
        if (!member) return;
        if (activeCardData.members.includes(member)) {
            memberInput.value = '';
            return;
        }
        activeCardData.members.push(member);
        memberInput.value = '';
        renderMembersEditor();
    };
}

if (memberInput) {
    memberInput.addEventListener('input', () => {
        loadMemberSuggestions(memberInput.value.trim());
    });
}

if (addLabelBtn) {
    addLabelBtn.onclick = () => {
        if (!activeCardData || !labelInput || !labelColorInput) return;
        const text = labelInput.value.trim();
        if (!text) return;
        activeCardData.labels.push({ text, color: labelColorInput.value || 'blue' });
        labelInput.value = '';
        renderLabelsEditor();
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

if (saveColumnBtn) {
    saveColumnBtn.onclick = async () => {
        if (!activeColumnId || !editColumnTitleInput) return;
        const nextTitle = editColumnTitleInput.value.trim();
        if (!nextTitle) return alert('Preencha o nome do quadro.');

        const originalText = saveColumnBtn.innerHTML;
        saveColumnBtn.innerHTML = 'Salvando...';
        try {
            const response = await fetch('/api/columns/' + activeColumnId, {
                method: 'PUT',
                headers: authHeaders,
                body: JSON.stringify({ title: nextTitle })
            });
            if (!response.ok) throw new Error('column update failed');

            const column = boardState.columns.find((item) => item.id === activeColumnId);
            if (column) column.title = nextTitle;
            if (columnModal) columnModal.classList.remove('active');
            renderBoard();
        } catch (err) {
            alert('Nao foi possivel editar esse quadro.');
        } finally {
            saveColumnBtn.innerHTML = originalText;
        }
    };
}

if (closeColumnModalBtn && columnModal) {
    closeColumnModalBtn.onclick = () => {
        columnModal.classList.remove('active');
    };
    columnModal.addEventListener('click', (event) => {
        if (event.target === columnModal) {
            columnModal.classList.remove('active');
        }
    });
}

if (saveCardBtn) {
    saveCardBtn.onclick = async () => {
        if (!activeCardId || !activeCardData) return;
        const title = editTitleInput ? editTitleInput.value.trim() : '';
        const description = editDescriptionInput ? editDescriptionInput.value.trim() : '';
        const platform = editPlatformInput ? editPlatformInput.value : '';
        const post_date = editDateInput ? editDateInput.value : '';
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
                body: JSON.stringify({ title, description, platform, post_date, assignee, labels: activeCardData.labels, members: activeCardData.members, checklist: activeCardData.checklist, comments: activeCardData.comments, images: activeCardData.images, files: activeCardData.files, visible_workspaces, primary_workspace_id: activeCardData.workspace_id })
            });

            if (!response.ok) throw new Error('save failed');

            const activeColumn = boardState.columns.find(c => c.id === activeCardColId);
            const activeCard = activeColumn && activeColumn.cards.find(c => c.id === activeCardId);
            if (activeCard) {
                activeCard.title = title;
                activeCard.description = description;
                activeCard.platform = platform;
                activeCard.post_date = post_date;
                activeCard.assignee = assignee;
                activeCard.labels = activeCardData.labels;
                activeCard.members = activeCardData.members;
                activeCard.checklist = activeCardData.checklist;
                activeCard.comments_data = activeCardData.comments;
                activeCard.images = activeCardData.images;
                activeCard.files = activeCardData.files;
                activeCard.visible_workspaces = visible_workspaces;
                activeCard.comments = activeCardData.comments.length;
                activeCard.attachments = activeCardData.images.length + activeCardData.files.length;
            }

            document.getElementById('modal-title').innerText = title;
            modalOverlay.classList.remove('active');
            loadStateFromServer();
        } catch (e) {
            alert('Erro ao salvar card');
        } finally {
            saveCardBtn.innerHTML = originalText;
        }
    };
}

const delBtn = document.getElementById('delete-card-btn');
if (delBtn) {
    delBtn.onclick = async () => {
        if (!activeCardId) return;
        if(confirm('Tem certeza que deseja excluir DEIFINITIVAMENTE este cartão do Banco de Dados?')) {
            try {
                await fetch('/api/cards/' + activeCardId + '?workspace=' + encodeURIComponent(activeWorkspaceId), { method: 'DELETE', headers: authHeaders });
                modalOverlay.classList.remove('active');
                loadStateFromServer();
            } catch(e) {
                alert('Erro ao excluir card');
            }
        }
    };
}

if (closeModalBtn && modalOverlay) {
    closeModalBtn.addEventListener('click', () => {
        modalOverlay.classList.remove('active');
    });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.classList.remove('active');
        }
    });
}


// --- Theme Toggle Logic --- //
function initTheme() {
    const savedTheme = localStorage.getItem('templum-theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        document.documentElement.removeAttribute('data-theme');
        if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
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

// Initialization is now managed by async loadStateFromServer()
initTheme();
