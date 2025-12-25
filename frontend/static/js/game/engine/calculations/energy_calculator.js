/**
 * Energy Calculator
 * 
 * Energy production and consumption calculations
 * All in watts (instantaneous power)
 */

class EnergyCalculator {
    constructor(orbitalMechanics) {
        this.orbitalMechanics = orbitalMechanics;
        this.economicRules = null;
        
        // BASE energy costs per activity (watts per probe doing that activity)
        // These are reduced by skills and research upgrades
        // Only mining and slag recycling consume energy - other activities are "free"
        this.BASE_ENERGY_COST_MINING = 500000;           // 500 kW per mining probe
        this.BASE_ENERGY_COST_RECYCLE_SLAG = 300000;     // 300 kW per slag recycling probe
        
        // BASE structure energy cost (for building operational power calculations)
        this.BASE_STRUCTURE_ENERGY_COST = 250000;        // 250 kW base for structure energy multipliers
        
        // BASE energy production per probe (watts)
        this.BASE_ENERGY_PRODUCTION_PROBE = 100000;   // 100 kW per probe
    }
    
    /**
     * Initialize with economic rules (for skill coefficients)
     * @param {Object} economicRules - Economic rules from data loader
     */
    initializeEconomicRules(economicRules) {
        this.economicRules = economicRules;
    }
    
    /**
     * Build skill values array from coefficients and skills
     * @param {Object} coefficients - Skill coefficients { skillName: coefficient }
     * @param {Object} skills - Current skills from research
     * @returns {Array<number>} Array of (coefficient * skill) values
     */
    buildSkillValues(coefficients, skills) {
        if (!coefficients) return [1.0];
        
        const values = [];
        for (const [skillName, coefficient] of Object.entries(coefficients)) {
            if (skillName === 'description') continue; // Skip description field
            
            // Map skill names to actual skill values
            let skillValue = 1.0;
            switch (skillName) {
                case 'robotic':
                    skillValue = skills.robotic || skills.manipulation || 1.0;
                    break;
                case 'computer':
                    skillValue = skills.computer?.total || 1.0;
                    break;
                case 'solar_pv':
                    skillValue = skills.solar_pv || skills.energy_collection || 1.0;
                    break;
                default:
                    skillValue = skills[skillName] || 1.0;
            }
            
            values.push(coefficient * skillValue);
        }
        
        return values.length > 0 ? values : [1.0];
    }
    
    /**
     * Calculate tech tree upgrade factor using geometric mean
     * Formula: F = G^alpha where G = (c1*s1 * c2*s2 * ... * cn*sn)^(1/n)
     * @param {Array<number>} skillValues - Array of (skill * coefficient) values
     * @param {number} alpha - Tech growth scale factor (default 0.75)
     * @returns {number} Tech tree upgrade factor
     */
    calculateTechTreeUpgradeFactor(skillValues, alpha = 0.75) {
        if (!skillValues || skillValues.length === 0) return 1.0;
        
        // Filter out zero/negative values (safety check)
        const validValues = skillValues.filter(v => v > 0);
        if (validValues.length === 0) return 1.0;
        
        // Calculate geometric mean: G = (v1 * v2 * ... * vn)^(1/n)
        const product = validValues.reduce((prod, val) => prod * val, 1.0);
        const geometricMean = Math.pow(product, 1.0 / validValues.length);
        
        // Calculate log(G)
        const logG = Math.log(geometricMean);
        
        // F = exp(alpha * log(G)) = G^alpha
        const factor = Math.exp(alpha * logG);
        
        return factor;
    }
    
