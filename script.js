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

async function initWorkspaces() {
    try {
        const res = await fetch('/api/workspaces', { headers: getAuthHeaders() });
        const wss = await res.json();
        const sw = document.getElementById('ws-switcher');
        if(sw) {
            sw.innerHTML = '';
            wss.forEach(w => {
                const opt = document.createElement('option');
                opt.value = w.id;
                opt.innerText = w.name;
                if(w.id === activeWorkspaceId) opt.selected = true;
                sw.appendChild(opt);
            });
            document.getElementById('dyn-board-title').innerText = wss.find(w => w.id === activeWorkspaceId)?.name || 'Board';
            sw.onchange = (e) => {
                activeWorkspaceId = e.target.value;
                localStorage.setItem('templum-active-ws', activeWorkspaceId);
                document.getElementById('dyn-board-title').innerText = e.target.options[e.target.selectedIndex].text;
                loadStateFromServer();
            };
        }
        
        const sideWs = document.getElementById('sidebar-ws-list');
        if(sideWs) {
            sideWs.innerHTML = '';
            wss.forEach(w => {
                 const li = document.createElement('li');
                 const isActive = (w.id === activeWorkspaceId && (window.location.pathname === '/' || window.location.pathname.includes('index.html')));
                 li.style.cursor = 'pointer';
                 if(isActive) li.style.background = 'rgba(79, 70, 229, 0.1)';
                 if(isActive) li.style.color = 'var(--primary)';
                 if(isActive) li.style.fontWeight = '600';
                 if(isActive) li.style.borderRadius = '8px';
                 
                 li.innerHTML = `<i class="fa-solid fa-layer-group"></i> ${w.name}`;
                 li.onclick = () => {
                     localStorage.setItem('templum-active-ws', w.id);
                     window.location.href = '/index.html';
                 };
                 sideWs.appendChild(li);
            });
        }
    } catch(err) { console.error('WS Load Error', err) }
}
initWorkspaces();

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

