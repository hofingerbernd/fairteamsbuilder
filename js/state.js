/* ============================================================
   UI STATE & HELPERS
   ============================================================*/

let uiState = {
  currentCategoryId: null,
  currentPoolId: null,
  currentGenerationPlayers: [],
  lastTeams: null
};
let statusMessageTimer = null;

function ts(t) {
  return new Date(t).toLocaleString();
}
function getDistMode() {
  const rb = document.querySelector('input[name="distMode"]:checked');
  return rb ? rb.value : 'fair';
}

function setStatus(message, type = 'info', timeoutMs = 3500) {
  const box = document.getElementById('statusMessage');
  if (!box) return;

  box.textContent = message;
  box.classList.remove('info', 'success', 'error');
  box.classList.add('show', type);

  if (statusMessageTimer) clearTimeout(statusMessageTimer);
  if (timeoutMs > 0) {
    statusMessageTimer = setTimeout(() => {
      box.classList.remove('show', 'info', 'success', 'error');
      box.textContent = '';
    }, timeoutMs);
  }
}
