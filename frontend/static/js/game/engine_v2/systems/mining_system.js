/**
 * Mining System
 * 
 * Zone mining and depletion
 * All rates in kg/day
 */

class MiningSystem {
    constructor(productionCalculator, orbitalMechanics) {
        this.productionCalculator = productionCalculator;
        this.orbitalMechanics = orbitalMechanics;
    }
    
    /**
     * Process mining for all zones
     * @param {Object} state - Game state
     * @param {number} deltaTime - Time delta in days
     * @param {Object} skills - Current skills
     * @param {Object} buildings - Building definitions
     * @param {number} energyThrottle - Energy throttle factor (0-1)
     * @returns {Object} Updated state
     */
    processMining(state, deltaTime, skills, buildings, energyThrottle = 1.0) {
        const profiler = typeof self !== 'undefined' && self.performanceProfiler 
            ? self.performanceProfiler 
            : (typeof window !== 'undefined' && window.performanceProfiler ? window.performanceProfiler : null);
        const cloneStart = profiler ? performance.now() : null;
        const newState = JSON.parse(JSON.stringify(state));  // Deep clone
        if (profiler && cloneStart !== null) {
            profiler.recordStateCloneTime(performance.now() - cloneStart);
        }
        
        const zones = newState.zones || {};
        const probesByZone = newState.probes_by_zone || {};
        const probeAllocationsByZone = newState.probe_allocations_by_zone || {};
        const structuresByZone = newState.structures_by_zone || {};
        
        const profiler = typeof self !== 'undefined' && self.performanceProfiler 
            ? self.performanceProfiler 
            : (typeof window !== 'undefined' && window.performanceProfiler ? window.performanceProfiler : null);
        
        for (const zoneId in zones) {
            const zone = zones[zoneId];
            
            // Skip Dyson zone (no mining)
            if (this.orbitalMechanics.isDysonZone(zoneId)) {
                continue;
            }
            
            // Skip if depleted
            if (zone.depleted) {
                continue;
            }
            
            // Calculate mining rate
            const zoneProbes = probesByZone[zoneId] || {};
            const probeCountStart = profiler ? performance.now() : null;
            const totalProbes = Object.values(zoneProbes).reduce((sum, count) => sum + (count || 0), 0);
            if (profiler && probeCountStart !== null) {
                const probeCountTime = performance.now() - probeCountStart;
                if (probeCountTime > 0.1) {
                    profiler.recordProbeIterationTime(probeCountTime);
                }
            }
            const allocations = probeAllocationsByZone[zoneId] || {};
            const harvestAllocation = allocations.harvest || 0;
            
            // Probe mining
            const miningProbes = totalProbes * harvestAllocation;
            const probeMiningRate = this.productionCalculator.calculateMiningRate(miningProbes, zoneId, skills);
            
            // Structure mining
            const structureMiningRate = this.productionCalculator.calculateStructureMiningRate(
                structuresByZone, zoneId, buildings, skills
            );
            
            const totalMiningRate = probeMiningRate + structureMiningRate;
            
            // Apply energy throttle
            const effectiveMiningRate = totalMiningRate * energyThrottle;
            
            // Extract metal
            const metalExtracted = effectiveMiningRate * deltaTime;
            const metalRemaining = zone.metal_remaining || 0;
            const actualExtraction = Math.min(metalExtracted, metalRemaining);
            
            // Calculate slag production (non-metal mass)
            const metallicity = this.orbitalMechanics.getZoneMetallicity(zoneId);
            const totalMassExtracted = actualExtraction / metallicity;  // Total mass = metal / metallicity
            const slagProduced = totalMassExtracted - actualExtraction;
            
            // Update zone
            zone.metal_remaining = Math.max(0, metalRemaining - actualExtraction);
            zone.mass_remaining = Math.max(0, (zone.mass_remaining || 0) - totalMassExtracted);
            zone.slag_produced = (zone.slag_produced || 0) + slagProduced;
            
            // Check if depleted
            if (zone.metal_remaining <= 0) {
                zone.depleted = true;
            }
            
            // Add metal to global pool
            newState.metal = (newState.metal || 0) + actualExtraction;
            
            // Add slag to global pool
            newState.slag = (newState.slag || 0) + slagProduced;
        }
        
        newState.zones = zones;
        return newState;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MiningSystem;
}

