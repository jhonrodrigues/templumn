// ===================================================
// js/board.js — Kanban Board Rendering & Drag/Drop
// Depends on: state.js, utils.js, api.js, ui.js
// ===================================================

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
function initFAB() {
    const fabBtn = document.getElementById('fab-global-create');
    if (fabBtn) {
        fabBtn.onclick = () => {
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
                ${card.design_column_id ? `<span title="Enviado para Design" style="color: #f59e0b; font-weight: bold;"><i class="fa-solid fa-palette"></i> Design</span>` : ''}
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
            workspace_id: activeWorkspaceId,
            category: activeCategory
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
    e.dataTransfer.setData('text/plain', draggedCardId);
}

function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    clearColumnHover();
}

function handleDragOver(e) {
    e.preventDefault();
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
