/**
 * Energy Calculator
 * 
 * Energy production and consumption calculations
 * All in watts (instantaneous power)
 */

class EnergyCalculator {
    constructor(orbitalMechanics) {
        this.orbitalMechanics = orbitalMechanics;
        
        // Base energy consumption per probe (watts)
        this.BASE_PROBE_ENERGY = 100000;  // 100 kW per probe
    }
    
    /**
     * Calculate energy production from structures
     * @param {Object} structuresByZone - Structures by zone
     * @param {Object} buildings - Building definitions
     * @param {Object} skills - Current skills
     * @returns {number} Total energy production in watts
     */
    calculateEnergyProduction(structuresByZone, buildings, skills) {
        let totalProduction = 0;
        
        // Find all energy structures
        const energyBuildings = buildings?.energy || [];
        
        for (const zoneId in structuresByZone) {
            const zoneStructures = structuresByZone[zoneId] || {};
            
            for (const building of energyBuildings) {
                const count = zoneStructures[building.id] || 0;
                if (count === 0) continue;
                
                // Get production rate from building (should be in watts)
                // Note: buildings.json uses "energy_production_per_second"
                // We need watts, so if it's per second, it's already watts
                const baseProduction = building.effects?.energy_production_per_second || 0;
                
                // Apply zone efficiency
                const zoneEfficiency = building.orbital_efficiency?.[zoneId] || 1.0;
                
                // Apply energy collection skill
                const effectiveProduction = baseProduction * count * zoneEfficiency * skills.energy_collection;
                
                totalProduction += effectiveProduction;
            }
            
            // Also check omni structures for energy production
            const omniBuildings = buildings?.omni || [];
            for (const building of omniBuildings) {
                const count = zoneStructures[building.id] || 0;
                if (count === 0) continue;
                
                const baseProduction = building.effects?.energy_production_per_second || 0;
                const zoneEfficiency = building.orbital_efficiency?.[zoneId] || 1.0;
                const effectiveProduction = baseProduction * count * zoneEfficiency * skills.energy_collection;
                
                totalProduction += effectiveProduction;
            }
        }
        
        // Dyson sphere energy production
        // Dyson power = mass * power_per_kg * energy_collection_skill
        // This will be calculated separately in DysonSystem
        
        return totalProduction;
    }
    
    /**
     * Calculate energy consumption from probes
     * @param {Object} probesByZone - Probes by zone
     * @param {Object} probeAllocationsByZone - Probe allocations
     * @param {Object} skills - Current skills
     * @returns {number} Total energy consumption in watts
     */
    calculateProbeEnergyConsumption(probesByZone, probeAllocationsByZone, skills) {
        let totalConsumption = 0;
        
        const profiler = typeof self !== 'undefined' && self.performanceProfiler 
            ? self.performanceProfiler 
            : (typeof window !== 'undefined' && window.performanceProfiler ? window.performanceProfiler : null);
        
        for (const zoneId in probesByZone) {
            const zoneProbes = probesByZone[zoneId] || {};
            const probeCountStart = profiler ? performance.now() : null;
            const totalProbes = Object.values(zoneProbes).reduce((sum, count) => sum + (count || 0), 0);
            if (profiler && probeCountStart !== null) {
                const probeCountTime = performance.now() - probeCountStart;
                if (probeCountTime > 0.1) {
                    profiler.recordProbeIterationTime(probeCountTime);
                }
            }
            
            if (totalProbes === 0) continue;
            
            // Get allocations for this zone
            const allocations = probeAllocationsByZone[zoneId] || {};
            const harvestAllocation = allocations.harvest || 0;
            const constructAllocation = allocations.construct || 0;
            const replicateAllocation = allocations.replicate || 0;
            const dysonAllocation = allocations.dyson || 0;
            
            // Active probes (those doing work) consume energy
            const activeProbes = totalProbes * (harvestAllocation + constructAllocation + replicateAllocation + dysonAllocation);
            
            // Base consumption per active probe
            let consumptionPerProbe = this.BASE_PROBE_ENERGY;
            
            // Apply propulsion skill (reduces energy cost)
            // Skill acts as efficiency: consumption = base / (1 + skill_bonus)
            const propulsionBonus = skills.propulsion - 1.0;
            consumptionPerProbe = consumptionPerProbe / (1 + propulsionBonus * 0.5);
            
            // Apply production skill (also reduces energy cost)
            const productionBonus = skills.production - 1.0;
            consumptionPerProbe = consumptionPerProbe / (1 + productionBonus * 0.3);
            
            totalConsumption += activeProbes * consumptionPerProbe;
        }
        
        return totalConsumption;
    }
    
    /**
     * Calculate energy consumption from structures
     * @param {Object} structuresByZone - Structures by zone
     * @param {Object} buildings - Building definitions
     * @returns {number} Total energy consumption in watts
     */
    calculateStructureEnergyConsumption(structuresByZone, buildings) {
        let totalConsumption = 0;
        
        // All structure types can consume energy
        const allBuildings = [
            ...(buildings?.energy || []),
            ...(buildings?.mining || []),
            ...(buildings?.factories || []),
            ...(buildings?.transport || []),
            ...(buildings?.recycling || []),
            ...(buildings?.omni || [])
        ];
        
        for (const zoneId in structuresByZone) {
            const zoneStructures = structuresByZone[zoneId] || {};
            
            for (const building of allBuildings) {
                const count = zoneStructures[building.id] || 0;
                if (count === 0) continue;
                
                // Get consumption rate from building (should be in watts)
                const baseConsumption = building.effects?.energy_consumption_per_second || 0;
                
                totalConsumption += baseConsumption * count;
            }
        }
        
        return totalConsumption;
    }
    
    /**
     * Calculate net energy (production - consumption)
     * @param {Object} state - Game state
     * @param {Object} buildings - Building definitions
     * @param {Object} skills - Current skills
     * @param {number} dysonEnergyProduction - Energy from Dyson sphere (watts)
     * @returns {Object} Energy balance
     */
    calculateEnergyBalance(state, buildings, skills, dysonEnergyProduction = 0) {
        const structuresByZone = state.structures_by_zone || {};
        const probesByZone = state.probes_by_zone || {};
        const probeAllocationsByZone = state.probe_allocations_by_zone || {};
        
        const production = this.calculateEnergyProduction(structuresByZone, buildings, skills) + dysonEnergyProduction;
        const probeConsumption = this.calculateProbeEnergyConsumption(probesByZone, probeAllocationsByZone, skills);
        const structureConsumption = this.calculateStructureEnergyConsumption(structuresByZone, buildings);
        
        const totalConsumption = probeConsumption + structureConsumption;
        const netEnergy = production - totalConsumption;
        
        // Calculate throttle factor (if negative energy, throttle production)
        const throttle = production > 0 ? Math.min(1.0, production / Math.max(1, totalConsumption)) : 0;
        
        return {
            production,
            consumption: totalConsumption,
            probeConsumption,
            structureConsumption,
            net: netEnergy,
            throttle: throttle
        };
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnergyCalculator;
}

