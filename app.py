"""
app.py - Flask backend for the Automata Converter and Minimizer.

Routes:
  POST /api/process     → Parse, detect type, convert/minimize based on action
  POST /api/validate    → Just validate and detect type (no conversion)

All responses are JSON.
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os

from validator import parse_automaton, parse_diagram_input, ValidationError
from minimizer import minimize_dfa, get_minimization_steps
from dfa import DFA

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)


@app.route('/')
def index():
    """Serve the frontend."""
    frontend_path = os.path.join(os.path.dirname(__file__), '..', 'frontend')
    return send_from_directory(frontend_path, 'index.html')


def dfa_to_response(dfa: DFA, label: str) -> dict:
    """
    Helper: Build a unified response payload for a DFA.
    Includes the 5-tuple, transition table, and graph edges for visualization.
    """
    table_data = dfa.get_transition_table()

    # Build graph edges for canvas rendering
    edges = []
    for (state, symbol), target in dfa.transitions.items():
        edges.append({'from': state, 'symbol': symbol, 'to': target})

    return {
        'label': label,
        'type': 'DFA',
        'states': table_data['states'],
        'alphabet': table_data['alphabet'],
        'start_state': dfa.start_state,
        'final_states': list(dfa.final_states),
        'transition_table': table_data['table'],
        'edges': edges,
        'state_count': len(dfa.states)
    }


def convert_sets_to_lists(obj):
    """
    Recursively convert all set and frozenset objects to lists so the
    structure is fully JSON-serializable before being passed to jsonify().
    """
    if isinstance(obj, (set, frozenset)):
        return [convert_sets_to_lists(item) for item in obj]
    if isinstance(obj, dict):
        return {key: convert_sets_to_lists(value) for key, value in obj.items()}
    if isinstance(obj, list):
        return [convert_sets_to_lists(item) for item in obj]
    return obj


@app.route('/api/process', methods=['POST'])
def process():
    """
    Main processing endpoint.

    Request JSON:
      {
        "input_mode": "text" | "diagram",
        "action": "minimize",
        "data": { ... }   // text fields or diagram state list
      }

    Response JSON:
      {
        "success": true,
        "input_type": "NFA" | "DFA",
        "input": { ... },          // original automaton info
        "output": { ... },         // result automaton info
        "steps": [ ... ],          // conversion/minimization steps
        "stats": { ... }           // before/after counts
      }
    """
    try:
        body = request.get_json(force=True)
        input_mode = body.get('input_mode', 'text')
        action = body.get('action', 'convert')
        data = body.get('data', {})
        print(f"[DEBUG] Processing request: action={action}, input_mode={input_mode}")

        # ── Parse input ──────────────────────────────────────────────────
        if input_mode == 'diagram':
            automaton, auto_type = parse_diagram_input(data)
        else:
            automaton, auto_type = parse_automaton(data)

        print(f"[DEBUG] Parsed automaton: type={auto_type}, states={len(automaton.states)}")

        # ── Build input representation ───────────────────────────────────
        input_data = dfa_to_response(automaton, 'Input DFA')

        # ── Perform requested action ─────────────────────────────────────
        steps = []
        output_data = None

        if action == 'minimize':
            # DFA → Minimized DFA
            print("[DEBUG] Starting minimize action")
            min_steps = get_minimization_steps(automaton)
            print("[DEBUG] get_minimization_steps completed")
            result_dfa = minimize_dfa(automaton)
            print(f"[DEBUG] minimize_dfa completed: {len(result_dfa.states)} states")
            output_data = dfa_to_response(result_dfa, 'Minimized DFA')
            print("[DEBUG] dfa_to_response completed")
            steps = [convert_sets_to_lists(min_steps)]  # wrap in list for consistent structure
            print(f"[DEBUG] Steps prepared, type={type(steps)}")

        else:
            return jsonify({'success': False, 'error': f"Unknown action: {action}"}), 400

        # ── Build stats ──────────────────────────────────────────────────
        stats = {
            'input_states': input_data['state_count'],
            'output_states': output_data['state_count'] if output_data else None,
            'input_type': auto_type,
            'action': action
        }

        response_dict = {
            'success': True,
            'input_type': auto_type,
            'input': input_data,
            'output': output_data,
            'steps': steps,
            'stats': stats
        }
        print(f"[DEBUG] Building response, stats={stats}")
        response = jsonify(response_dict)
        print(f"[DEBUG] Response built successfully")
        return response

    except ValidationError as e:
        print(f"[ERROR] ValidationError: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[ERROR] Exception occurred: {str(e)}")
        print(f"[ERROR] Traceback:\n{error_trace}")
        return jsonify({
            'success': False,
            'error': f'Internal error: {str(e)}',
            'trace': error_trace
        }), 500


@app.route('/api/validate', methods=['POST'])
def validate():
    """
    Validate input and return the detected automaton type without processing.
    Used for live validation feedback in the UI.
    """
    try:
        body = request.get_json(force=True)
        input_mode = body.get('input_mode', 'text')
        data = body.get('data', {})

        if input_mode == 'diagram':
            automaton, auto_type = parse_diagram_input(data)
        else:
            automaton, auto_type = parse_automaton(data)

        return jsonify({
            'success': True,
            'type': auto_type,
            'states': list(automaton.states),
            'alphabet': list(automaton.alphabet),
            'start_state': automaton.start_state,
            'final_states': list(automaton.final_states)
        })

    except ValidationError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': f'Internal error: {str(e)}'}), 500


if __name__ == '__main__':
    print("🚀 Automata Minimizer running at http://localhost:5000")
    app.run(debug=True, port=5000)
