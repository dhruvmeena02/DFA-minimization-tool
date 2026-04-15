import sys
import os

# append backend path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from validator import parse_automaton
from minimizer import minimize_dfa, get_minimization_steps
import json

data = {
    "type": "DFA",
    "states": ["q0", "q1"],
    "alphabet": ["0", "1"],
    "start_state": "q0",
    "final_states": ["q1"],
    "transitions": [
        {"from": "q0", "symbol": "0", "to": "q1"},
        {"from": "q0", "symbol": "1", "to": "q0"},
        {"from": "q1", "symbol": "0", "to": "q1"},
        {"from": "q1", "symbol": "1", "to": "q1"}
    ]
}

try:
    automaton, auto_type = parse_automaton(data)
    min_steps = get_minimization_steps(automaton)
    result_dfa = minimize_dfa(automaton)
    
    res = {
        'steps': min_steps,
    }
    json.dumps(res)
    print("SUCCESS JSON DUMP")

except Exception as e:
    import traceback
    print(traceback.format_exc())
