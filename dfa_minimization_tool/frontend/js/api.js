/**
 * api.js
 * Thin wrapper around the Flask backend REST API.
 */

'use strict';

const API = (() => {

  const BASE = 'http://localhost:5000';  // explicit Flask server URL

  /**
   * Send an automaton to the backend for processing.
   *
   * @param {string} inputMode  - 'text' | 'diagram'
   * @param {string} action     - 'convert' | 'minimize' | 'convert_minimize'
   * @param {Object} data       - text fields or diagram data
   * @returns {Promise<Object>} - API response JSON
   */
  async function process(inputMode, action, data) {
    const response = await fetch(`${BASE}/api/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input_mode: inputMode, action, data })
    });
    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Validate input and detect automaton type without processing.
   *
   * @param {string} inputMode
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async function validate(inputMode, data) {
    const response = await fetch(`${BASE}/api/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input_mode: inputMode, data })
    });
    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  return { process, validate };

})();
