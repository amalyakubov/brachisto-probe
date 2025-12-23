/**
 * Structure System
 * 
 * Structure construction and operation
 * All rates in kg/day
 */

class StructureSystem {
    constructor(productionCalculator) {
        this.productionCalculator = productionCalculator;
    }
    
    /**
     * Process structure construction for all zones
     * @param {Object} state - Game state
     * @param {number} deltaTime - Time delta in days
     * @param {Object} skills - Current skills
     * @param {Object} buildings - Building definitions
     * @param {number} energyThrottle - Energy throttle factor (0-1)
     * @returns {Object} Updated state
     */
    processStructureConstruction(state, deltaTime, skills, buildings, energyThrottle = 1.0) {
        const newState = JSON.parse(JSON.stringify(state));  // Deep clone
        
        const structuresByZone = newState.structures_by_zone || {};
        const probesByZone = newState.probes_by_zone || {};
        const probeAllocationsByZone = newState.probe_allocations_by_zone || {};
        const constructionProgress = newState.construction_progress || {};
        
        // Initialize structure construction progress if needed
        if (!constructionProgress.structures) {
            constructionProgress.structures = {};
        }
        
        for (const zoneId in structuresByZone) {
            // Get building rate for this zone
            const zoneProbes = probesByZone[zoneId] || {};
            const totalProbes = Object.values(zoneProbes).reduce((sum, count) => sum + (count || 0), 0);
            const allocations = probeAllocationsByZone[zoneId] || {};
            const constructAllocation = allocations.construct || 0;
            
            const buildingProbes = totalProbes * constructAllocation;
            const buildingRate = this.productionCalculator.calculateBuildingRate(buildingProbes, skills);
            
            // Apply energy throttle
            const effectiveBuildingRate = buildingRate * energyThrottle;
            
            // For now, we'll handle structure construction when user purchases structures
            // This system will handle ongoing construction progress
            // Structure construction is typically instant (purchase = complete)
            // But we can track progress for multi-stage structures if needed
            
            // Initialize zone construction progress if needed
            if (!constructionProgress.structures[zoneId]) {
                constructionProgress.structures[zoneId] = {};
            }
        }
        
        newState.construction_progress = constructionProgress;
        return newState;
    }
    
    /**
     * Add structure to zone (called when user purchases structure)
     * @param {Object} state - Game state
     * @param {string} zoneId - Zone identifier
     * @param {string} structureId - Structure ID
     * @param {number} count - Number to add
     * @returns {Object} Updated state
     */
    addStructure(state, zoneId, structureId, count = 1) {
        const newState = JSON.parse(JSON.stringify(state));  // Deep clone
        
        const structuresByZone = newState.structures_by_zone || {};
        if (!structuresByZone[zoneId]) {
            structuresByZone[zoneId] = {};
        }
        
        if (!structuresByZone[zoneId][structureId]) {
            structuresByZone[zoneId][structureId] = 0;
        }
        
        structuresByZone[zoneId][structureId] += count;
        
        newState.structures_by_zone = structuresByZone;
        return newState;
    }
    
    /**
     * Remove structure from zone
     * @param {Object} state - Game state
     * @param {string} zoneId - Zone identifier
     * @param {string} structureId - Structure ID
     * @param {number} count - Number to remove
     * @returns {Object} Updated state
     */
    removeStructure(state, zoneId, structureId, count = 1) {
        const newState = JSON.parse(JSON.stringify(state));  // Deep clone
        
        const structuresByZone = newState.structures_by_zone || {};
        if (!structuresByZone[zoneId] || !structuresByZone[zoneId][structureId]) {
            return newState;  // Structure doesn't exist
        }
        
        structuresByZone[zoneId][structureId] = Math.max(0, structuresByZone[zoneId][structureId] - count);
        
        newState.structures_by_zone = structuresByZone;
        return newState;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StructureSystem;
}

