/**
 * Transfer System
 * 
 * Orbital transfers between zones
 */

class TransferSystem {
    constructor(orbitalMechanics) {
        this.orbitalMechanics = orbitalMechanics;
    }
    
    /**
     * Process active transfers
     * @param {Object} state - Game state
     * @param {number} deltaTime - Time delta in days
     * @returns {Object} Updated state
     */
    processTransfers(state, deltaTime) {
        const newState = JSON.parse(JSON.stringify(state));  // Deep clone
        
        const activeTransfers = newState.active_transfers || [];
        const probesByZone = newState.probes_by_zone || {};
        const currentTime = newState.time || 0;
        
        const completedTransfers = [];
        
        for (let i = 0; i < activeTransfers.length; i++) {
            const transfer = activeTransfers[i];
            
            if (transfer.status === 'paused') {
                continue;  // Skip paused transfers
            }
            
            // Check if transfer completed
            if (transfer.arrival_time <= currentTime && transfer.status === 'traveling') {
                // Transfer completed - move probes
                this.completeTransfer(newState, transfer);
                completedTransfers.push(i);
            }
        }
        
        // Remove completed transfers (in reverse order to maintain indices)
        for (let i = completedTransfers.length - 1; i >= 0; i--) {
            activeTransfers.splice(completedTransfers[i], 1);
        }
        
        newState.active_transfers = activeTransfers;
        return newState;
    }
    
    /**
     * Complete a transfer (move probes to destination)
     * @param {Object} state - Game state (mutated)
     * @param {Object} transfer - Transfer object
     */
    completeTransfer(state, transfer) {
        const probesByZone = state.probes_by_zone || {};
        const fromZoneId = transfer.from_zone;
        const toZoneId = transfer.to_zone;
        const probeType = transfer.probe_type || 'probe';
        const probeCount = transfer.probe_count || 0;
        
        // Remove probes from source zone
        if (probesByZone[fromZoneId] && probesByZone[fromZoneId][probeType]) {
            probesByZone[fromZoneId][probeType] = Math.max(0, 
                probesByZone[fromZoneId][probeType] - probeCount
            );
        }
        
        // Add probes to destination zone
        if (!probesByZone[toZoneId]) {
            probesByZone[toZoneId] = {};
        }
        if (!probesByZone[toZoneId][probeType]) {
            probesByZone[toZoneId][probeType] = 0;
        }
        probesByZone[toZoneId][probeType] += probeCount;
        
        // Mark transfer as completed
        transfer.status = 'completed';
        
        state.probes_by_zone = probesByZone;
    }
    
    /**
     * Create a new transfer
     * @param {Object} state - Game state
     * @param {string} fromZoneId - Source zone
     * @param {string} toZoneId - Destination zone
     * @param {string} probeType - Probe type
     * @param {number} probeCount - Number of probes
     * @param {Object} skills - Current skills
     * @returns {Object} Transfer object
     */
    createTransfer(state, fromZoneId, toZoneId, probeType, probeCount, skills) {
        const currentTime = state.time || 0;
        
        // Calculate delta-v and transfer time
        const deltaV = this.orbitalMechanics.calculateDeltaV(fromZoneId, toZoneId, skills.propulsion);
        const transferTime = this.orbitalMechanics.calculateTransferTime(fromZoneId, toZoneId, skills.propulsion);
        
        const transfer = {
            id: this.generateTransferId(),
            from_zone: fromZoneId,
            to_zone: toZoneId,
            probe_type: probeType,
            probe_count: probeCount,
            departure_time: currentTime,
            arrival_time: currentTime + transferTime,
            delta_v_cost: deltaV,
            status: 'traveling'
        };
        
        return transfer;
    }
    
    /**
     * Generate unique transfer ID
     * @returns {string}
     */
    generateTransferId() {
        return 'transfer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Add transfer to state
     * @param {Object} state - Game state
     * @param {Object} transfer - Transfer object
     * @returns {Object} Updated state
     */
    addTransfer(state, transfer) {
        const newState = JSON.parse(JSON.stringify(state));  // Deep clone
        
        const activeTransfers = newState.active_transfers || [];
        activeTransfers.push(transfer);
        
        newState.active_transfers = activeTransfers;
        return newState;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransferSystem;
}

