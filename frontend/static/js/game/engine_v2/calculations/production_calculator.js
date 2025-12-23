/**
 * Production Calculator
 * 
 * All rates measured in kg/day
 * - Mining rates
 * - Building rates
 * - Refining rates
 * - Probe production rates
 */

class ProductionCalculator {
    constructor(orbitalMechanics) {
        this.orbitalMechanics = orbitalMechanics;
        
        // Base rates (per probe, per day)
        this.BASE_MINING_RATE = 100.0;      // kg/day per probe
        this.BASE_BUILDING_RATE = 100.0;    // kg/day per probe
    }
    
    /**
     * Calculate mining rate for a zone
     * @param {number} probeCount - Number of probes allocated to mining
     * @param {string} zoneId - Zone identifier
     * @param {Object} skills - Current skills
     * @returns {number} Mining rate in kg/day
     */
    calculateMiningRate(probeCount, zoneId, skills) {
        if (probeCount <= 0) return 0;
        
        // Base rate per probe
        let rate = this.BASE_MINING_RATE * probeCount;
        
        // Apply skill multipliers
        rate *= skills.robotic;      // Dexterity multiplier
        rate *= skills.production;    // Production efficiency
        
        // Apply zone multiplier
        const zoneMultiplier = this.orbitalMechanics.getZoneMiningMultiplier(zoneId);
        rate *= zoneMultiplier;
        
        return rate;
    }
    
    /**
     * Calculate building rate (for structures and probes)
     * @param {number} probeCount - Number of probes allocated to building
     * @param {Object} skills - Current skills
     * @returns {number} Building rate in kg/day
     */
    calculateBuildingRate(probeCount, skills) {
        if (probeCount <= 0) return 0;
        
        // Base rate per probe
        let rate = this.BASE_BUILDING_RATE * probeCount;
        
        // Apply skill multipliers
        rate *= skills.robotic;      // Dexterity multiplier
        rate *= skills.production;   // Production efficiency
        
        return rate;
    }
    
    /**
     * Calculate total dexterity (for display purposes)
     * @param {Object} probesByZone - Probes by zone
     * @param {Object} skills - Current skills
     * @returns {number} Total dexterity
     */
    calculateTotalDexterity(probesByZone, skills) {
        const profiler = typeof self !== 'undefined' && self.performanceProfiler 
            ? self.performanceProfiler 
            : (typeof window !== 'undefined' && window.performanceProfiler ? window.performanceProfiler : null);
        const iterationStart = profiler ? performance.now() : null;
        
        let totalProbes = 0;
        for (const zoneId in probesByZone) {
            for (const probeType in probesByZone[zoneId]) {
                totalProbes += probesByZone[zoneId][probeType] || 0;
            }
        }
        
        if (profiler && iterationStart !== null) {
            const iterationTime = performance.now() - iterationStart;
            if (iterationTime > 0.1) {
                profiler.recordProbeIterationTime(iterationTime);
            }
        }
        
        // Dexterity = probe_count * base_dexterity * robotic_skill
        const baseDexterity = 1.0;
        return totalProbes * baseDexterity * skills.robotic;
    }
    
    /**
     * Calculate structure mining rate (from mining structures)
     * @param {Object} structuresByZone - Structures by zone
     * @param {string} zoneId - Zone identifier
     * @param {Object} buildings - Building definitions
     * @param {Object} skills - Current skills
     * @returns {number} Mining rate in kg/day
     */
    calculateStructureMiningRate(structuresByZone, zoneId, buildings, skills) {
        const zoneStructures = structuresByZone[zoneId] || {};
        let totalRate = 0;
        
        // Find all mining structures
        const miningBuildings = buildings?.mining || [];
        
        for (const building of miningBuildings) {
            const count = zoneStructures[building.id] || 0;
            if (count === 0) continue;
            
            // Get production rate from building (should be in kg/day)
            const baseRate = building.effects?.metal_production_per_day || 0;
            
            // Apply zone efficiency
            const zoneEfficiency = building.orbital_efficiency?.[zoneId] || 1.0;
            
            // Apply production skill
            const effectiveRate = baseRate * count * zoneEfficiency * skills.production;
            
            totalRate += effectiveRate;
        }
        
        // Also check omni structures for mining production
        const omniBuildings = buildings?.omni || [];
        for (const building of omniBuildings) {
            const count = zoneStructures[building.id] || 0;
            if (count === 0) continue;
            
            const baseRate = building.effects?.metal_production_per_day || 0;
            const zoneEfficiency = building.orbital_efficiency?.[zoneId] || 1.0;
            const effectiveRate = baseRate * count * zoneEfficiency * skills.production;
            
            totalRate += effectiveRate;
        }
        
        return totalRate;
    }
    
