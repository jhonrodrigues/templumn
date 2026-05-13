document.addEventListener('DOMContentLoaded', async () => {
    const userRole = localStorage.getItem('templum-auth-role');
    if (userRole !== 'master' && userRole !== 'gestor') {
        window.location.replace('/index.html');
        return;
    }

    let demands = [];
    let workspaces = [];
    let columns = [];
    let boards = [];
    let assignees = [];
    let currentDemand = null;

    const listEl = document.getElementById('demand-list');
    const pendingCountEl = document.getElementById('pending-count');
    const panelEmpty = document.getElementById('panel-empty');
    const panelForm = document.getElementById('panel-form');

    // Fetch Base Data
    async function initData() {
        try {
            const [wsRes, boardRes, colRes, userRes] = await Promise.all([
                fetch('/api/workspaces', { headers: getAuthHeaders() }),
                fetch('/api/boards', { headers: getAuthHeaders() }),
                fetch('/api/columns', { headers: getAuthHeaders() }),
                fetch('/api/users/options', { headers: getAuthHeaders() })
            ]);

            workspaces = await wsRes.json();
            boards = await boardRes.json();
            columns = await colRes.json();
            assignees = await userRes.json();

            populateDropdowns();
            await loadDemands();
        } catch (e) {
            console.error('Error init triage data:', e);
            listEl.innerHTML = '<div class="empty-state"><p style="color:#ef4444;">Erro ao carregar dados.</p></div>';
        }
    }

    function populateDropdowns() {
        const wsSelect = document.getElementById('form-workspace');
        workspaces.forEach(ws => {
            const opt = document.createElement('option');
            opt.value = ws.id;
            opt.textContent = ws.name || ws.id;
            wsSelect.appendChild(opt);
        });

        const colSelect = document.getElementById('form-column');
        colSelect.innerHTML = '<option value="">Selecione...</option>';
        boards.forEach(board => {
            const boardCols = columns.filter(c => c.category === board.id);
            if (boardCols.length > 0) {
                const group = document.createElement('optgroup');
                group.label = board.name;
                boardCols.forEach(col => {
                    const opt = document.createElement('option');
                    opt.value = col.id;
                    opt.textContent = col.title;
                    group.appendChild(opt);
                });
                colSelect.appendChild(group);
            }
        });

        const assigneeSelect = document.getElementById('form-assignee');
        assignees.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.name || u.email;
            opt.textContent = u.name || u.email;
            assigneeSelect.appendChild(opt);
        });
    }

    async function loadDemands() {
        try {
            const res = await fetch('/api/jarvis/demands', { headers: getAuthHeaders() });
            demands = await res.json();
            renderDemands();
        } catch (e) {
            console.error('Error loading demands:', e);
        }
    }

    function renderDemands() {
        pendingCountEl.textContent = `${demands.length} pendentes`;
        listEl.innerHTML = '';

        if (demands.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-check-double"></i>
                    <p>Fila limpa!</p>
                </div>
            `;
            closePanel();
            return;
        }

        demands.forEach(demand => {
            const li = document.createElement('li');
            li.className = `demand-item ${demand.urgency}`;
            if (currentDemand && currentDemand.id === demand.id) li.classList.add('selected');

            let badgeHtml = '';
            if (demand.urgency === 'urgent') badgeHtml = '<span class="badge bg-red"><i class="fa-solid fa-fire"></i> Urgente</span>';
            else if (demand.urgency === 'high') badgeHtml = '<span class="badge bg-red">Alta</span>';
            else if (demand.urgency === 'low') badgeHtml = '<span class="badge">Baixa</span>';
            else badgeHtml = '<span class="badge bg-blue">Normal</span>';

            const timeStr = new Date(demand.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

            li.innerHTML = `
                <div class="demand-header">
                    <span class="demand-title">${escapeHTML(demand.title)}</span>
                </div>
                <div class="demand-meta">
                    ${badgeHtml}
                    ${demand.ministry ? `<span class="badge"><i class="fa-solid fa-church"></i> ${escapeHTML(demand.ministry)}</span>` : ''}
                    <span><i class="fa-solid fa-clock"></i> ${timeStr}</span>
                </div>
            `;

            li.addEventListener('click', () => {
                document.querySelectorAll('.demand-item').forEach(el => el.classList.remove('selected'));
                li.classList.add('selected');
                openPanel(demand);
            });

            listEl.appendChild(li);
        });
    }

    function openPanel(demand) {
        currentDemand = demand;
        panelEmpty.style.display = 'none';
        panelForm.style.display = 'flex';

        document.getElementById('current-demand-id').value = demand.id;
        document.getElementById('form-title').value = demand.title || '';
        document.getElementById('form-ministry').value = demand.ministry || '';
        document.getElementById('form-deadline').value = demand.deadline ? demand.deadline.split('T')[0] : '';
        document.getElementById('form-urgency').value = demand.urgency || 'normal';
        document.getElementById('form-type').value = demand.demand_type || '';
        document.getElementById('form-notes').value = demand.notes || '';
        
        // Reset destination fields
        document.getElementById('form-workspace').value = '';
        document.getElementById('form-column').value = '';
        document.getElementById('form-assignee').value = '';
    }

    function closePanel() {
        currentDemand = null;
        panelEmpty.style.display = 'flex';
        panelForm.style.display = 'none';
    }

    // Action Handlers
    document.getElementById('btn-save').addEventListener('click', async () => {
        if (!currentDemand) return;
        const btn = document.getElementById('btn-save');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

        const body = {
            title: document.getElementById('form-title').value.trim(),
            ministry: document.getElementById('form-ministry').value.trim(),
            deadline: document.getElementById('form-deadline').value || null,
            urgency: document.getElementById('form-urgency').value,
            demand_type: document.getElementById('form-type').value.trim(),
            notes: document.getElementById('form-notes').value.trim()
        };

        try {
            const res = await fetch(`/api/jarvis/demands/${currentDemand.id}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify(body)
            });
            if (res.ok) {
                await loadDemands();
                showToast('Alterações salvas', 'success');
            } else {
                showToast('Erro ao salvar', 'error');
            }
        } catch (e) {
            showToast('Erro ao conectar', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Apenas Salvar';
        }
    });

    document.getElementById('btn-approve').addEventListener('click', async () => {
        if (!currentDemand) return;
        
        const workspace_id = document.getElementById('form-workspace').value;
        const column_id = document.getElementById('form-column').value;
        const assignee = document.getElementById('form-assignee').value;
        const notes = document.getElementById('form-notes').value.trim();

        if (!workspace_id || !column_id) {
            showToast('Workspace e Coluna são obrigatórios para aprovar!', 'error');
            return;
        }

        const btn = document.getElementById('btn-approve');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

        try {
            // First save any edits
            await fetch(`/api/jarvis/demands/${currentDemand.id}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    title: document.getElementById('form-title').value.trim(),
                    ministry: document.getElementById('form-ministry').value.trim(),
                    deadline: document.getElementById('form-deadline').value || null,
                    urgency: document.getElementById('form-urgency').value,
                    demand_type: document.getElementById('form-type').value.trim(),
                    notes: notes
                })
            });

            // Then approve
            const res = await fetch(`/api/jarvis/demands/${currentDemand.id}/approve`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ workspace_id, column_id, assignee, notes })
            });
            
            if (res.ok) {
                showToast('Demanda aprovada e card criado!', 'success');
                closePanel();
                await loadDemands();
                if (window.pollJarvisDemands) window.pollJarvisDemands();
            } else {
                const err = await res.json();
                showToast(err.error || 'Erro ao aprovar', 'error');
            }
        } catch (e) {
            showToast('Erro ao conectar', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Aprovar e Criar';
        }
    });

    document.getElementById('btn-reject').addEventListener('click', async () => {
        if (!currentDemand) return;
        
        const reason = prompt('Motivo da rejeição:');
        if (reason === null) return; // cancelled
        if (reason.trim() === '') {
            showToast('Motivo é obrigatório para rejeitar.', 'error');
            return;
        }

        const btn = document.getElementById('btn-reject');
        btn.disabled = true;

        try {
            const res = await fetch(`/api/jarvis/demands/${currentDemand.id}/reject`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ reason: reason.trim() })
            });
            
            if (res.ok) {
                showToast('Demanda rejeitada e removida da fila.', 'success');
                closePanel();
                await loadDemands();
                if (window.pollJarvisDemands) window.pollJarvisDemands();
            } else {
                showToast('Erro ao rejeitar', 'error');
            }
        } catch (e) {
            showToast('Erro ao conectar', 'error');
        } finally {
            btn.disabled = false;
        }
    });

    function showToast(msg, type='success') {
        // Fallback or implement simple toast
        alert(msg);
    }

    initData();
});
