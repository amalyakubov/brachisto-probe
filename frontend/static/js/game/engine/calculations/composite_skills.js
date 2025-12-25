/**
 * Composite Skills Calculator
 * 
 * Calculates composite performance metrics from base skills
 * These are used throughout the game for various operations
 */

class CompositeSkillsCalculator {
    constructor(orbitalMechanics) {
        this.orbitalMechanics = orbitalMechanics;
        this.economicRules = null;
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
     * @param {string} category - Category name (e.g., 'salvage_efficiency')
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
     * Calculate Dyson collector efficiency (solar power per kg)
     * @param {Object} skills - Current skills
     * @param {string} zoneId - Zone identifier
     * @returns {number} Watts per kg of Dyson mass
     */
    calculateDysonCollectorEfficiency(skills, zoneId) {
        const basePowerPerKg = 5000; // watts per kg
        const zoneMultiplier = this.orbitalMechanics.getZoneProductivityModifier(zoneId) || 1.0;
        
        return basePowerPerKg * 
               skills.solar_pv * 
               skills.thermal_efficiency * 
               skills.energy_converter * 
               zoneMultiplier;
    }
    
    /**
     * Calculate Dyson compute efficiency (FLOPS per kg)
     * @param {Object} skills - Current skills
     * @returns {number} FLOPS per kg of Dyson mass
     */
    calculateDysonComputeEfficiency(skills) {
        const baseFLOPSPerKg = 1e12; // 1 TFLOPS per kg base
        
        // Geometric mean of compute sub-skills
        const computeMultiplier = Math.pow(
            skills.cpu * skills.gpu * skills.interconnect * skills.io_bandwidth,
            0.25
        );
        
        return baseFLOPSPerKg * computeMultiplier * skills.learning;
    }
    
    /**
     * Calculate factory efficiency multiplier
     * @param {Object} skills - Current skills
     * @param {string} zoneId - Zone identifier
     * @returns {number} Production rate multiplier
     */
    calculateFactoryEfficiency(skills, zoneId) {
        const zoneMultiplier = this.orbitalMechanics.getZoneProductivityModifier(zoneId) || 1.0;
        
        return skills.manipulation * 
               skills.strength * 
               skills.production * 
               skills.materials * 
               zoneMultiplier;
    }
    
    /**
     * Calculate mining efficiency multiplier
     * @param {Object} skills - Current skills
     * @param {string} zoneId - Zone identifier
     * @returns {number} Mining rate multiplier
     */
    calculateMiningEfficiency(skills, zoneId) {
        const zoneMultiplier = this.orbitalMechanics.getZoneMiningMultiplier(zoneId) || 1.0;
        
        return skills.manipulation * 
               skills.strength * 
               skills.production * 
               skills.sensors * 
               zoneMultiplier;
    }
    
    /**
     * Calculate salvage efficiency (recycling fraction)
     * @param {Object} skills - Current skills
     * @returns {number} Metal recovery fraction (0-1)
     */
    calculateSalvageEfficiency(skills) {
        const baseRecyclingEfficiency = 0.75; // 75% base
        
        // Use config-driven coefficients if available
        const upgradeFactor = this.calculateUpgradeFactorFromCoefficients('salvage_efficiency', skills);
        
        // Base efficiency can improve up to 100% with research
        return Math.min(1.0, baseRecyclingEfficiency * upgradeFactor);
    }
    
    /**
     * Calculate replication efficiency multiplier
     * @param {Object} skills - Current skills
     * @returns {number} Replication rate multiplier
     */
    calculateReplicationEfficiency(skills) {
        return skills.manipulation * 
               skills.strength * 
               skills.production * 
               skills.materials;
    }
    
    /**
     * Calculate probe build speed (kg/day per probe)
     * @param {Object} skills - Current skills
     * @returns {number} kg/day per probe
     */
    calculateProbeBuildSpeed(skills) {
        const baseBuildRate = 100; // kg/day per probe
        
        return baseBuildRate * 
               skills.manipulation * 
               skills.strength * 
               skills.production;
    }
    
    /**
     * Calculate probe recycle speed (kg/day per probe) - for recycling slag
     * @param {Object} skills - Current skills
     * @returns {number} kg/day recycling rate per probe
     */
    calculateProbeRecycleSpeed(skills) {
        const baseRecycleRate = 50; // kg/day per probe
        
        return baseRecycleRate * 
               skills.manipulation * 
               skills.materials * 
               skills.recycling;
    }
    
    /**
     * Calculate probe self-recycle speed (kg/day per probe) - for recycling probes
     * Probes allocated to self-recycling dismantle probes at this rate
     * @param {Object} skills - Current skills
     * @returns {number} kg/day self-recycling rate per probe
     */
    calculateProbeSelfRecycleSpeed(skills) {
        const baseSelfRecycleRate = 5; // 5 kg/day per probe (base rate)
        
        return baseSelfRecycleRate * 
               skills.manipulation * 
               skills.materials * 
               skills.recycling;
    }
    
    /**
     * Calculate structure construction efficiency multiplier
     * @param {Object} skills - Current skills
     * @param {string} zoneId - Zone identifier
     * @returns {number} Construction rate multiplier
     */
    calculateStructureConstructionEfficiency(skills, zoneId) {
        const zoneMultiplier = this.orbitalMechanics.getZoneProductivityModifier(zoneId) || 1.0;
        
        return skills.manipulation * 
               skills.strength * 
               skills.production * 
               skills.materials * 
               zoneMultiplier;
    }
    
    /**
     * Calculate transfer efficiency (delta-v multiplier, lower is better)
     * @param {Object} skills - Current skills
     * @param {number} baseDeltaV - Base delta-v cost (unused, kept for API compatibility)
     * @returns {number} Effective delta-v multiplier
     */
    calculateTransferEfficiency(skills, baseDeltaV) {
        // Use config-driven coefficients if available
        const upgradeFactor = this.calculateUpgradeFactorFromCoefficients('delta_v_reduction', skills);
        
        // Delta-v reduction: higher upgrade factor = lower delta-v requirement
        // Return inverse (1 / factor) so that factor > 1 means less delta-v needed
        return 1.0 / upgradeFactor;
    }
    
    /**
     * Calculate energy production efficiency multiplier
     * @param {Object} skills - Current skills
     * @param {string} zoneId - Zone identifier
     * @returns {number} Energy production multiplier
     */
    calculateEnergyProductionEfficiency(skills, zoneId) {
        const zoneMultiplier = this.orbitalMechanics.getZoneProductivityModifier(zoneId) || 1.0;
        
        return skills.solar_pv * 
               skills.thermal_efficiency * 
               skills.energy_converter * 
               skills.radiator * 
               zoneMultiplier;
    }
    
    /**
     * Calculate intelligence production efficiency multiplier
     * @param {Object} skills - Current skills
     * @returns {number} FLOPS production multiplier
     */
    calculateIntelligenceProductionEfficiency(skills) {
        // Geometric mean of compute sub-skills
        const computeMultiplier = Math.pow(
            skills.cpu * skills.gpu * skills.interconnect * skills.io_bandwidth,
            0.25
        );
        
        return computeMultiplier * skills.learning * skills.sensors;
    }
    
    /**
     * Calculate probe deterioration rate (fraction of probe mass per day)
     * @param {Object} skills - Current skills
     * @returns {number} Deterioration rate (0-1)
     */
    calculateProbeDeteriorationRate(skills) {
        const baseDeteriorationRate = 0.001; // 0.1% per day
        const materialsBonus = skills.materials - 1.0;
        
        return baseDeteriorationRate * (1 - materialsBonus * 0.5);
    }
    
    /**
     * Calculate metal recovery from deterioration (fraction)
     * @param {Object} skills - Current skills
     * @returns {number} Metal recovery fraction (0-1)
     */
    calculateMetalRecoveryFromDeterioration(skills) {
        const baseMetalRecovery = 0.5; // 50% base
        const materialsBonus = skills.materials - 1.0;
        
        return Math.min(1.0, baseMetalRecovery * (1 + materialsBonus * 0.4));
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CompositeSkillsCalculator;
}

