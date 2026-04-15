/**
 * main.js
 * Application controller — wires all components together.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  DiagramEditor.init();

  // ── Theory Panel Toggle ───────────────────────────────────────────────
  const theoryPanel = document.getElementById('theory-panel');
  document.getElementById('btn-theory-panel')?.addEventListener('click', () => {
    const isVisible = theoryPanel && theoryPanel.style.display !== 'none';
    if (theoryPanel) theoryPanel.style.display = isVisible ? 'none' : 'block';
  });
  document.getElementById('btn-close-theory')?.addEventListener('click', () => {
    if (theoryPanel) theoryPanel.style.display = 'none';
  });

  let lastResult   = null;
  let diagramFocus = 'input';
  let tableFocus   = 'input';
  let debounce     = null;

  // ── Text fields → Diagram sync ────────────────────────────────────────
  const textFields = ['input-states','input-alphabet','input-transitions','input-start','input-finals'];
  textFields.forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => { syncTextToDiagram(); detectType(); }, 700);
    });
  });

  function syncTextToDiagram() {
    const parsed = parseTextFields();
    if (!parsed) return;
    DiagramEditor.updateFromTuple(parsed.stateNames, parsed.startState, parsed.finalStates, parsed.edges);
  }

  document.addEventListener('diagram-changed', () => {
    const data = DiagramEditor.getDiagramData();
    _setField('input-states',      data.states);
    _setField('input-alphabet',    data.alphabet);
    _setField('input-transitions', data.transitions);
    _setField('input-start',       data.start_state);
    _setField('input-finals',      data.final_states);
    clearTimeout(debounce);
    debounce = setTimeout(detectType, 700);
  });

  function _setField(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  function parseTextFields() {
    const statesRaw = (document.getElementById('input-states')?.value || '').trim();
    const alphaRaw  = (document.getElementById('input-alphabet')?.value || '').trim();
    const transRaw  = (document.getElementById('input-transitions')?.value || '').trim();
    const startRaw  = (document.getElementById('input-start')?.value || '').trim();
    const finalsRaw = (document.getElementById('input-finals')?.value || '').trim();

    const stateNames  = statesRaw ? statesRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
    const finalStates = finalsRaw ? finalsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
    const startState  = startRaw;

    const edges = [];
    transRaw.split('\n').forEach(line => {
      line = line.trim();
      if (!line) return;
      const eqIdx = line.indexOf('=');
      if (eqIdx < 0) return;
      const left = line.slice(0, eqIdx).trim();
      const to   = line.slice(eqIdx + 1).trim();
      const commaIdx = left.lastIndexOf(',');
      if (commaIdx < 0) return;
      const from   = left.slice(0, commaIdx).trim();
      let   symbol = left.slice(commaIdx + 1).trim();
      if (symbol === 'e' || symbol.toLowerCase() === 'epsilon') symbol = 'ε';
      if (from && symbol && to) {
        to.split(',').forEach(dest => {
          dest = dest.trim();
          if (dest) edges.push({ from, symbol, to: dest });
        });
      }
    });

    return { stateNames, startState, finalStates, edges };
  }

  function getTextData() {
    return {
      states:       (document.getElementById('input-states')?.value       || '').trim(),
      alphabet:     (document.getElementById('input-alphabet')?.value     || '').trim(),
      transitions:  (document.getElementById('input-transitions')?.value  || '').trim(),
      start_state:  (document.getElementById('input-start')?.value        || '').trim(),
      final_states: (document.getElementById('input-finals')?.value       || '').trim()
    };
  }

  // ── Live type detection ───────────────────────────────────────────────
  async function detectType() {
    const data = getTextData();
    if (!data.states && !data.transitions) { UI.updateTypeIndicator(null); return; }
    try {
      const resp = await API.validate('text', data);
      if (resp.success) UI.updateTypeIndicator(resp.type);
      else              UI.updateTypeIndicator(null);
    } catch (_) {}
  }

  // ── Action buttons ────────────────────────────────────────────────────
  document.getElementById('btn-minimize')?.addEventListener('click', () => runAction('minimize'));

  async function runAction(action) {
    UI.clearError();
    const data = getTextData();
    if (!data.states && !data.transitions) {
      UI.showError('Please enter automaton data first.');
      return;
    }
    const btn = document.getElementById('btn-minimize');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Working…'; }

    try {
      const result = await API.process('text', action, data);
      if (!result.success) { UI.showError(result.error || 'Unknown error.'); return; }
      lastResult = result;
      _renderResult(result, action);
    } catch (err) {
      UI.showError('Network error: ' + err.message + ' — Is the Flask server running on port 5000?');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<span class="btn-icon">⚙</span> Minimize DFA'; }
    }
  }

  // ── Render result ─────────────────────────────────────────────────────
  function _renderResult(result, action) {
    const { input, output, steps, stats } = result;

    const area = document.getElementById('results-area');
    if (area) area.style.display = 'block';

    const label = document.getElementById('result-action-label');
    if (label) label.textContent = '— DFA Minimization';

    if (stats) UI.updateTypeIndicator(stats.input_type);

    UI.updateComparison(input, output);

    tableFocus = 'input';
    document.getElementById('tbl-input-btn')?.classList.add('active');
    document.getElementById('tbl-output-btn')?.classList.remove('active');
    UI.renderTable('table-container', input);

    UI.renderSteps('steps-container', steps, action);

    // Update inline summary
    if (steps && steps[0] && steps[0].steps) {
      const s5 = steps[0].steps[4];
      if (s5) {
        const summaryEl = document.getElementById('results-summary-inline');
        if (summaryEl) {
          const reduced = s5.states_reduced || 0;
          if (reduced === 0) {
            summaryEl.innerHTML = '<span style="color:#15803d;font-weight:600">✓ Already minimal</span>';
          } else {
            summaryEl.innerHTML = `<span style="color:#1d4ed8;font-weight:600">${s5.original_count} → ${s5.minimized_count} states (${reduced} removed)</span>`;
          }
        }
      }
    }

    // Initialize modal with result data
    StepModal.init(result);

    // Show the explain buttons
    document.getElementById('btn-open-explain-modal').style.display = 'inline-flex';

    diagramFocus = 'input';
    document.getElementById('diag-input-btn')?.classList.add('active');
    document.getElementById('diag-output-btn')?.classList.remove('active');

    UI.switchTab('steps');

    // Smooth scroll to results
    area?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function _buildRendererData(apiData) {
    if (!apiData) return null;
    const states       = Array.isArray(apiData.states)       ? apiData.states       : [];
    const final_states = Array.isArray(apiData.final_states) ? apiData.final_states : [];
    const start_state  = apiData.start_state || '';
    const seen  = new Set();
    const edges = (Array.isArray(apiData.edges) ? apiData.edges : []).filter(e => {
      const key = `${e.from}\x00${e.symbol}\x00${e.to}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { states, start_state, final_states, edges };
  }

  function _renderOutputDiagram(which) {
    const canvas = document.getElementById('output-canvas');
    if (!canvas || !lastResult) return;
    const apiData = (which === 'input') ? lastResult.input : lastResult.output;
    const data = _buildRendererData(apiData);
    if (data) DiagramRenderer.render(canvas, data);
  }

  // ── Table toggle ──────────────────────────────────────────────────────
  document.getElementById('tbl-input-btn')?.addEventListener('click', () => {
    tableFocus = 'input';
    document.getElementById('tbl-input-btn')?.classList.add('active');
    document.getElementById('tbl-output-btn')?.classList.remove('active');
    if (lastResult) UI.renderTable('table-container', lastResult.input);
  });
  document.getElementById('tbl-output-btn')?.addEventListener('click', () => {
    tableFocus = 'output';
    document.getElementById('tbl-output-btn')?.classList.add('active');
    document.getElementById('tbl-input-btn')?.classList.remove('active');
    if (lastResult) UI.renderTable('table-container', lastResult.output);
  });

  // ── Diagram toggle ────────────────────────────────────────────────────
  document.getElementById('diag-input-btn')?.addEventListener('click', () => {
    diagramFocus = 'input';
    document.getElementById('diag-input-btn')?.classList.add('active');
    document.getElementById('diag-output-btn')?.classList.remove('active');
    _renderOutputDiagram('input');
  });
  document.getElementById('diag-output-btn')?.addEventListener('click', () => {
    diagramFocus = 'output';
    document.getElementById('diag-output-btn')?.classList.add('active');
    document.getElementById('diag-input-btn')?.classList.remove('active');
    _renderOutputDiagram('output');
  });

  // ── Result tab buttons ────────────────────────────────────────────────
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (!tab) return;
      UI.switchTab(tab);
      if (tab === 'output-diagram') _renderOutputDiagram(diagramFocus);
    });
  });

  window.addEventListener('resize', () => {
    if (lastResult) _renderOutputDiagram(diagramFocus);
  });

  // ── Example presets ───────────────────────────────────────────────────
  const EXAMPLES = {
    'ex-dfa-min': {
      states: 'q0, q1, q2, q3, q4', alphabet: 'a, b',
      transitions: 'q0,a=q1\nq0,b=q2\nq1,a=q3\nq1,b=q4\nq2,a=q3\nq2,b=q4\nq3,a=q3\nq3,b=q4\nq4,a=q4\nq4,b=q4',
      start_state: 'q0', final_states: 'q3'
    },
    'ex-dfa-already': {
      states: 'q0, q1', alphabet: 'a, b',
      transitions: 'q0,a=q1\nq0,b=q0\nq1,a=q1\nq1,b=q0',
      start_state: 'q0', final_states: 'q1'
    },
    'ex-dfa-complex': {
      states: 'A, B, C, D, E, F', alphabet: '0, 1',
      transitions: 'A,0=B\nA,1=C\nB,0=A\nB,1=D\nC,0=E\nC,1=F\nD,0=E\nD,1=F\nE,0=E\nE,1=F\nF,0=F\nF,1=F',
      start_state: 'A', final_states: 'C, D, E'
    }
  };

  Object.entries(EXAMPLES).forEach(([id, ex]) => {
    document.getElementById(id)?.addEventListener('click', () => {
      _setField('input-states',      ex.states);
      _setField('input-alphabet',    ex.alphabet);
      _setField('input-transitions', ex.transitions);
      _setField('input-start',       ex.start_state);
      _setField('input-finals',      ex.final_states);
      UI.clearError();
      syncTextToDiagram();
      clearTimeout(debounce);
      debounce = setTimeout(detectType, 200);
    });
  });

  // ── Export Canvas as PNG ──────────────────────────────────────────────
  function exportCanvas(canvasId, fileName) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = fileName;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  document.getElementById('tool-export-png')?.addEventListener('click', () => {
    exportCanvas('diagram-canvas', 'input_dfa.png');
  });
  document.getElementById('out-export-png')?.addEventListener('click', () => {
    exportCanvas('output-canvas', 'minimized_dfa.png');
  });

  // ── Simulate String ───────────────────────────────────────────────────
  document.getElementById('btn-simulate')?.addEventListener('click', () => {
    const inputEl  = document.getElementById('input-simulate');
    const resultEl = document.getElementById('simulate-result');
    if (!inputEl || !resultEl) return;

    if (!lastResult || !lastResult.output || lastResult.output.type !== 'DFA') {
      resultEl.textContent = '⚠ No minimized DFA available. Please run minimization first.';
      resultEl.style.display = 'block';
      resultEl.style.background = '#fef9c3';
      resultEl.style.color = '#854d0e';
      return;
    }

    const dfa = lastResult.output;
    const str = inputEl.value.trim();
    let currentState = dfa.start_state;
    let isRejected = false;
    const trace = [];

    for (const char of str) {
      const transitions = dfa.transition_table[currentState];
      if (!transitions || !transitions[char]) { isRejected = true; break; }
      const nextState = Array.isArray(transitions[char]) ? transitions[char][0] : transitions[char];
      trace.push(`δ(${currentState}, ${char}) = ${nextState}`);
      currentState = nextState;
      if (currentState === '∅') { isRejected = true; break; }
    }

    const isAccepted = !isRejected && dfa.final_states.includes(currentState);

    resultEl.style.display = 'block';
    if (isAccepted) {
      resultEl.innerHTML = `<span>✅ Accepted</span> — Ended in final state <code>${currentState}</code>`;
      resultEl.style.background = '#f0fdf4';
      resultEl.style.color = '#15803d';
      resultEl.style.border = '1px solid #86efac';
    } else {
      resultEl.innerHTML = `<span>❌ Rejected</span> — Halted in non-final state <code>${currentState || 'N/A'}</code>`;
      resultEl.style.background = '#fef2f2';
      resultEl.style.color = '#dc2626';
      resultEl.style.border = '1px solid #fca5a5';
    }
  });

});