    /**
     * Calculate upgrade factor from skill coefficients
     * @param {string} category - Category name (e.g., 'probe_energy_production')
     * @param {Object} skills - Current skills
     * @param {number} alpha - Alpha factor (default from config)
     * @returns {number} Upgrade factor
     */
    calculateUpgradeFactorFromCoefficients(category, skills, alpha = null) {
        if (!this.economicRules || !this.economicRules.skill_coefficients) {
            return 1.0;
        }
        
        const coefficients = this.economicRules.skill_coefficients[category];
        if (!coefficients) {
            return 1.0;
        }
        
        const skillValues = this.buildSkillValues(coefficients, skills);
        const alphaFactor = alpha !== null ? alpha : (this.economicRules.alpha_factors?.probe_performance || 0.75);
        return this.calculateTechTreeUpgradeFactor(skillValues, alphaFactor);
    }
    
    /**
     * Calculate effective energy cost for an activity, reduced by skills
     * Uses config-driven skill coefficients for probe energy consumption reduction
     * @param {number} baseCost - Base energy cost in watts
     * @param {Object} skills - Current skills object
     * @param {string} activityType - Type of activity (mining, recycle_slag)
     * @returns {number} Effective energy cost in watts
     */
    getEffectiveEnergyCost(baseCost, skills, activityType) {
        // Start with base cost
        let effectiveCost = baseCost;
        
        // Apply general probe energy consumption reduction from config
        const consumptionReductionFactor = this.calculateUpgradeFactorFromCoefficients('probe_energy_consumption', skills);
        effectiveCost /= consumptionReductionFactor;
        
        // Apply activity-specific modifiers (legacy support, can be removed if not needed)
        // Only mining and slag recycling have energy costs
        switch (activityType) {
            case 'mining':
                // Mining efficiency also reduces mining energy cost
                effectiveCost /= (skills.production || 1.0);
                break;
                
            case 'recycle_slag':
                // Slag recycling also uses recycling and materials skills
                effectiveCost /= (skills.recycling || 1.0);
                effectiveCost /= (skills.materials || 1.0);
                break;
        }
        
        return effectiveCost;
    }
    
    /**
     * Calculate energy production from probes
     * Each probe generates base energy production, multiplied by skill-based upgrade factors
     * @param {Object} probesByZone - Probes by zone
     * @param {Object} skills - Current skills (for potential upgrades)
     * @returns {number} Total energy production from probes in watts
     */
    calculateProbeEnergyProduction(probesByZone, skills) {
        let totalProduction = 0;
        
        // Use config-driven skill coefficients for probe energy production
        const productionUpgradeFactor = this.calculateUpgradeFactorFromCoefficients('probe_energy_production', skills);
        
        for (const zoneId in probesByZone) {
            const zoneProbes = probesByZone[zoneId] || {};
            const totalProbes = zoneProbes['probe'] || 0;
            
            if (totalProbes > 0) {
                // Each probe produces base energy, multiplied by skill-based upgrade factor
                const probeProduction = totalProbes * this.BASE_ENERGY_PRODUCTION_PROBE * productionUpgradeFactor;
                totalProduction += probeProduction;
            }
        }
        
        return totalProduction;
    }
    
