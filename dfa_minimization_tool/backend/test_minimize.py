import sys
import json
from dfa import DFA
from minimizer import minimize_dfa, get_minimization_steps

# Create a simple test DFA
states = {'q0', 'q1', 'q2'}
alphabet = {'0', '1'}
transitions = {
    ('q0', '0'): 'q1',
    ('q0', '1'): 'q2',
    ('q1', '0'): 'q2',
    ('q1', '1'): 'q0',
    ('q2', '0'): 'q2',
    ('q2', '1'): 'q2'
}
start_state = 'q0'
final_states = {'q2'}

test_dfa = DFA(states, alphabet, transitions, start_state, final_states)

try:
    print("Testing get_minimization_steps...")
    steps_result = get_minimization_steps(test_dfa)
    print("get_minimization_steps succeeded")
    
    # Try to serialize to JSON
    json_str = json.dumps(steps_result)
    print(f"JSON serialization succeeded, length: {len(json_str)}")
except Exception as e:
    print(f"Error in get_minimization_steps: {e}")
    import traceback
    traceback.print_exc()

try:    
    print("\nTesting minimize_dfa...")
    result_dfa = minimize_dfa(test_dfa)
    print("minimize_dfa succeeded")
    print(f"Result DFA has {len(result_dfa.states)} states")
except Exception as e:
    print(f"Error in minimize_dfa: {e}")
    import traceback
    traceback.print_exc()
