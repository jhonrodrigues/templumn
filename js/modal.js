// ===================================================
// js/modal.js — Modal Injection, Editors & Event Handlers
// Depends on: state.js, utils.js, api.js, ui.js, board.js
// ===================================================

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
    editDemandTypeInput = document.getElementById('edit-card-demand-type');
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
    requestMediaBtn = document.getElementById('request-media-btn');
    linkedDesignInfo = document.getElementById('linked-design-info');
    linkedMediaInfo = document.getElementById('linked-media-info');
}

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
                                <div>
                                    <label style="display:block; margin-bottom:8px; color: var(--text-muted); font-weight:500; font-size:13px;">TIPO DA DEMANDA</label>
                                    <select id="edit-card-demand-type" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-app); color: var(--text-main); font-family:var(--font); outline:none;">
                                        <option value="">Selecione o tipo (opcional)</option>
                                    </select>
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
                        <button class="sidebar-btn" id="request-media-btn" style="background: #8b5cf6; color: white; display:none;"><i class="fa-solid fa-video"></i> Solicitar Vídeo/Foto</button>
                        <div id="linked-design-info" style="margin-top: 8px; margin-bottom: 8px; font-size: 12px; padding: 10px; background: var(--bg-app); border-radius: 8px; border: 1px dashed var(--border); display:none;"></div>
                        <div id="linked-media-info" style="margin-top: 8px; margin-bottom: 8px; font-size: 12px; padding: 10px; background: var(--bg-app); border-radius: 8px; border: 1px dashed var(--border); display:none;"></div>
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
                    <label style="display:block; margin-bottom: 8px; color: var(--text-muted); font-weight: 500; font-size: 13px;">ATRIBUIR PARA (NOME OU EMAIL)</label>
                    <input type="text" id="nc-assignee" placeholder="Digite o nome ou email do membro" list="assignee-suggestions" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-app); color: var(--text-main); font-family:var(--font); outline:none;">
                    <datalist id="assignee-suggestions"></datalist>
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display:block; margin-bottom: 8px; color: var(--text-muted); font-weight: 500; font-size: 13px;">TIPO DA DEMANDA</label>
                    <select id="nc-demand-type" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-app); color: var(--text-main); font-family:var(--font); outline:none;">
                        <option value="">Selecione o tipo (opcional)</option>
                    </select>
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display:block; margin-bottom: 8px; color: var(--text-muted); font-weight: 500; font-size: 13px;">ETIQUETAS</label>
                    <div id="new-card-preset-labels" class="preset-labels-list" style="margin-bottom: 8px;"></div>
                    <div id="new-card-labels" class="pill-list" style="min-height: 24px;"></div>
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

// --- Sub-Editors --- //

let demandTypesCache = [];

