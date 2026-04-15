/**
 * modal.js — Interactive Step-by-Step Explanation Modal
 * 
 * Displays each step of DFA minimization with:
 *  - What happened (concrete facts from this step)
 *  - Why it happened (conceptual explanation)
 *  - Theory connection (automata theory context)
 *  - Next/Previous navigation with progress indicator
 */

'use strict';

const StepModal = (() => {
  let currentStep = 0;
  let stepsData = null;
  let rawResult = null;

  // ── Public: initialize with result data ──────────────────────────────
  function init(result) {
    rawResult = result;
    if (!result || !result.steps || !result.steps[0] || !result.steps[0].steps) {
      console.warn('StepModal: No step data available');
      return;
    }
    stepsData = result.steps[0].steps;
    currentStep = 0;

    // Build step dots
    buildDots();
    // Show first step
    renderStep(0);

    // Enable the "Explain Process" button in header
    const headerBtn = document.getElementById('btn-open-explain-modal');
    if (headerBtn) headerBtn.style.display = 'inline-flex';
  }

  // ── Open the modal ───────────────────────────────────────────────────
  function open(startStep) {
    if (stepsData === null) return;
    if (typeof startStep === 'number') currentStep = startStep;
    renderStep(currentStep);
    const overlay = document.getElementById('explain-modal');
    if (overlay) {
      overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }

  // ── Close the modal ──────────────────────────────────────────────────
  function close() {
    const overlay = document.getElementById('explain-modal');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  // ── Build navigation dots ────────────────────────────────────────────
  function buildDots() {
    const container = document.getElementById('modal-step-dots');
    if (!container || !stepsData) return;
    container.innerHTML = '';
    stepsData.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = 'modal-dot' + (i === currentStep ? ' active' : '');
      dot.title = stepsData[i].title;
      dot.addEventListener('click', () => { currentStep = i; renderStep(i); });
      container.appendChild(dot);
    });
  }

  // ── Render a specific step ───────────────────────────────────────────
  function renderStep(index) {
    if (!stepsData) return;
    const step = stepsData[index];
    if (!step) return;

    // Update counter
    const counter = document.getElementById('modal-step-counter');
    if (counter) counter.textContent = `Step ${index + 1} of ${stepsData.length}`;

    // Update progress bar
    const fill = document.getElementById('modal-progress-fill');
    if (fill) fill.style.width = ((index + 1) / stepsData.length * 100) + '%';

    // Update dots
    document.querySelectorAll('.modal-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });

    // Build content
    const body = document.getElementById('modal-body');
    if (body) body.innerHTML = buildModalStepHTML(step, index);

    // Update nav buttons
    const prev = document.getElementById('btn-modal-prev');
    const next = document.getElementById('btn-modal-next');
    const center = document.getElementById('modal-footer-center');

    if (prev) prev.disabled = (index === 0);
    if (next) {
      if (index === stepsData.length - 1) {
        next.textContent = '✓ Done';
        next.disabled = false;
      } else {
        next.textContent = 'Next →';
        next.disabled = false;
      }
    }
    if (center) center.textContent = step.title;
  }

  // ── Build full modal HTML for a step ─────────────────────────────────
  function buildModalStepHTML(step, index) {
    const explanation = getStepExplanation(step, index);

    let html = `<div class="modal-step-content">`;

    // Header
    html += `
      <div class="modal-step-header">
        <div class="modal-step-badge">${step.step_num}</div>
        <div class="modal-step-title">${esc(step.title)}</div>
      </div>
    `;

    // What happened
    html += `
      <div class="modal-section">
        <div class="modal-section-label modal-what">🔎 What happened</div>
        <div class="modal-section-body blue">${explanation.what}</div>
      </div>
    `;

    // Why it happened
    html += `
      <div class="modal-section">
        <div class="modal-section-label modal-why">🧠 Why this happens</div>
        <div class="modal-section-body purple">${explanation.why}</div>
      </div>
    `;

    // Theory connection
    html += `
      <div class="modal-section">
        <div class="modal-section-label modal-theory">📐 Automata Theory Connection</div>
        <div class="modal-section-body amber">${explanation.theory}</div>
      </div>
    `;

    // Data summary
    if (explanation.data) {
      html += `
        <div class="modal-section">
          <div class="modal-section-label modal-data">📊 Data for this step</div>
          <div class="modal-section-body green">${explanation.data}</div>
        </div>
      `;
    }

    // Highlight / key insight
    if (explanation.keyInsight) {
      html += `<div class="modal-highlight-box">💡 Key Insight: ${explanation.keyInsight}</div>`;
    }

    html += `</div>`;
    return html;
  }

  // ── Get step-specific explanation ────────────────────────────────────
  function getStepExplanation(step, index) {
    switch (step.step_num) {
      case 1: return explainStep1(step);
      case 2: return explainStep2(step);
      case 3: return explainStep3(step);
      case 4: return explainStep4(step);
      case 5: return explainStep5(step);
      default: return { what: 'Processing…', why: '', theory: '', data: '' };
    }
  }

  function explainStep1(step) {
    const hasUnreachable = step.unreachable && step.unreachable.length > 0;
    const reachableList = step.reachable.map(s => chip(s)).join(' ');
    const unreachableList = hasUnreachable
      ? step.unreachable.map(s => chip(s, 'unreachable')).join(' ')
      : '';

    return {
      what: hasUnreachable
        ? `Starting from the initial state, we traced all reachable states using BFS/DFS. 
           We found <strong>${step.reachable.length} reachable</strong> state(s): ${reachableList}. 
           The following state(s) were <strong>never reachable</strong> and have been removed: ${unreachableList}`
        : `Starting from the initial state, we traced all reachable states and found 
           that <strong>all ${step.reachable.length} states</strong> are reachable: ${reachableList}. 
           No states were removed.`,

      why: `Unreachable states can never be entered during any computation on any input string. 
            Since they cannot affect behavior, they are purely redundant. 
            Removing them before the main algorithm prevents unnecessary pair comparisons and simplifies the process.`,

      theory: `In the formal definition of a DFA (Q, Σ, δ, q₀, F), while all states in Q are valid, 
               minimization requires only the states reachable from q₀ via δ. 
               The reachability analysis uses the reflexive-transitive closure of δ: 
               a state q is reachable if ∃ w ∈ Σ* such that δ*(q₀, w) = q.`,

      data: `Reachable: ${reachableList}${hasUnreachable ? `<br/>Removed: ${unreachableList}` : ''}`,

      keyInsight: hasUnreachable
        ? `Removing ${step.unreachable.length} unreachable state(s) before minimization reduces the number of pairs to check in subsequent steps.`
        : `All states are reachable — no preliminary reduction is possible. The algorithm proceeds to the marking phase.`
    };
  }

  function explainStep2(step) {
    const finalList    = step.final_group.map(s => chip(s, 'final')).join(' ');
    const nonFinalList = step.non_final_group.map(s => chip(s, 'non-final')).join(' ');
    const pairCount    = step.initial_distinguishable_pairs ? step.initial_distinguishable_pairs.length : 0;

    return {
      what: `The states are split into two initial groups: 
             <strong>Final states F</strong>: ${finalList || '<em>none</em>'} 
             and <strong>Non-final states Q\\F</strong>: ${nonFinalList || '<em>none</em>'}. 
             This creates <strong>${pairCount} initially distinguishable pair(s)</strong> — 
             one member of each pair is final, the other is not.`,

      why: `A final state and a non-final state behave differently on the empty string ε: 
            the final state accepts it, the non-final state rejects it. 
            This is the base case — we are certain these states are distinguishable 
            before examining any transitions. The initial marking gives us the "seed" 
            pairs from which we will propagate distinguishability.`,

      theory: `This corresponds to the base case of the Myhill-Nerode theorem: 
               two states p and q are distinguishable by ε (the empty string) 
               if and only if exactly one of them is in F. 
               Formally: if p ∈ F and q ∉ F (or vice versa), then (p, q) is marked in the table, 
               because δ*(p, ε) ∈ F but δ*(q, ε) ∉ F.`,

      data: `Final states: ${finalList || 'none'}<br/>Non-final states: ${nonFinalList || 'none'}<br/>Initially marked pairs: ${pairCount}`,

      keyInsight: `The two-group partition {F, Q\\F} is the coarsest partition consistent with the DFA's language — every refinement step can only make groups smaller, never larger.`
    };
  }

  function explainStep3(step) {
    const noChange = !step.iterations || step.iterations.length === 0;

    let dataHTML = '';
    if (!noChange) {
      step.iterations.forEach(iter => {
        dataHTML += `<strong>Iteration ${iter.iteration}:</strong> `;
        if (iter.new_distinguishable && iter.new_distinguishable.length > 0) {
          dataHTML += iter.new_distinguishable.map(d =>
            `Pair (${esc(d.pair[0])}, ${esc(d.pair[1])}) marked via symbol '${esc(d.symbol)}'`
          ).join('; ');
        } else {
          dataHTML += 'No new pairs marked';
        }
        dataHTML += '<br/>';
      });
    }

    return {
      what: noChange
        ? `No additional pairs were marked. The initial partition {F, Q\\F} is already the finest partition possible. 
           This means no transitions can be used to distinguish any further pair of states.`
        : `The algorithm performed <strong>${step.total_iterations} iteration(s)</strong>, 
           propagating distinguishability through transitions. Each iteration checks every 
           unmarked pair and marks it if its transitions lead to an already-marked pair. 
           The process stops when no new pairs are marked in a complete pass.`,

      why: `Consider two states p and q that were not initially marked. 
            If on some symbol a, δ(p,a) and δ(q,a) are states already known to be distinguishable, 
            then p and q must also be distinguishable — by that same symbol followed by whatever 
            distinguished δ(p,a) from δ(q,a). 
            We propagate this "backwards" until no more pairs can be marked.`,

      theory: `This is the inductive step of the Table-Filling Algorithm. 
               The invariant is: after each iteration, a pair (p,q) is marked if and only if 
               ∃ w ∈ Σ* with |w| ≤ k (where k = iteration number) such that 
               exactly one of δ*(p,w), δ*(q,w) is in F. 
               The algorithm terminates because the table is finite and pairs only go from 
               unmarked → marked, never the reverse.`,

      data: dataHTML || 'No iterations performed — initial partition was already stable.',

      keyInsight: noChange
        ? `Skipping refinement iterations is itself significant: it means the DFA has no redundant transitions that would reveal hidden distinguishability.`
        : `Each iteration can only mark NEW pairs — already-marked pairs stay marked. This guarantees the algorithm always terminates in at most O(n²) iterations.`
    };
  }

  function explainStep4(step) {
    const mergedCount = step.merged_groups ? step.merged_groups.length : 0;
    const hasMerges   = mergedCount > 0;

    const allGroupsHTML = step.all_groups
      ? step.all_groups.map(g =>
          `{${g.map(s => esc(s)).join(', ')}}`
        ).join(', ')
      : '';

    return {
      what: hasMerges
        ? `After all iterations, the pairs that remain <strong>unmarked</strong> are indistinguishable. 
           These states are grouped into <strong>${mergedCount} merged equivalence class(es)</strong>. 
           Each merged class will become a single state in the minimized DFA.`
        : `All pairs were marked as distinguishable. Every state is distinguishable from every other state. 
           Therefore, no states can be merged — the DFA is already minimal.`,

      why: `Two states are indistinguishable if no string can tell them apart — for every possible 
            input sequence, both states end up in the same type of state (both accepting or both rejecting). 
            Since we cannot observe any behavioral difference, we have no justification to keep them separate. 
            Merging them reduces the automaton without changing its language.`,

      theory: `The unmarked pairs form an equivalence relation ≡ over Q (called the Myhill-Nerode equivalence). 
               It is:
               • Reflexive: every state is equivalent to itself
               • Symmetric: if p ≡ q then q ≡ p  
               • Transitive: if p ≡ q and q ≡ r then p ≡ r
               The equivalence classes [p] = {q ∈ Q : p ≡ q} partition Q. 
               By the Myhill-Nerode theorem, these classes correspond exactly to the states of the minimal DFA.`,

      data: `Equivalence classes: ${allGroupsHTML}${hasMerges ? `<br/>Merged pairs: ${step.indistinguishable_pairs ? step.indistinguishable_pairs.map(p => `(${esc(p[0])}, ${esc(p[1])})`).join(', ') : 'none'}` : ''}`,

      keyInsight: hasMerges
        ? `Each equivalence class is the "canonical" identity of a state in the minimal DFA — states within a class are functionally identical from the language's perspective.`
        : `When the DFA is already minimal, the table-filling algorithm serves as a proof: it verifies that every pair of states is distinguishable.`
    };
  }

  function explainStep5(step) {
    const reduced    = step.states_reduced || 0;
    const isMinimal  = reduced === 0;
    const newStatesHTML = (step.new_states || []).map(s => chip(s)).join(' ');
    const newFinalsHTML = (step.new_finals || []).map(s => chip(s, 'final')).join(' ');

    return {
      what: isMinimal
        ? `The minimized DFA is <strong>identical to the input DFA</strong>. 
           It has ${step.minimized_count} state(s): ${newStatesHTML}. 
           No states were merged because every state was distinguishable from every other.`
        : `The minimized DFA has been constructed with <strong>${step.minimized_count} state(s)</strong> 
           (down from ${step.original_count}), <strong>eliminating ${reduced} state(s)</strong>. 
           New states: ${newStatesHTML}. Final states: ${newFinalsHTML}.`,

      why: `Each equivalence class from Step 4 becomes exactly one state. 
            The start state is the class containing q₀. 
            A class is a final state if it contains any original final state (since all states 
            in a class are equivalent, if one accepts ε, all do). 
            Transitions are defined using any representative from each class — the choice 
            doesn't matter because all members of a class behave identically.`,

      theory: `This construction is the formal completion of the Myhill-Nerode argument. 
               The resulting automaton M' = (Q', Σ, δ', q₀', F') where:
               • Q' = {[q] : q ∈ Q} (equivalence classes)
               • q₀' = [q₀]
               • F' = {[q] : q ∈ F}
               • δ'([q], a) = [δ(q, a)]
               M' is the unique (up to isomorphism) minimal DFA for the language L(M).`,

      data: `States: ${newStatesHTML}<br/>Start: ${chip(step.new_start)}<br/>Finals: ${newFinalsHTML}<br/>Transitions: ${step.new_transitions ? step.new_transitions.length : 0} total`,

      keyInsight: isMinimal
        ? `A DFA being already minimal means its language cannot be recognized with fewer states — this is the lower bound for that language.`
        : `The minimal DFA is the canonical representation of the language. Any two DFAs that accept the same language will produce the same minimal DFA (up to state renaming).`
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function chip(s, cls) {
    return `<span class="state-chip ${cls || ''}">${esc(s)}</span>`;
  }

  // ── Wire up modal buttons ─────────────────────────────────────────────
  function wireEvents() {
    document.getElementById('btn-modal-close')?.addEventListener('click', close);
    document.getElementById('btn-open-explain-modal')?.addEventListener('click', () => open(0));
    document.getElementById('btn-show-steps-modal')?.addEventListener('click', () => open(0));

    document.getElementById('btn-modal-prev')?.addEventListener('click', () => {
      if (currentStep > 0) { currentStep--; renderStep(currentStep); }
    });

    document.getElementById('btn-modal-next')?.addEventListener('click', () => {
      if (currentStep < stepsData.length - 1) {
        currentStep++;
        renderStep(currentStep);
      } else {
        close();
      }
    });

    // Close on overlay click
    document.getElementById('explain-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) close();
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') {
        if (stepsData && currentStep < stepsData.length - 1) { currentStep++; renderStep(currentStep); }
      }
      if (e.key === 'ArrowLeft') {
        if (stepsData && currentStep > 0) { currentStep--; renderStep(currentStep); }
      }
    });
  }

  return { init, open, close, wireEvents };
})();

// Wire events on load
document.addEventListener('DOMContentLoaded', () => {
  StepModal.wireEvents();
});
