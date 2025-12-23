/**
 * Probe System
 * 
 * Probe operations: mining, building, replication
 * All rates in kg/day
 */

class ProbeSystem {
    constructor(productionCalculator) {
        this.productionCalculator = productionCalculator;
        
        // Probe mass (kg)
        this.PROBE_MASS = 100;  // kg per probe
    }
    
    /**
     * Process probe operations for a zone
     * @param {Object} state - Game state
     * @param {string} zoneId - Zone identifier
     * @param {number} deltaTime - Time delta in days
     * @param {Object} skills - Current skills
     * @param {Object} buildings - Building definitions
     * @returns {Object} Updated state
     */
    processProbeOperations(state, zoneId, deltaTime, skills, buildings) {
        const profiler = typeof self !== 'undefined' && self.performanceProfiler 
            ? self.performanceProfiler 
            : (typeof window !== 'undefined' && window.performanceProfiler ? window.performanceProfiler : null);
        const cloneStart = profiler ? performance.now() : null;
        const newState = JSON.parse(JSON.stringify(state));  // Deep clone
        if (profiler && cloneStart !== null) {
            profiler.recordStateCloneTime(performance.now() - cloneStart);
        }
        
        const probesByZone = newState.probes_by_zone || {};
        const probeAllocationsByZone = newState.probe_allocations_by_zone || {};
        const constructionProgress = newState.construction_progress || {};
        
        const zoneProbes = probesByZone[zoneId] || {};
        const probeCountStart = profiler ? performance.now() : null;
        const totalProbes = Object.values(zoneProbes).reduce((sum, count) => sum + (count || 0), 0);
        if (profiler && probeCountStart !== null) {
            const probeCountTime = performance.now() - probeCountStart;
            if (probeCountTime > 0.1) {
                profiler.recordProbeIterationTime(probeCountTime);
            }
        }
        
        if (totalProbes === 0) return newState;
        
        const allocations = probeAllocationsByZone[zoneId] || {};
        const constructAllocation = allocations.construct || 0;
        const replicateAllocation = allocations.replicate || 0;
        
        // Calculate building rate
        const buildingProbes = totalProbes * constructAllocation;
        const buildingRate = this.productionCalculator.calculateBuildingRate(buildingProbes, skills);
        
        // Allocate building between structures and probes
        // For now, assume all building goes to replication (probes)
        // Structure building is handled separately in StructureSystem
        
        // Process replication
        if (replicateAllocation > 0) {
            const replicationRate = buildingRate * replicateAllocation;
            this.processReplication(newState, zoneId, replicationRate, deltaTime);
        }
        
        return newState;
    }
    
    /**
     * Process probe replication
     * @param {Object} state - Game state (mutated)
     * @param {string} zoneId - Zone identifier
     * @param {number} replicationRate - Replication rate in kg/day
     * @param {number} deltaTime - Time delta in days
     */
    processReplication(state, zoneId, replicationRate, deltaTime) {
        const constructionProgress = state.construction_progress || {};
        const probesByZone = state.probes_by_zone || {};
        
        // Initialize probe construction progress if needed
        if (!constructionProgress.probes) {
            constructionProgress.probes = {};
        }
        
        // For now, assume single probe type 'probe'
        const probeType = 'probe';
        const currentProgress = constructionProgress.probes[probeType] || 0;
        
        // Add progress
        const progressAdded = replicationRate * deltaTime;
        const newProgress = currentProgress + progressAdded;
        
        // Check if probe completed
        if (newProgress >= this.PROBE_MASS) {
            // Complete probe
            const probesToAdd = Math.floor(newProgress / this.PROBE_MASS);
            const remainingProgress = newProgress % this.PROBE_MASS;
            
            // Add probes to zone
            if (!probesByZone[zoneId]) {
                probesByZone[zoneId] = {};
            }
            if (!probesByZone[zoneId][probeType]) {
                probesByZone[zoneId][probeType] = 0;
            }
            probesByZone[zoneId][probeType] += probesToAdd;
            
            constructionProgress.probes[probeType] = remainingProgress;
        } else {
            constructionProgress.probes[probeType] = newProgress;
        }
        
        state.construction_progress = constructionProgress;
        state.probes_by_zone = probesByZone;
    }
    
    /**
     * Calculate total dexterity across all zones
     * @param {Object} state - Game state
     * @param {Object} skills - Current skills
     * @returns {number} Total dexterity
     */
    calculateTotalDexterity(state, skills) {
        return this.productionCalculator.calculateTotalDexterity(state.probes_by_zone || {}, skills);
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProbeSystem;
}

