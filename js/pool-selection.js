/* ============================================================
   APP-SPEZIFISCHE UI & LOGIK
   ============================================================*/
function getSelectedPoolIds() {
  const selected = [];
  document.querySelectorAll('#multiPoolList input[type=checkbox]:checked').forEach((cb) => {
    selected.push(parseInt(cb.value, 10));
  });
  return selected;
}

function updatePrepareButtonState() {
  const btn = document.getElementById('prepareAssignmentBtn');
  if (!btn) return;
  btn.disabled = getSelectedPoolIds().length === 0;
}

function renderMultiPoolList() {
  const list = document.getElementById('multiPoolList');
  list.innerHTML = '';

  if (!state.categories.length) {
    list.innerHTML = `<li class="muted">Keine Pools vorhanden.</li>`;
    return;
  }

  let totalPools = 0;
  state.categories.forEach((cat) => {
    const pools = cat.pools || [];

    // Kategorie-Header (aufklappbar)
    const catHeaderLi = document.createElement('li');
    catHeaderLi.style.cssText = 'padding:0;border-top:1px solid var(--border);';

    const catHeader = document.createElement('div');
    catHeader.className = 'category-header expanded';
    catHeader.textContent = cat.name;
    catHeader.setAttribute('role', 'button');
    catHeader.setAttribute('tabindex', '0');
    catHeader.setAttribute('aria-expanded', 'true');
    catHeaderLi.appendChild(catHeader);
    list.appendChild(catHeaderLi);

    // Pools-Container (wird eingeklappt/ausgeklappt)
    const poolsContainer = document.createElement('div');
    poolsContainer.className = 'category-pools';
    poolsContainer.dataset.categoryId = cat.id;

    pools.forEach((pool) => {
      totalPools++;
      const li = document.createElement('li');

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = pool.id;

      cb.id = `pool-${pool.id}`;
      cb.addEventListener('change', updatePrepareButtonState);

      const nameSpan = document.createElement('label');
      nameSpan.htmlFor = cb.id;
      nameSpan.textContent = pool.name;
      nameSpan.style.flex = '1';
      nameSpan.style.marginLeft = '0.8rem';

      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = (pool.players || []).length;

      li.append(cb, nameSpan, badge);
      li.addEventListener('click', (e) => {
        if (e.target === cb) return;
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change'));
      });
      li.setAttribute('tabindex', '0');
      li.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change'));
      });
      poolsContainer.appendChild(li);
    });

    // Toggle-Event für Header
    const toggleCategorySection = () => {
      catHeader.classList.toggle('expanded');
      poolsContainer.classList.toggle('collapsed');
      catHeader.setAttribute('aria-expanded', String(catHeader.classList.contains('expanded')));
    };
    catHeader.addEventListener('click', toggleCategorySection);
    catHeader.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      toggleCategorySection();
    });

    list.appendChild(poolsContainer);
  });

  if (!totalPools) {
    list.innerHTML = `<li class="muted">Keine Pools vorhanden.</li>`;
  }

  updatePrepareButtonState();
}
