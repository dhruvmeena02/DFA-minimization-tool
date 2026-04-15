/**
 * ui.js – Result rendering, step visualization, and UI helpers.
 */

'use strict';

const UI = (() => {

  function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === 'tab-pane-' + tabId);
    });
  }

  function updateTypeIndicator(type) {
    const el = document.getElementById('type-status');
    if (!el) return;
    if (type) {
      el.textContent = '✓ Detected: DFA';
      el.style.display = 'inline-block';
    } else {
      el.style.display = 'none';
      el.textContent = '';
    }
  }

  function showError(msg) {
    const el = document.getElementById('input-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
  }

  function clearError() {
    const el = document.getElementById('input-error');
    if (!el) return;
    el.style.display = 'none';
    el.textContent = '';
  }

  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function stateChip(s, cls) {
    return `<span class="state-chip ${cls || ''}">${esc(s)}</span>`;
  }

  function renderTuple(containerId, data) {
    const el = document.getElementById(containerId);
    if (!el || !data) return;
    const fmt = arr => Array.isArray(arr) ? '{' + arr.join(', ') + '}' : String(arr || '');
    el.innerHTML = [
      row('Q', fmt(data.states)),
      row('Σ', fmt(data.alphabet)),
      row('q₀', String(data.start_state || '')),
      row('F', fmt(data.final_states)),
      row('|Q|', String(data.state_count || (Array.isArray(data.states) ? data.states.length : '')) + ' states')
    ].join('');
    function row(key, val) {
      return `<div><span class="tkey">${esc(key)} =</span> ${esc(val)}</div>`;
    }
  }

  function updateComparison(inputData, outputData) {
    const inLabel  = document.getElementById('cmp-input-label');
    const outLabel = document.getElementById('cmp-output-label');
    if (inLabel)  inLabel.textContent  = (inputData  && inputData.label)  || 'Input DFA';
    if (outLabel) outLabel.textContent = (outputData && outputData.label) || 'Minimized DFA';
    renderTuple('cmp-input-tuple',  inputData);
    renderTuple('cmp-output-tuple', outputData);
  }

  function renderTable(containerId, data) {
    const el = document.getElementById(containerId);
    if (!el || !data) return;
    const { states, alphabet, start_state, final_states, transition_table } = data;
    let html = '<table class="trans-table"><thead><tr><th>State</th>';
    (alphabet || []).forEach(sym => { html += `<th>${esc(sym)}</th>`; });
    html += '</tr></thead><tbody>';
    (states || []).forEach(state => {
      const isStart = state === start_state;
      const isFinal = (final_states || []).includes(state);
      const isDead  = state === '∅';
      html += `<tr><td class="state-col${isDead ? ' dead-cell' : ''}">`;
      if (isStart) html += '<span class="state-marker">→</span>';
      if (isFinal) html += '<span class="state-marker">*</span>';
      html += esc(state) + '</td>';
      (alphabet || []).forEach(sym => {
        const target = transition_table && transition_table[state] && transition_table[state][sym];
        const val = Array.isArray(target) ? (target.join(', ') || '∅') : (target || '∅');
        const cls = (val === '∅' || val === '') ? ' class="dead-cell"' : '';
        html += `<td${cls}>${esc(val)}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  // ── STEP RENDERING ────────────────────────────────────────────────────

  function renderSteps(containerId, stepsData, action) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';

    if (!stepsData || !Array.isArray(stepsData) || stepsData.length === 0) {
      el.innerHTML = '<p style="color:#94a3b8;padding:20px">No steps recorded.</p>';
      return;
    }
    if (action !== 'minimize') return;

    const raw = stepsData[0];
    if (!raw || !raw.steps) {
      el.innerHTML = '<p style="color:#94a3b8;padding:20px">Step data unavailable.</p>';
      return;
    }

    const steps = raw.steps;
    const s5 = steps[4];
    const s1 = steps[0];
    const originalCount  = s5 ? s5.original_count  : (s1 ? s1.reachable.length : '?');
    const minimizedCount = s5 ? s5.minimized_count : '?';
    const reduced        = s5 ? s5.states_reduced  : 0;
    const isAlreadyMinimal = reduced === 0;

    // Summary banner
    const banner = document.createElement('div');
    banner.className = 'steps-summary-banner';
    banner.innerHTML = `
      <div class="steps-summary-stat">
        <div class="stat-number">${esc(String(originalCount))}</div>
        <div class="stat-label">Input States</div>
      </div>
      <div class="stat-divider">→</div>
      <div class="steps-summary-stat">
        <div class="stat-number" style="color:${isAlreadyMinimal ? '#15803d' : '#1d4ed8'}">${esc(String(minimizedCount))}</div>
        <div class="stat-label">Minimized States</div>
      </div>
      <div class="steps-summary-result">
        ${isAlreadyMinimal
          ? '✓ DFA is already in its minimal form — no states can be merged.'
          : `<span style="color:#1d4ed8">⬇ ${esc(String(reduced))} state${reduced !== 1 ? 's' : ''} eliminated</span><br/>
             <small style="font-weight:400;color:#64748b">The minimized DFA accepts exactly the same language.</small>`}
      </div>
    `;
    el.appendChild(banner);

    // Step cards
    steps.forEach(step => el.appendChild(buildStepCard(step)));

    // Explain process CTA
    const cta = document.createElement('div');
    cta.style.cssText = 'text-align:center;padding:20px 0 8px;';
    cta.innerHTML = `
      <p style="font-size:0.88rem;color:#64748b;margin-bottom:12px;">
        Want a guided explanation of each step with theory?
      </p>
      <button onclick="StepModal.open(0)" style="
        background:linear-gradient(135deg,#7c3aed,#5b21b6);
        color:white;font-weight:700;font-size:0.9rem;
        padding:10px 24px;border-radius:10px;cursor:pointer;
        border:none;box-shadow:0 2px 8px rgba(124,58,237,0.3);
      ">👉 Open Interactive Step Explainer</button>
    `;
    el.appendChild(cta);
  }

  function buildStepCard(step) {
    const card = document.createElement('div');
    card.className = 'step-card';

    const header = document.createElement('div');
    header.className = 'step-card-header';
    header.innerHTML = `
      <div class="step-badge">${esc(String(step.step_num))}</div>
      <div class="step-card-title">${esc(step.title)}</div>
      <div class="step-card-chevron">▾</div>
    `;
    header.addEventListener('click', () => card.classList.toggle('collapsed'));

    const body = document.createElement('div');
    body.className = 'step-card-body';

    if (step.theory) {
      body.innerHTML += `<div class="step-theory-callout">${esc(step.theory)}</div>`;
    }

    const content = document.createElement('div');
    content.innerHTML = buildStepContent(step);
    body.appendChild(content);

    card.appendChild(header);
    card.appendChild(body);
    return card;
  }

  function buildStepContent(step) {
    switch (step.step_num) {
      case 1: return buildStep1(step);
      case 2: return buildStep2(step);
      case 3: return buildStep3(step);
      case 4: return buildStep4(step);
      case 5: return buildStep5(step);
      default: return '';
    }
  }

  function buildStep1(step) {
    let html = `<div class="step-subsection">
      <div class="step-subsection-title">Reachable States (${step.reachable.length})</div>
      <div>${step.reachable.map(s => stateChip(s)).join('')}</div>
    </div>`;
    if (step.unreachable && step.unreachable.length > 0) {
      html += `<div class="step-subsection">
        <div class="step-subsection-title">Unreachable States — Removed</div>
        <div>${step.unreachable.map(s => stateChip(s, 'unreachable')).join('')}</div>
      </div>`;
    } else {
      html += `<div class="already-minimal-notice">✓ All states are reachable. Nothing to remove.</div>`;
    }
    return html;
  }

  function buildStep2(step) {
    let html = `<div class="partition-display">
      <div class="partition-group">
        <div class="partition-group-label">Group F — Final States (${step.final_group.length})</div>
        <div>${step.final_group.length
          ? step.final_group.map(s => stateChip(s, 'final')).join('')
          : '<span style="color:#aaa;font-size:0.85rem">none</span>'}</div>
      </div>
      <div class="partition-group">
        <div class="partition-group-label">Group Q\\F — Non-Final (${step.non_final_group.length})</div>
        <div>${step.non_final_group.length
          ? step.non_final_group.map(s => stateChip(s, 'non-final')).join('')
          : '<span style="color:#aaa;font-size:0.85rem">none</span>'}</div>
      </div>
    </div>`;

    if (step.initial_distinguishable_pairs && step.initial_distinguishable_pairs.length > 0) {
      html += `<div class="step-subsection">
        <div class="step-subsection-title">Initially Distinguishable Pairs (${step.initial_distinguishable_pairs.length})</div>
        <div class="pairs-list">
          ${step.initial_distinguishable_pairs.map(d =>
            `<span class="pair-chip" title="${esc(d.pair[0])} is ${d.p_final?'final':'non-final'}, ${esc(d.pair[1])} is ${d.q_final?'final':'non-final'}">(${esc(d.pair[0])}, ${esc(d.pair[1])})</span>`
          ).join('')}
        </div>
        <div style="margin-top:8px;font-size:0.8rem;color:#64748b;">Each pair contains one final and one non-final state — distinguished by the empty string ε.</div>
      </div>`;
    } else {
      html += `<div class="already-minimal-notice" style="margin-top:8px;">No initially distinguishable pairs.</div>`;
    }
    return html;
  }

  function buildStep3(step) {
    if (!step.iterations || step.iterations.length === 0) {
      return `<div class="already-minimal-notice">✓ No additional refinement needed. Initial partition is the finest.</div>`;
    }

    let html = `<div style="font-size:0.85rem;color:#64748b;margin-bottom:14px;">
      ${step.total_iterations} iteration${step.total_iterations !== 1 ? 's' : ''} performed until stable.
    </div>`;

    step.iterations.forEach(iter => {
      html += `<div class="iteration-block">
        <div class="iteration-header">Iteration ${iter.iteration} — ${iter.new_distinguishable.length} new pair${iter.new_distinguishable.length !== 1 ? 's' : ''} marked</div>
        <div class="iteration-body">`;
      iter.new_distinguishable.forEach(item => {
        html += `<div class="iteration-row">
          <span class="iter-pair">(${esc(item.pair[0])}, ${esc(item.pair[1])})</span>
          <span class="iter-because">marked via</span>
          <span class="iter-evidence">δ(${esc(item.pair[0])}, '${esc(item.symbol)}') = ${esc(item.p_transition)}</span>
          <span class="iter-because">≠</span>
          <span class="iter-evidence">δ(${esc(item.pair[1])}, '${esc(item.symbol)}') = ${esc(item.q_transition)}</span>
          <span class="iter-because">(distinguishable)</span>
        </div>`;
      });
      if (iter.still_unmarked && iter.still_unmarked.length > 0) {
        html += `<div style="margin-top:10px;font-size:0.8rem;color:#64748b;">
          Still unmarked: ${iter.still_unmarked.map(p => `<span class="pair-chip">(${esc(p[0])}, ${esc(p[1])})</span>`).join(' ')}
        </div>`;
      }
      html += `</div></div>`;
    });
    return html;
  }

  function buildStep4(step) {
    let html = '';
    if (step.indistinguishable_pairs && step.indistinguishable_pairs.length > 0) {
      html += `<div class="step-subsection">
        <div class="step-subsection-title">Indistinguishable Pairs (to be merged)</div>
        <div class="pairs-list">
          ${step.indistinguishable_pairs.map(p =>
            `<span class="pair-chip" style="background:#ede9fe;border-color:#c4b5fd;color:#5b21b6;">(${esc(p[0])}, ${esc(p[1])})</span>`
          ).join('')}
        </div>
      </div>`;
    }

    html += `<div class="step-subsection">
      <div class="step-subsection-title">Equivalence Classes</div>
      <div class="eq-classes-display">`;

    if (step.merged_groups && step.merged_groups.length > 0) {
      step.merged_groups.forEach(g => {
        html += `<div class="eq-class-card merged-card">
          <div class="eq-class-label">Merged Group</div>
          <div class="eq-class-name">{${g.map(s => esc(s)).join(', ')}}</div>
          <div style="margin-top:8px">${g.map(s => stateChip(s, 'merged')).join('')}</div>
        </div>`;
      });
    }
    if (step.singleton_groups && step.singleton_groups.length > 0) {
      step.singleton_groups.forEach(g => {
        html += `<div class="eq-class-card">
          <div class="eq-class-label">Singleton</div>
          <div class="eq-class-name">${esc(g[0])}</div>
        </div>`;
      });
    }
    html += `</div></div>`;

    if (!step.merged_groups || step.merged_groups.length === 0) {
      html += `<div class="already-minimal-notice" style="margin-top:12px;">✓ All states are distinguishable. No merges possible. DFA is already minimal.</div>`;
    }
    return html;
  }

  function buildStep5(step) {
    let html = `<div class="minimized-dfa-summary">
      <div class="min-dfa-field">
        <div class="min-dfa-field-label">States Q'</div>
        <div class="min-dfa-field-val">{${(step.new_states || []).map(s => esc(s)).join(', ')}}</div>
      </div>
      <div class="min-dfa-field">
        <div class="min-dfa-field-label">Start State q₀'</div>
        <div class="min-dfa-field-val">${esc(step.new_start)}</div>
      </div>
      <div class="min-dfa-field">
        <div class="min-dfa-field-label">Final States F'</div>
        <div class="min-dfa-field-val">{${(step.new_finals || []).map(s => esc(s)).join(', ')}}</div>
      </div>
      <div class="min-dfa-field">
        <div class="min-dfa-field-label">Size Reduction</div>
        <div class="min-dfa-field-val" style="color:${step.states_reduced > 0 ? '#1d4ed8' : '#15803d'}">
          ${esc(String(step.original_count))} → ${esc(String(step.minimized_count))} states
          ${step.states_reduced > 0 ? `(${esc(String(step.states_reduced))} removed)` : '(no change)'}
        </div>
      </div>
    </div>`;

    if (step.new_transitions && step.new_transitions.length > 0) {
      html += `<div class="step-subsection" style="margin-top:18px;">
        <div class="step-subsection-title">Transition Function δ'</div>
        <div style="overflow-x:auto;">
          <table class="mini-trans-table">
            <thead><tr><th>From State</th><th>Symbol</th><th>To State</th></tr></thead>
            <tbody>
              ${step.new_transitions.map(t =>
                `<tr><td>${esc(t.from)}</td><td>${esc(t.symbol)}</td><td>${esc(t.to)}</td></tr>`
              ).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
    }

    if (step.states_reduced === 0) {
      html += `<div class="already-minimal-notice" style="margin-top:14px;">✓ The DFA was already minimal — no changes made.</div>`;
    }
    return html;
  }

  return {
    switchTab,
    updateTypeIndicator,
    showError,
    clearError,
    renderTuple,
    updateComparison,
    renderTable,
    renderSteps
  };
})();
