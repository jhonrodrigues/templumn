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
                newOrder: targetCol.cards.length // roughly the end of the new list
            })
        }).catch(err => console.error('Failed pushing move to DB', err));
    }
}

// --- Modal Logic --- //
let activeCardId = null;

function openModal(card, colId) {
    activeCardId = card.id;
    const colName = boardState.columns.find(c => c.id === colId).title;
    document.getElementById('modal-list-name').innerText = colName;
    document.getElementById('modal-title').innerText = card.title;
    modalOverlay.classList.add('active');
}

const delBtn = document.getElementById('delete-card-btn');
if (delBtn) {
    delBtn.onclick = async () => {
        if (!activeCardId) return;
        if(confirm('Tem certeza que deseja excluir DEIFINITIVAMENTE este cartão do Banco de Dados?')) {
            try {
                await fetch('/api/cards/' + activeCardId, { method: 'DELETE', headers: authHeaders });
                modalOverlay.classList.remove('active');
                loadStateFromServer();
            } catch(e) {
                alert('Erro ao excluir card');
            }
        }
    };
}

closeModalBtn.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
});

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        modalOverlay.classList.remove('active');
    }
});


// --- Theme Toggle Logic --- //
function initTheme() {
    const savedTheme = localStorage.getItem('templum-theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
}

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

// Initialization is now managed by async loadStateFromServer()
initTheme();
