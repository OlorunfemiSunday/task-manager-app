
// Shared helpers
async function api(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    let msg = 'Request failed';
    try { const data = await res.json(); msg = data.error || data.message || msg; } catch {}
    throw new Error(msg);
  }
  try { return await res.json(); } catch { return null; }
}

// ----- Index (login/signup) -----
if (location.pathname.endsWith('/') || location.pathname.endsWith('/index.html')) {
  const loginTab = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  if (loginTab && signupTab) {
    loginTab.addEventListener('click', () => {
      loginTab.classList.remove('secondary'); signupTab.classList.add('secondary');
      loginForm.style.display = 'block'; signupForm.style.display = 'none';
    });
    signupTab.addEventListener('click', () => {
      signupTab.classList.remove('secondary'); loginTab.classList.add('secondary');
      signupForm.style.display = 'block'; loginForm.style.display = 'none';
    });
  }

  const loginBtn = document.getElementById('login-btn');
  const loginError = document.getElementById('login-error');
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      loginError.textContent = '';
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value.trim();
      if (!username || !password) { loginError.textContent = 'Please fill all fields'; return; }
      try {
        await api('/login', { method: 'POST', body: JSON.stringify({ username, password }) });
        location.href = '/dashboard';
      } catch (e) { loginError.textContent = e.message; }
    });
  }

  const signupBtn = document.getElementById('signup-btn');
  const signupError = document.getElementById('signup-error');
  if (signupBtn) {
    signupBtn.addEventListener('click', async () => {
      signupError.textContent = '';
      const username = document.getElementById('signup-username').value.trim();
      const password = document.getElementById('signup-password').value.trim();
      if (!username || !password) { signupError.textContent = 'Please fill all fields'; return; }
      try {
        await api('/signup', { method: 'POST', body: JSON.stringify({ username, password }) });
        location.href = '/dashboard';
      } catch (e) { signupError.textContent = e.message; }
    });
  }
}

// ----- Dashboard (tasks) -----
if (location.pathname.endsWith('/dashboard') || location.pathname.endsWith('/dashboard.html')) {
  const tasksDiv = document.getElementById('tasks');
  const refreshBtn = document.getElementById('refresh');
  const logoutBtn = document.getElementById('logout');
  const saveBtn = document.getElementById('save');
  const resetBtn = document.getElementById('reset');
  const formError = document.getElementById('form-error');

  async function loadTasks() {
    tasksDiv.innerHTML = 'Loading...';
    try {
      const tasks = await api('/api/tasks');
      if (!tasks.length) { tasksDiv.innerHTML = '<div class="meta">No tasks yet. Add one!</div>'; return; }
      tasksDiv.innerHTML = '';
      for (const t of tasks) {
        const div = document.createElement('div');
        const pr = (t.priority || 'Low').toLowerCase();
        div.className = `task ${pr}`;
        div.innerHTML = `
          <div style="flex:1; min-width: 0;">
            <div class="title ${t.done ? 'done' : ''}">${t.title}</div>
            <div class="meta">${t.description || ''}</div>
            <div class="meta">Priority: <span class="badge ${pr}">${t.priority}</span></div>
          </div>
          <div class="btn-row">
            <button data-action="toggle" data-id="${t.id}">${t.done ? 'Undo' : 'Done'}</button>
            <button data-action="edit" data-id="${t.id}">Edit</button>
            <button data-action="delete" data-id="${t.id}" style="background:#ef4444">Delete</button>
          </div>`;
        tasksDiv.appendChild(div);
      }
    } catch (e) {
      tasksDiv.innerHTML = '<div class="meta" style="color:#ef4444">Failed to load tasks. You may need to login again.</div>';
    }
  }

  function clearForm() {
    document.getElementById('task-id').value = '';
    document.getElementById('title').value = '';
    document.getElementById('description').value = '';
    document.getElementById('priority').value = 'Low';
    formError.textContent = '';
  }

  saveBtn?.addEventListener('click', async () => {
    formError.textContent = '';
    const id = document.getElementById('task-id').value;
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const priority = document.getElementById('priority').value;
    if (!title) { formError.textContent = 'Title is required'; return; }

    try {
      if (id) {
        await api(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify({ title, description, priority }) });
      } else {
        await api('/api/tasks', { method: 'POST', body: JSON.stringify({ title, description, priority }) });
      }
      clearForm();
      await loadTasks();
    } catch (e) { formError.textContent = e.message; }
  });

  resetBtn?.addEventListener('click', clearForm);

  refreshBtn?.addEventListener('click', loadTasks);

  logoutBtn?.addEventListener('click', async () => {
    try { await api('/logout', { method: 'POST' }); location.href = '/'; }
    catch (e) { alert('Logout failed: ' + e.message); }
  });

  tasksDiv?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === 'delete') {
      if (!confirm('Delete this task?')) return;
      try { await api(`/api/tasks/${id}`, { method: 'DELETE' }); await loadTasks(); }
      catch (err) { alert(err.message); }
    }

    if (action === 'edit') {
      // Load task details to form (we already have them in DOM, but simplest to refetch all and find it)
      try {
        const tasks = await api('/api/tasks');
        const t = tasks.find(x => x.id === id);
        if (!t) return;
        document.getElementById('task-id').value = t.id;
        document.getElementById('title').value = t.title;
        document.getElementById('description').value = t.description || '';
        document.getElementById('priority').value = t.priority || 'Low';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) { alert(err.message); }
    }

    if (action === 'toggle') {
      try {
        // toggle done
        const tasks = await api('/api/tasks');
        const t = tasks.find(x => x.id === id);
        if (!t) return;
        await api(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify({ done: !t.done }) });
        await loadTasks();
      } catch (err) { alert(err.message); }
    }
  });

  // Initial load
  loadTasks();
}