    /**
     * Calculate structure building rate (from factory structures)
     * @param {Object} structuresByZone - Structures by zone
     * @param {string} zoneId - Zone identifier
     * @param {Object} buildings - Building definitions
     * @param {Object} skills - Current skills
     * @returns {number} Building rate in kg/day
     */
    calculateStructureBuildingRate(structuresByZone, zoneId, buildings, skills) {
        const zoneStructures = structuresByZone[zoneId] || {};
        let totalRate = 0;
        
        // Find all factory structures
        const factoryBuildings = buildings?.factories || [];
        
        for (const building of factoryBuildings) {
            const count = zoneStructures[building.id] || 0;
            if (count === 0) continue;
            
            // Get production rate from building (should be in kg/day)
            const baseRate = building.effects?.probe_production_per_day || 
                           building.effects?.structure_production_per_day || 0;
            
            // Apply zone efficiency
            const zoneEfficiency = building.orbital_efficiency?.[zoneId] || 1.0;
            
            // Apply production skill
            const effectiveRate = baseRate * count * zoneEfficiency * skills.production;
            
            totalRate += effectiveRate;
        }
        
        // Also check omni structures for probe production
        const omniBuildings = buildings?.omni || [];
        for (const building of omniBuildings) {
            const count = zoneStructures[building.id] || 0;
            if (count === 0) continue;
            
            const baseRate = building.effects?.probe_production_per_day || 0;
            const zoneEfficiency = building.orbital_efficiency?.[zoneId] || 1.0;
            const effectiveRate = baseRate * count * zoneEfficiency * skills.production;
            
            totalRate += effectiveRate;
        }
        
        return totalRate;
    }
    
    /**
     * Calculate all production rates for a zone
     * @param {Object} state - Game state
     * @param {string} zoneId - Zone identifier
     * @param {Object} buildings - Building definitions
     * @param {Object} skills - Current skills
     * @returns {Object} Production rates
     */
    calculateZoneRates(state, zoneId, buildings, skills) {
        const probesByZone = state.probes_by_zone || {};
        const structuresByZone = state.structures_by_zone || {};
        const probeAllocationsByZone = state.probe_allocations_by_zone || {};
        
        const zoneProbes = probesByZone[zoneId] || {};
        const profiler = typeof self !== 'undefined' && self.performanceProfiler 
            ? self.performanceProfiler 
            : (typeof window !== 'undefined' && window.performanceProfiler ? window.performanceProfiler : null);
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
        const constructAllocation = allocations.construct || 0;
        
        // Probe-based rates
        const miningProbes = totalProbes * harvestAllocation;
        const buildingProbes = totalProbes * constructAllocation;
        
        const probeMiningRate = this.calculateMiningRate(miningProbes, zoneId, skills);
        const probeBuildingRate = this.calculateBuildingRate(buildingProbes, skills);
        
        // Structure-based rates
        const structureMiningRate = this.calculateStructureMiningRate(structuresByZone, zoneId, buildings, skills);
        const structureBuildingRate = this.calculateStructureBuildingRate(structuresByZone, zoneId, buildings, skills);
        
        return {
            mining: probeMiningRate + structureMiningRate,
            building: probeBuildingRate + structureBuildingRate,
            probeMining: probeMiningRate,
            probeBuilding: probeBuildingRate,
            structureMining: structureMiningRate,
            structureBuilding: structureBuildingRate
        };
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProductionCalculator;
}