// Reference to DOM elements
const boardCanvas = document.getElementById('board-canvas');
const themeToggleBtn = document.getElementById('theme-toggle');
const modalOverlay = document.getElementById('card-modal');
const closeModalBtn = document.querySelector('.close-modal');

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
            <button><i class="fa-solid fa-ellipsis"></i></button>
        `;
        
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
            document.getElementById('nc-title').value = '';
            document.getElementById('nc-date').value = '';
            document.getElementById('nc-platform').value = '';
            
            document.getElementById('submit-new-card').onclick = async () => {
                const title = document.getElementById('nc-title').value;
                const platform = document.getElementById('nc-platform').value;
                const post_date = document.getElementById('nc-date').value;
                const aField = document.getElementById('nc-assignee');
                const assignee = aField ? aField.value : '';
                
                if (!title || title.trim() === '') return alert('Preencha a pauta!');
                
                document.getElementById('submit-new-card').innerHTML = 'Gravando...';
                try {
                    await fetch('/api/cards', {
                        method: 'POST',
                        headers: authHeaders,
                        body: JSON.stringify({ title, column_id: column.id, platform, post_date, workspace_id: activeWorkspaceId, assignee })
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
        document.getElementById('nc-title').value = '';
        document.getElementById('nc-date').value = '';
        document.getElementById('nc-platform').value = '';
        const aField = document.getElementById('nc-assignee');
        if(aField) aField.value = '';
        
        document.getElementById('submit-new-card').onclick = async () => {
            const title = document.getElementById('nc-title').value;
            const platform = document.getElementById('nc-platform').value;
            const post_date = document.getElementById('nc-date').value;
            const assignee = aField ? aField.value : '';
            
            if (!title || title.trim() === '') return alert('Preencha a pauta!');
            
            document.getElementById('submit-new-card').innerHTML = 'Gravando...';
            try {
                await fetch('/api/cards', {
                    method: 'POST',
                    headers: authHeaders,
                    body: JSON.stringify({ title, column_id: colId, platform, post_date, workspace_id: activeWorkspaceId, assignee })
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

    cardEl.innerHTML = `
        ${(platformHtml || dateHtml || labelsHTML) ? `<div class="card-labels" style="display:flex; align-items:center; flex-wrap:wrap; gap:4px;">
            ${platformHtml}
            ${dateHtml}
            ${labelsHTML ? `<div style="margin-left:4px;">${labelsHTML}</div>` : ''}
        </div>` : ''}
        <div class="card-title">${card.title}</div>
        <div class="card-footer">
            <div class="card-badges">
                ${card.comments > 0 ? `<span><i class="fa-regular fa-comment"></i> ${card.comments}</span>` : ''}
                ${card.attachments > 0 ? `<span><i class="fa-solid fa-paperclip"></i> ${card.attachments}</span>` : ''}
            </div>
            <img src="https://ui-avatars.com/api/?name=User&background=random" class="avatar-sm" style="width: 24px; height: 24px;">
        </div>
    `;

    // Drag Listeners
    cardEl.addEventListener('dragstart', handleDragStart);
    cardEl.addEventListener('dragend', handleDragEnd);
    
    // Click Listener for Modal
    cardEl.addEventListener('click', () => openModal(card, colId));

    return cardEl;
}

// --- Drag & Drop Logic --- //
let draggedCardId = null;
let sourceColId = null;

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
    // Remove hover effects on all columns
    document.querySelectorAll('.column-body').forEach(el => el.classList.remove('drag-over'));
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
    
    if (sourceColId === targetColId) return; // Dropped in the same column
    
    // Find Card Object
    const sourceCol = boardState.columns.find(c => c.id === sourceColId);
    const targetCol = boardState.columns.find(c => c.id === targetColId);
    
    const cardIndex = sourceCol.cards.findIndex(c => c.id === draggedCardId);
    if (cardIndex > -1) {
        const [card] = sourceCol.cards.splice(cardIndex, 1);
        targetCol.cards.push(card);
        renderBoard(); // re-render to reflect state map
        
        // Notify PostgreSQL Engine Asynchronously
        fetch('/api/board/move', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                cardId: draggedCardId,
                targetColId: targetColId,
                newOrder: targetCol.cards.length, // roughly the end of the new list
                workspace_id: activeWorkspaceId
            })
        }).catch(err => console.error('Failed pushing move to DB', err));
    }
}

// --- Modal Logic --- //
let activeCardId = null;
let activeCardColId = null;

const editTitleInput = document.getElementById('edit-card-title');
const editDescriptionInput = document.getElementById('edit-card-description');
const editPlatformInput = document.getElementById('edit-card-platform');
const editDateInput = document.getElementById('edit-card-date');
const editAssigneeInput = document.getElementById('edit-card-assignee');
const saveCardBtn = document.getElementById('save-card-btn');
const memberInput = document.getElementById('member-input');
const membersList = document.getElementById('members-list');
const addMemberBtn = document.getElementById('add-member-btn');
const labelInput = document.getElementById('label-input');
const labelColorInput = document.getElementById('label-color');
const labelsEditor = document.getElementById('labels-editor');
const addLabelBtn = document.getElementById('add-label-btn');
const checklistInput = document.getElementById('checklist-input');
const checklistItems = document.getElementById('checklist-items');
const addChecklistBtn = document.getElementById('add-checklist-btn');
const commentInput = document.getElementById('comment-input');
const commentsList = document.getElementById('comments-list');
const addCommentBtn = document.getElementById('add-comment-btn');

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

function renderChecklistEditor() {
    if (!checklistItems || !activeCardData) return;
    checklistItems.innerHTML = activeCardData.checklist.length
        ? activeCardData.checklist.map((item, index) => `
            <li>
                <input type="checkbox" data-check-index="${index}" ${item.done ? 'checked' : ''}>
                <span>${escapeHtml(item.text || '')}</span>
                <button type="button" class="checklist-delete" data-check-delete="${index}"><i class="fa-solid fa-trash"></i></button>
            </li>
        `).join('')
        : '<li style="color: var(--text-muted);">Nenhum item no checklist.</li>';

    checklistItems.querySelectorAll('[data-check-index]').forEach((input) => {
        input.onchange = () => {
            activeCardData.checklist[Number(input.dataset.checkIndex)].done = input.checked;
        };
    });
    checklistItems.querySelectorAll('[data-check-delete]').forEach((btn) => {
        btn.onclick = () => {
            activeCardData.checklist.splice(Number(btn.dataset.checkDelete), 1);
            renderChecklistEditor();
        };
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

function openModal(card, colId) {
    activeCardId = card.id;
    activeCardColId = colId;
    activeCardData = {
        ...card,
        labels: normalizeArray(card.labels),
        members: normalizeArray(card.members),
        checklist: normalizeArray(card.checklist),
        comments: normalizeArray(card.comments_data)
    };
    const colName = boardState.columns.find(c => c.id === colId).title;
    document.getElementById('modal-list-name').innerText = colName;
    document.getElementById('modal-title').innerText = card.title;
    if (editTitleInput) editTitleInput.value = card.title || '';
    if (editDescriptionInput) editDescriptionInput.value = card.description || '';
    if (editPlatformInput) editPlatformInput.value = card.platform || '';
    if (editDateInput) editDateInput.value = card.post_date || '';
    if (editAssigneeInput) editAssigneeInput.value = card.assignee || '';
    if (memberInput) memberInput.value = '';
    if (labelInput) labelInput.value = '';
    if (checklistInput) checklistInput.value = '';
    if (commentInput) commentInput.value = '';
    renderMembersEditor();
    renderLabelsEditor();
    renderChecklistEditor();
    renderCommentsEditor();
    modalOverlay.classList.add('active');
}

if (addMemberBtn) {
    addMemberBtn.onclick = () => {
        if (!activeCardData || !memberInput) return;
        const member = memberInput.value.trim();
        if (!member) return;
        activeCardData.members.push(member);
        memberInput.value = '';
        renderMembersEditor();
    };
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

if (saveCardBtn) {
    saveCardBtn.onclick = async () => {
        if (!activeCardId || !activeCardData) return;
        const title = editTitleInput ? editTitleInput.value.trim() : '';
        const description = editDescriptionInput ? editDescriptionInput.value.trim() : '';
        const platform = editPlatformInput ? editPlatformInput.value : '';
        const post_date = editDateInput ? editDateInput.value : '';
        const assignee = editAssigneeInput ? editAssigneeInput.value.trim() : '';

        if (!title) return alert('Preencha o titulo do card.');

        const originalText = saveCardBtn.innerHTML;
        saveCardBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Salvando';

        try {
            const response = await fetch('/api/cards/' + activeCardId + '?workspace=' + encodeURIComponent(activeWorkspaceId), {
                method: 'PUT',
                headers: authHeaders,
                body: JSON.stringify({ title, description, platform, post_date, assignee, labels: activeCardData.labels, members: activeCardData.members, checklist: activeCardData.checklist, comments: activeCardData.comments })
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
                activeCard.comments = activeCardData.comments.length;
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

// Initialization is now managed by async loadStateFromServer()
initTheme();
