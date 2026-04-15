"""
minimizer.py - DFA minimization using the Table-Filling (Myhill-Nerode) algorithm.
Enhanced with rich step-by-step data for educational UI.
"""

from dfa import DFA


def _get_reachable_states(dfa: DFA) -> set:
    reachable = set()
    queue = [dfa.start_state]
    while queue:
        state = queue.pop(0)
        if state in reachable:
            continue
        reachable.add(state)
        for symbol in dfa.alphabet:
            next_state = dfa.transitions.get((state, symbol))
            if next_state and next_state not in reachable:
                queue.append(next_state)
    return reachable


def _complete_dfa(dfa: DFA) -> DFA:
    states_list = sorted(list(dfa.states))
    alphabet = sorted(list(dfa.alphabet))
    dead_state_name = '∅'
    needs_dead_state = False
    new_transitions = dfa.transitions.copy()
    for state in states_list:
        for symbol in alphabet:
            if (state, symbol) not in new_transitions:
                new_transitions[(state, symbol)] = dead_state_name
                needs_dead_state = True
    full_states = set(dfa.states)
    if needs_dead_state:
        full_states.add(dead_state_name)
        for symbol in alphabet:
            new_transitions[(dead_state_name, symbol)] = dead_state_name
    return DFA(full_states, dfa.alphabet, new_transitions, dfa.start_state, dfa.final_states)


def minimize_dfa(dfa: DFA) -> DFA:
    complete_dfa = _complete_dfa(dfa)
    reachable = _get_reachable_states(complete_dfa)
    states = sorted(list(reachable))
    final_states = complete_dfa.final_states & reachable
    if len(states) <= 1:
        return complete_dfa
    distinguishable = set()
    for i, p in enumerate(states):
        for q in states[i+1:]:
            if (p in final_states) != (q in final_states):
                distinguishable.add(frozenset({p, q}))
    changed = True
    while changed:
        changed = False
        for i, p in enumerate(states):
            for q in states[i+1:]:
                pair = frozenset({p, q})
                if pair in distinguishable:
                    continue
                for symbol in complete_dfa.alphabet:
                    dp = complete_dfa.transitions.get((p, symbol))
                    dq = complete_dfa.transitions.get((q, symbol))
                    if dp == dq:
                        continue
                    if frozenset({dp, dq}) in distinguishable:
                        distinguishable.add(pair)
                        changed = True
                        break
    parent = {s: s for s in states}
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    def union(x, y):
        rx, ry = find(x), find(y)
        if rx != ry:
            parent[ry] = rx
    for i, p in enumerate(states):
        for q in states[i+1:]:
            if frozenset({p, q}) not in distinguishable:
                union(p, q)
    groups = {}
    for s in states:
        rep = find(s)
        groups.setdefault(rep, []).append(s)
    start_rep = find(complete_dfa.start_state)
    alphabet = sorted(list(complete_dfa.alphabet))
    def group_name(rep):
        members = sorted(groups[rep])
        if len(members) == 1:
            return members[0]
        return '{' + ','.join(members) + '}'
    rep_to_name = {rep: group_name(rep) for rep in groups}
    new_start = rep_to_name[start_rep]
    new_finals = {rep_to_name[find(s)] for s in final_states if find(s) in rep_to_name}
    new_states = set(rep_to_name.values())
    new_transitions_result = {}
    for rep in groups:
        representative_state = groups[rep][0]
        from_name = rep_to_name[rep]
        for symbol in alphabet:
            target = complete_dfa.transitions.get((representative_state, symbol))
            if target is not None:
                target_rep = find(target)
                if target_rep in rep_to_name:
                    new_transitions_result[(from_name, symbol)] = rep_to_name[target_rep]
    return DFA(
        states=new_states,
        alphabet=set(alphabet),
        transitions=new_transitions_result,
        start_state=new_start,
        final_states=new_finals
    )


