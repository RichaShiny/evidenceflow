// Keep the original period value as the single source for record filtering.
(() => {
  const original = document.getElementById('period');
  original.hidden = true;
  const panel = document.createElement('div');
  panel.className = 'period-controls';
  panel.innerHTML = '<label>Fiscal year<input id="fiscal-year" type="number" min="1900" max="2200" step="1" aria-label="Fiscal year"></label><label>Quarter<select id="fiscal-quarter" aria-label="Quarter"><option value="1">Q1</option><option value="2">Q2</option><option value="3">Q3</option><option value="4">Q4</option></select></label><button type="button" class="btn secondary" id="apply-period">Apply period</button>';
  original.after(panel);
  const year = panel.querySelector('input');
  const quarter = panel.querySelector('select');
  function sync() {
    const match = original.value.match(/^Q([1-4]) FY(\d{4})$/);
    year.value = match ? match[2] : new Date().getFullYear();
    quarter.value = match ? match[1] : Math.floor(new Date().getMonth()/3)+1;
  }
  sync();
  const summary = document.createElement('p');
  summary.className = 'period-summary';
  summary.setAttribute('role', 'status');
  document.querySelector('.workspace-tools').after(summary);
  function describe() {
    const evidence = items('evidence').length;
    const actions = items('actions').length;
    summary.textContent = 'Viewing '+original.value+' · '+evidence+' evidence records · '+actions+' actions'+(!evidence&&!actions?' — No records yet. Add evidence or actions for this period, or select a period with existing records.':'');
  }
  function apply() {
    if (!year.reportValidity() || !year.value || !Number.isInteger(Number(year.value))) return;
    const value = 'Q'+quarter.value+' FY'+year.value;
    if (![...original.options].some(o=>o.value===value)) original.add(new Option(value,value));
    original.value = value;
    original.onchange();
    describe();
  }
  quarter.addEventListener('change', apply);
  panel.querySelector('button').addEventListener('click', apply);
  year.addEventListener('keydown', event=>{if(event.key==='Enter'){event.preventDefault();apply()}});
  const previousRender = render;
  render = function(){previousRender();describe()};
  describe();
})();