    /**
     * Calculate energy production from structures
     * Uses new multiplier-based system with structure upgrade factors
     * @param {Object} structuresByZone - Structures by zone
     * @param {Object} buildings - Building definitions
     * @param {Object} state - Game state (to get pre-calculated upgrade factors)
     * @returns {number} Total energy production in watts
     */
    calculateStructureEnergyProduction(structuresByZone, buildings, state) {
        let totalProduction = 0;
        
        // Check all building types for energy production capability
        // Handle both formats: buildings.buildings (nested) or buildings (direct)
        const allBuildings = buildings?.buildings || buildings || {};
        
        if (!allBuildings || Object.keys(allBuildings).length === 0) {
            console.warn('[EnergyCalculator] No buildings provided to calculateStructureEnergyProduction');
            return 0;
        }
        
        for (const zoneId in structuresByZone) {
            const zoneStructures = structuresByZone[zoneId] || {};
            
            for (const [buildingId, building] of Object.entries(allBuildings)) {
                const count = zoneStructures[buildingId] || 0;
                if (count === 0) continue;
                
                // Check if building has power output
                if (building.power_output_mw) {
                    // New multiplier-based system
                    const basePowerMW = building.power_output_mw;
                    const basePowerW = basePowerMW * 1e6; // Convert MW to watts
                    
                    // Apply structure performance upgrade factor
                    const perfFactor = state.upgrade_factors?.structure?.energy?.performance || 1.0;
                    
                    // Apply zone efficiency
                    const zoneEfficiency = building.orbital_efficiency?.[zoneId] || 1.0;
                    
                    // Apply geometric scaling to benefits (same as cost scaling: count^2.1)
                    const geometricFactor = Math.pow(count, 2.1);
                    const effectiveProduction = basePowerW * geometricFactor * zoneEfficiency * perfFactor;
                    totalProduction += effectiveProduction;
                } else if (building.effects?.energy_production_per_second) {
                    // Legacy system fallback
                    const baseProduction = building.effects.energy_production_per_second;
                    const upgradeFactor = state.tech_upgrade_factors?.energy_generation || 1.0;
                    const zoneEfficiency = building.orbital_efficiency?.[zoneId] || 1.0;
                    // Apply geometric scaling to benefits (same as cost scaling: count^2.1)
                    const geometricFactor = Math.pow(count, 2.1);
                    const effectiveProduction = baseProduction * geometricFactor * zoneEfficiency * upgradeFactor;
                    totalProduction += effectiveProduction;
                }
            }
        }
        
        // Dyson sphere energy production
        // Dyson power = mass * power_per_kg * energy_collection_skill
        // This will be calculated separately in DysonSystem
        
        return totalProduction;
    }
    
    /**
     * Calculate energy consumption from probes (activity-based)
     * Only mining and slag recycling consume energy - other activities are "free"
     * Energy costs are reduced by relevant skills and research upgrades
     * @param {Object} probesByZone - Probes by zone
     * @param {Object} probeAllocationsByZone - Probe allocations
     * @param {Object} skills - Current skills
     * @param {Object} state - Game state (unused, kept for API compatibility)
     * @returns {number} Total energy consumption in watts
     */
    calculateProbeEnergyConsumption(probesByZone, probeAllocationsByZone, skills, state = null) {
        let totalConsumption = 0;
        
        // Calculate effective energy costs based on current skills
        // Only mining and slag recycling consume energy
        const miningCost = this.getEffectiveEnergyCost(this.BASE_ENERGY_COST_MINING, skills, 'mining');
        const recycleSlagCost = this.getEffectiveEnergyCost(this.BASE_ENERGY_COST_RECYCLE_SLAG, skills, 'recycle_slag');
        
        for (const zoneId in probesByZone) {
            const zoneProbes = probesByZone[zoneId] || {};
            const totalProbes = zoneProbes['probe'] || 0;
            
            if (totalProbes === 0) continue;
            
            // Get allocations for this zone
            const allocations = probeAllocationsByZone[zoneId] || {};
            const harvestAllocation = allocations.harvest || 0;
            const recycleAllocation = allocations.recycle || 0;  // Slag recycling
            
            // Calculate probes doing each activity that costs energy
            const miningProbes = totalProbes * harvestAllocation;
            const recycleSlagProbes = totalProbes * recycleAllocation;
            
            // Calculate consumption by activity type (using skill-adjusted costs)
            // Only mining and slag recycling have energy costs
            let zoneConsumption = 0;
            zoneConsumption += miningProbes * miningCost;
            zoneConsumption += recycleSlagProbes * recycleSlagCost;
            
            totalConsumption += zoneConsumption;
        }
        
        return totalConsumption;
    }
    
