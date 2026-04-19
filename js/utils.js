// ===================================================
// js/utils.js — Utility Functions
// ===================================================

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
