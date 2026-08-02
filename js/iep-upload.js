// ============================================================
// SkillLoop — IEP/504 Upload Component
// Creates a drag-and-drop file upload box inside a given container,
// uploads to the PRIVATE 'iep-504-docs' storage bucket under the
// current user's own folder, and records it in iep_504_documents.
//
// Usage: initIepUploadBox('container-id', 'iep', userId)
// ============================================================

function initIepUploadBox(containerId, docType, userId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const label = docType === 'iep' ? 'IEP' : '504 Plan';
  container.innerHTML = `
    <div class="iep-drop-zone" id="${containerId}-zone" tabindex="0" role="button" aria-label="Upload ${label} document">
      <div class="iep-drop-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>
      <div class="iep-drop-label">Upload ${label}</div>
      <div class="iep-drop-sub">Drag &amp; drop a file here, or click to browse</div>
      <div class="iep-drop-filename" id="${containerId}-filename" style="display:none;"></div>
      <input type="file" id="${containerId}-input" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" style="display:none;">
    </div>
    <div class="iep-drop-status" id="${containerId}-status"></div>
  `;

  const zone = document.getElementById(`${containerId}-zone`);
  const input = document.getElementById(`${containerId}-input`);
  const filenameEl = document.getElementById(`${containerId}-filename`);
  const statusEl = document.getElementById(`${containerId}-status`);

  async function upload(file) {
    if (!file) return;
    statusEl.textContent = 'Uploading…';
    statusEl.className = 'iep-drop-status';

    const path = `${userId}/${docType}-${Date.now()}-${file.name}`;
    const { error: uploadErr } = await window.supabaseClient.storage.from('iep-504-docs').upload(path, file);
    if (uploadErr) {
      statusEl.textContent = 'Upload failed: ' + uploadErr.message;
      statusEl.className = 'iep-drop-status err';
      return;
    }

    const { error: dbErr } = await window.supabaseClient.from('iep_504_documents').insert({
      user_id: userId, doc_type: docType, file_name: file.name, file_path: path,
    });
    if (dbErr) {
      statusEl.textContent = 'Saved file, but record failed: ' + dbErr.message;
      statusEl.className = 'iep-drop-status err';
      return;
    }

    filenameEl.textContent = file.name;
    filenameEl.style.display = 'block';
    statusEl.textContent = `${label} uploaded successfully.`;
    statusEl.className = 'iep-drop-status ok';
    zone.classList.add('has-file');
  }

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') input.click(); });
  input.addEventListener('change', () => upload(input.files[0]));

  ['dragenter', 'dragover'].forEach(evt => {
    zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(evt => {
    zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.remove('dragover'); });
  });
  zone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  });

  // Show existing upload, if any, so the box reflects prior state on reload
  (async function checkExisting() {
    const { data } = await window.supabaseClient
      .from('iep_504_documents').select('file_name').eq('user_id', userId).eq('doc_type', docType)
      .order('uploaded_at', { ascending: false }).limit(1).maybeSingle();
    if (data) {
      filenameEl.textContent = data.file_name;
      filenameEl.style.display = 'block';
      zone.classList.add('has-file');
      statusEl.textContent = `${label} already on file — upload again to replace it.`;
      statusEl.className = 'iep-drop-status';
    }
  })();
}