    /**
     * Calculate energy consumption from structures
     * @param {Object} structuresByZone - Structures by zone
     * @param {Object} buildings - Building definitions
     * @param {Object} state - Game state (for research upgrades)
     * @returns {number} Total energy consumption in watts
     */
    calculateStructureEnergyConsumption(structuresByZone, buildings, state = null) {
        let totalConsumption = 0;
        
        // Check all building types for energy consumption
        // Handle both formats: buildings.buildings (nested) or buildings (direct)
        const allBuildings = buildings?.buildings || buildings || {};
        
        for (const zoneId in structuresByZone) {
            const zoneStructures = structuresByZone[zoneId] || {};
            
            for (const [buildingId, building] of Object.entries(allBuildings)) {
                const count = zoneStructures[buildingId] || 0;
                if (count === 0) continue;
                
                // Check if building has energy cost multiplier
                if (building.energy_cost_multiplier !== undefined) {
                    // New multiplier-based system
                    if (building.energy_cost_multiplier === 0) continue;
                    
                    // Buildings use base structure energy cost (250kW), multiplied by their multiplier
                    const baseCost = this.BASE_STRUCTURE_ENERGY_COST * building.energy_cost_multiplier;
                    
                    // Get cost upgrade factor (energy costs decrease with research, so divide by cost factor)
                    const costFactor = state?.upgrade_factors?.structure?.building?.cost || 1.0;
                    
                    // Energy cost decreases with research
                    let effectiveCost = baseCost / costFactor;
                    
                    // Apply transport research upgrades to mass driver operational power
                    if (buildingId === 'mass_driver' && state?.skills) {
                        const transportSkill = state.skills.energy_transport || 1.0;
                        effectiveCost = effectiveCost / transportSkill;
                    }
                    
                    totalConsumption += effectiveCost * count;
                } else {
                    // Legacy system fallback
                    const baseConsumption = building.effects?.energy_consumption_per_second || 0;
                    if (baseConsumption > 0) {
                        totalConsumption += baseConsumption * count;
                    }
                }
            }
        }
        
        return totalConsumption;
    }
    
    /**
     * Calculate net energy (production - consumption)
     * @param {Object} state - Game state
     * @param {Object} buildings - Building definitions
     * @param {Object} skills - Current skills (still needed for energy consumption calculations)
     * @param {number} dysonEnergyProduction - Energy from Dyson sphere (watts)
     * @returns {Object} Energy balance
     */
    calculateEnergyBalance(state, buildings, skills, dysonEnergyProduction = 0) {
        const structuresByZone = state.structures_by_zone || {};
        const probesByZone = state.probes_by_zone || {};
        const probeAllocationsByZone = state.probe_allocations_by_zone || {};
        
        // Base energy production (player starts with this)
        const baseProduction = state.base_energy_production || 0;
        
        // Calculate production from probes + structures + Dyson + base production
        const probeProduction = this.calculateProbeEnergyProduction(probesByZone, skills);
        const structureProduction = this.calculateStructureEnergyProduction(structuresByZone, buildings, state);
        const production = baseProduction + probeProduction + structureProduction + dysonEnergyProduction;
        
        // Calculate consumption from probes (activity-based) + structures
        const probeConsumption = this.calculateProbeEnergyConsumption(probesByZone, probeAllocationsByZone, skills, state);
        const structureConsumption = this.calculateStructureEnergyConsumption(structuresByZone, buildings, state);
        
        const totalConsumption = probeConsumption + structureConsumption;
        const netEnergy = production - totalConsumption;
        
        // Calculate throttle factor (if negative energy, throttle production)
        // If consumption is 0, throttle is 1.0 (no throttling needed)
        // If production is 0 but consumption > 0, throttle is 0 (complete shutdown)
        // Otherwise, throttle = production / consumption (capped at 1.0)
        const throttle = totalConsumption > 0 
            ? (production > 0 ? Math.min(1.0, production / totalConsumption) : 0)
            : 1.0;
        
        return {
            production,
            consumption: totalConsumption,
            probeProduction,
            probeConsumption,
            structureConsumption,
            baseProduction,
            net: netEnergy,
            throttle: throttle
        };
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnergyCalculator;
}