async function loadDemandTypes() {
    try {
        const response = await fetch('/api/demand-types', { headers: getAuthHeaders() });
        if (!response.ok) return;
        demandTypesCache = await response.json();
        const ncSelect = document.getElementById('nc-demand-type');
        const editSelect = document.getElementById('edit-card-demand-type');
        const optionsHTML = '<option value="">Selecione o tipo (opcional)</option>' + 
            demandTypesCache.map(t => `<option value="${escapeHtml(t.name)}">${escapeHtml(t.name)}</option>`).join('');
        if (ncSelect) ncSelect.innerHTML = optionsHTML;
        if (editSelect) editSelect.innerHTML = optionsHTML;
    } catch (err) {
        console.error('Error loading demand types:', err);
    }
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

// --- Card Detail Modal --- //

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
    if (editDemandTypeInput) {
        loadDemandTypes().then(() => {
            editDemandTypeInput.value = card.demand_type || '';
        });
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

    // Custom Sector Logic — Design Status (same card, no duplication)
    if (linkedDesignInfo) linkedDesignInfo.style.display = 'none';
    if (requestDesignBtn) requestDesignBtn.style.display = 'none';
    if (linkedMediaInfo) linkedMediaInfo.style.display = 'none';
    if (requestMediaBtn) requestMediaBtn.style.display = 'none';

    if (activeCategory === 'editorial') {
        if (card.design_column_id) {
            // Card is already in the design pipeline — show status
            if (requestDesignBtn) requestDesignBtn.style.display = 'none';
            if (linkedDesignInfo) {
                const designColId = card.design_column_id;
                let status = 'Aguardando';
                let statusColor = '#94a3b8';
                if (designColId === 'design-5') { status = 'Arte Finalizada ✅'; statusColor = '#22c55e'; }
                else if (['design-3', 'design-4'].includes(designColId)) { status = 'Em Produção 🎨'; statusColor = '#f59e0b'; }
                else if (designColId === 'design-2') { status = 'Na Pauta Design'; statusColor = '#3b82f6'; }
                else if (designColId === 'design-1') { status = 'Pedido Enviado'; statusColor = '#94a3b8'; }

                linkedDesignInfo.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                        <i class="fa-solid fa-palette" style="color: ${statusColor};"></i>
                        <span style="font-weight: 700; font-size: 12px; color: ${statusColor};">${status}</span>
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted);">Este card está no board de Design.</div>
                    <button onclick="window.location.href='index.html?category=design&open=${card.id}'" style="margin-top: 10px; width: 100%; padding: 8px; border-radius: 6px; background: var(--primary); color: white; border: none; font-size: 12px; font-weight: 600; cursor: pointer; transition: 0.2s;">
                        <i class="fa-solid fa-arrow-right"></i> Ver no Design
                    </button>
                `;
                linkedDesignInfo.style.display = 'block';
            }
        } else {
            // Card is NOT in design — show "Solicitar Arte" button
            if (requestDesignBtn) {
                requestDesignBtn.style.display = 'block';
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
                            alert('Demanda enviada para o setor de Design!');
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
        }

        // Media / Foto e Vídeo
        if (card.media_column_id) {
            if (requestMediaBtn) requestMediaBtn.style.display = 'none';
            if (linkedMediaInfo) {
                const mediaColId = card.media_column_id;
                let status = 'Aguardando';
                let statusColor = '#94a3b8';
                if (mediaColId === 'media-5') { status = 'Finalizado ✅'; statusColor = '#22c55e'; }
                else if (['media-3', 'media-4'].includes(mediaColId)) { status = 'Em Produção 🎬'; statusColor = '#f59e0b'; }
                else if (mediaColId === 'media-2') { status = 'Na Pauta'; statusColor = '#3b82f6'; }
                else if (mediaColId === 'media-1') { status = 'Pedido Enviado'; statusColor = '#94a3b8'; }

                linkedMediaInfo.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                        <i class="fa-solid fa-video" style="color: ${statusColor};"></i>
                        <span style="font-weight: 700; font-size: 12px; color: ${statusColor};">${status}</span>
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted);">Este card está no board de Foto e Vídeo.</div>
                    <button onclick="window.location.href='index.html?category=media&open=${card.id}'" style="margin-top: 10px; width: 100%; padding: 8px; border-radius: 6px; background: #8b5cf6; color: white; border: none; font-size: 12px; font-weight: 600; cursor: pointer; transition: 0.2s;">
                        <i class="fa-solid fa-arrow-right"></i> Ver em Foto e Vídeo
                    </button>
                `;
                linkedMediaInfo.style.display = 'block';
            }
        } else {
            if (requestMediaBtn) {
                requestMediaBtn.style.display = 'block';
                requestMediaBtn.onclick = async () => {
                    const originalText = requestMediaBtn.innerHTML;
                    requestMediaBtn.disabled = true;
                    requestMediaBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Solicitando...';
                    try {
                        const res = await fetch(`/api/cards/${card.id}/request-media?workspace=${activeWorkspaceId}`, {
                            method: 'POST',
                            headers: authHeaders
                        });
                        const data = await res.json();
                        if (res.ok) {
                            alert('Demanda enviada para o setor de Foto e Vídeo!');
                            modalOverlay.classList.remove('active');
                            loadStateFromServer();
                        } else {
                            alert(data.error || 'Erro ao solicitar produção');
                        }
                    } catch (err) {
                        console.error('Solicitar Mídia error:', err);
                        alert('Erro na requisição: ' + err.message);
                    } finally {
                        requestMediaBtn.disabled = false;
                        requestMediaBtn.innerHTML = originalText;
                    }
                };
            }
        }
    }

    // Show link to editorial board if viewing from design or media
    const parentLinkEl = document.getElementById('modal-parent-link');
    if (parentLinkEl) {
        if ((activeCategory === 'design' || activeCategory === 'media') && card.column_id) {
            parentLinkEl.innerHTML = `<a href="#" onclick="event.preventDefault(); window.location.href='index.html?category=editorial&open=${card.id}'" style="color: var(--primary); text-decoration: none;"><i class="fa-solid fa-link"></i> Ver no Editorial</a>`;
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

// --- Event Handlers --- //

function attachModalHandlers() {
    if (saveCardBtn) {
        saveCardBtn.onclick = async () => {
            if (!activeCardId || !activeCardData) return;
            const title = editTitleInput ? editTitleInput.value.trim() : '';
            const description = editDescriptionInput ? editDescriptionInput.value.trim() : '';
            const platform = editPlatformInput ? editPlatformInput.value : '';
            const post_date = editDateInput ? editDateInput.value : '';
            const post_time = editTimeInput ? editTimeInput.value : '';
            const recurrence_type = editRecurrenceInput ? editRecurrenceInput.value : 'none';
            const demand_type = editDemandTypeInput ? editDemandTypeInput.value : '';
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
                    body: JSON.stringify({ title, description, platform, post_date, post_time, recurrence_type, demand_type, assignee, labels: activeCardData.labels, members: activeCardData.members, checklist: activeCardData.checklist, comments: activeCardData.comments, images: activeCardData.images, files: activeCardData.files, visible_workspaces, primary_workspace_id: activeCardData.workspace_id, category: activeCardData.category, parent_id: activeCardData.parent_id })
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
            const value = memberInput.value.trim();
            if (!value) return;
            if (activeCardData.members.some(m => m.toLowerCase() === value.toLowerCase())) return alert('Membro ja adicionado.');
            if (!(await isValidMember(value))) return alert('Usuario não encontrado no sistema.');
            activeCardData.members.push(value);
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
        const newCardModalEl = document.getElementById('new-card-modal');
        closeNewBtn.addEventListener('click', () => newCardModalEl.classList.remove('active'));
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
