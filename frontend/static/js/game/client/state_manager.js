/**
 * State Manager
 * 
 * Manages game state cache and event emission
 */

class StateManager {
    constructor() {
        this.currentState = null;
    }
    
    /**
     * Update state and emit event
     * @param {Object} newState - New game state
     */
    updateState(newState) {
        this.currentState = newState;
        
        // Emit event for UI components
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('gameStateUpdate', {
                detail: newState
            }));
        }
    }
    
    /**
     * Get current state
     * @returns {Object|null}
     */
    getState() {
        return this.currentState;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateManager;
}