def get_minimization_steps(dfa: DFA) -> dict:
    """Return rich step-by-step details of the DFA minimization process."""
    complete_dfa = _complete_dfa(dfa)
    reachable = _get_reachable_states(complete_dfa)
    unreachable = set(dfa.states) - reachable
    states = sorted(list(reachable))
    final_states = complete_dfa.final_states & reachable
    non_final_states = reachable - final_states

    # Step 1: Reachability
    step_reachability = {
        'step_num': 1,
        'title': 'Remove Unreachable States',
        'theory': (
            'States that cannot be reached from the start state by any sequence of input symbols '
            'are redundant — they can never be entered during execution. Removing them simplifies '
            'the automaton before the table-filling phase begins.'
        ),
        'reachable': states,
        'unreachable': sorted(unreachable),
    }

    # Step 2: Initial Partition
    initial_distinguishable = []
    distinguishable = set()
    for i, p in enumerate(states):
        for q in states[i+1:]:
            if (p in final_states) != (q in final_states):
                pair = frozenset({p, q})
                distinguishable.add(pair)
                initial_distinguishable.append({
                    'pair': sorted([p, q]),
                    'p_final': p in final_states,
                    'q_final': q in final_states
                })

    step_initial = {
        'step_num': 2,
        'title': 'Initial Partition: Final vs Non-Final States',
        'theory': (
            'The base case: a final (accepting) state and a non-final (rejecting) state are always '
            'distinguishable — the empty string ε is accepted from one but rejected from the other. '
            'We mark all such pairs as distinguishable, forming two initial groups: F and Q\\F.'
        ),
        'final_group': sorted(final_states),
        'non_final_group': sorted(non_final_states),
        'initial_distinguishable_pairs': initial_distinguishable
    }

    # Step 3: Iterative Refinement
    iterations = []
    iteration_count = 1
    changed = True
    while changed:
        changed = False
        newly_distinguished = []
        unmarked_before = [sorted([p, q]) for i, p in enumerate(states)
                           for q in states[i+1:] if frozenset({p, q}) not in distinguishable]
        for i, p in enumerate(states):
            for q in states[i+1:]:
                pair = frozenset({p, q})
                if pair in distinguishable:
                    continue
                for symbol in sorted(complete_dfa.alphabet):
                    dp = complete_dfa.transitions.get((p, symbol))
                    dq = complete_dfa.transitions.get((q, symbol))
                    if dp == dq:
                        continue
                    if frozenset({dp, dq}) in distinguishable:
                        distinguishable.add(pair)
                        newly_distinguished.append({
                            'pair': sorted([p, q]),
                            'symbol': symbol,
                            'p_transition': dp,
                            'q_transition': dq,
                        })
                        changed = True
                        break
        still_unmarked = [sorted([p, q]) for i, p in enumerate(states)
                          for q in states[i+1:] if frozenset({p, q}) not in distinguishable]
        if changed:
            iterations.append({
                'iteration': iteration_count,
                'new_distinguishable': newly_distinguished,
                'still_unmarked': still_unmarked,
                'checked_pairs': unmarked_before
            })
            iteration_count += 1

    step_refinement = {
        'step_num': 3,
        'title': 'Iterative Refinement (Table-Filling)',
        'theory': (
            'For each unmarked pair (p, q), we check every symbol a. If δ(p,a) and δ(q,a) are '
            'already distinguishable, then (p, q) must also be distinguishable. We repeat until '
            'no new pairs are marked. This is the core of the table-filling algorithm.'
        ),
        'iterations': iterations,
        'total_iterations': len(iterations)
    }

    # Step 4: Equivalence classes
    parent = {s: s for s in states}
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    def union(x, y):
        rx, ry = find(x), find(y)
        if rx != ry:
            parent[ry] = rx

    indistinguishable_pairs = []
    for i, p in enumerate(states):
        for q in states[i+1:]:
            if frozenset({p, q}) not in distinguishable:
                union(p, q)
                indistinguishable_pairs.append(sorted([p, q]))

    groups = {}
    for s in states:
        rep = find(s)
        groups.setdefault(rep, []).append(s)

    merged_groups = [sorted(g) for g in groups.values() if len(g) > 1]
    singleton_groups = [sorted(g) for g in groups.values() if len(g) == 1]

    step_merge = {
        'step_num': 4,
        'title': 'Identify Equivalent States & Build Equivalence Classes',
        'theory': (
            'Pairs that remain unmarked after all iterations are indistinguishable — no input '
            'string can tell them apart. These equivalent states are merged into equivalence '
            'classes. Each class becomes one state in the minimized DFA.'
        ),
        'indistinguishable_pairs': indistinguishable_pairs,
        'merged_groups': merged_groups,
        'singleton_groups': singleton_groups,
        'all_groups': [sorted(g) for g in groups.values()]
    }

    # Step 5: Build minimized DFA
    def group_name(rep):
        members = sorted(groups[rep])
        if len(members) == 1:
            return members[0]
        return '{' + ','.join(members) + '}'

    rep_to_name = {rep: group_name(rep) for rep in groups}
    start_rep = find(complete_dfa.start_state)
    new_start = rep_to_name[start_rep]
    new_finals = {rep_to_name[find(s)] for s in final_states if find(s) in rep_to_name}
    new_state_names = sorted(rep_to_name.values())

    new_transitions_display = []
    for rep in sorted(groups.keys()):
        representative_state = groups[rep][0]
        from_name = rep_to_name[rep]
        for symbol in sorted(complete_dfa.alphabet):
            target = complete_dfa.transitions.get((representative_state, symbol))
            if target is not None:
                target_rep = find(target)
                if target_rep in rep_to_name:
                    new_transitions_display.append({
                        'from': from_name,
                        'symbol': symbol,
                        'to': rep_to_name[target_rep]
                    })

    step_build = {
        'step_num': 5,
        'title': 'Construct the Minimized DFA',
        'theory': (
            'Each equivalence class becomes one state in the minimized DFA. '
            'The start state is the class containing the original start state. '
            'A class is a final state if it contains any original final state. '
            'Transitions follow from any representative member of each class.'
        ),
        'new_states': new_state_names,
        'new_start': new_start,
        'new_finals': sorted(new_finals),
        'new_transitions': new_transitions_display,
        'original_count': len(states),
        'minimized_count': len(groups),
        'states_reduced': len(states) - len(groups)
    }

    return {
        'steps': [step_reachability, step_initial, step_refinement, step_merge, step_build],
        # Legacy fields for backward compat
        'reachable': states,
        'unreachable': sorted(unreachable),
        'initial_distinguishable': [d['pair'] for d in initial_distinguishable],
        'iterations': iterations,
        'all_distinguishable': [sorted(p) for p in distinguishable],
        'merged_groups': merged_groups,
        'singleton_groups': singleton_groups
    }
