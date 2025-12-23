/**
 * Recycling System
 * 
 * Probe recycling of slag into metal
 * 75% efficiency: 1 kg slag → 0.75 kg metal + 0.25 kg slag
 */

class RecyclingSystem {
    constructor(compositeSkillsCalculator) {
        this.compositeSkillsCalculator = compositeSkillsCalculator;
    }
    
    /**
     * Process probe recycling for all zones
     * @param {Object} state - Game state
     * @param {number} deltaTime - Time delta in days
     * @param {Object} skills - Current skills
     * @returns {Object} Updated state
     */
    processRecycling(state, deltaTime, skills) {
        const newState = JSON.parse(JSON.stringify(state));  // Deep clone
        
        const zones = newState.zones || {};
        const probesByZone = newState.probes_by_zone || {};
        const probeAllocationsByZone = newState.probe_allocations_by_zone || {};
        
        for (const zoneId in zones) {
            const zone = zones[zoneId];
            const zoneProbes = probesByZone[zoneId] || {};
            const totalProbes = Object.values(zoneProbes).reduce((sum, count) => sum + (count || 0), 0);
            
            if (totalProbes === 0) continue;
            
            const allocations = probeAllocationsByZone[zoneId] || {};
            const recycleAllocation = allocations.recycle || 0;
            
            if (recycleAllocation === 0) continue;
            
            // Calculate recycling rate
            const recyclingProbes = totalProbes * recycleAllocation;
            const recycleSpeed = this.compositeSkillsCalculator.calculateProbeRecycleSpeed(skills);
            const totalRecycleRate = recycleSpeed * recyclingProbes;
            
            // Get available slag
            const slagAvailable = zone.slag_produced || 0;
            const slagRecycled = Math.min(
                totalRecycleRate * deltaTime,
                slagAvailable
            );
            
            if (slagRecycled <= 0) continue;
            
            // Calculate salvage efficiency (metal recovery fraction)
            const salvageEfficiency = this.compositeSkillsCalculator.calculateSalvageEfficiency(skills);
            
            // 75% base efficiency, improved by salvage efficiency
            const metalProduced = slagRecycled * salvageEfficiency;
            const slagRemaining = slagRecycled - metalProduced;
            
            // Update zone
            zone.slag_produced = Math.max(0, slagAvailable - slagRecycled + slagRemaining);
            zone.metal_remaining = (zone.metal_remaining || 0) + metalProduced;
            
            // Update global metal
            newState.metal = (newState.metal || 0) + metalProduced;
        }
        
        newState.zones = zones;
        return newState;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RecyclingSystem;
}

