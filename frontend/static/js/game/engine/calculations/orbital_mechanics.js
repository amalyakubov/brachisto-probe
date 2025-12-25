/**
 * Orbital Mechanics Calculator
 * 
 * Realistic orbital mechanics calculations:
 * - Delta-v for transfers (Hohmann transfers)
 * - Transfer times
 * - Zone properties (radius, mass, metallicity)
 */

class OrbitalMechanics {
    constructor(dataLoader) {
        this.dataLoader = dataLoader;
        this.orbitalZones = null;
        this.economicRules = null;
        
        // Standard gravitational parameter for Sun (m³/s²)
        this.SUN_MU = 1.32712440018e20;  // G * M_sun
        
        // Base specific impulse (seconds) - will be modified by propulsion skill
        this.BASE_ISP = 500;  // seconds
    }
    
    /**
     * Initialize with economic rules (for skill coefficients)
     * @param {Object} economicRules - Economic rules from data loader
     */
    initializeEconomicRules(economicRules) {
        this.economicRules = economicRules;
    }
    
    /**
     * Initialize with orbital zones data
     * @param {Array} zones - Orbital zones from data loader
     */
    initialize(zones) {
        this.orbitalZones = zones;
    }
    
    /**
     * Get zone properties by ID
     * @param {string} zoneId - Zone identifier
     * @returns {Object|null} Zone properties
     */
    getZone(zoneId) {
        if (!this.orbitalZones) return null;
        return this.orbitalZones.find(z => z.id === zoneId) || null;
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
     * Calculate delta-v reduction factor from skills
     * @param {Object} skills - Current skills from research
     * @returns {number} Delta-v reduction factor (multiplier, < 1.0 means reduced delta-v)
     */
    calculateDeltaVReductionFactor(skills) {
        if (!this.economicRules || !this.economicRules.skill_coefficients) {
            // Fallback: use propulsion skill directly
            return 1.0 / (1 + (skills.propulsion || 1.0) - 1.0);
        }
        
        const coefficients = this.economicRules.skill_coefficients.delta_v_reduction;
        if (!coefficients) {
            // Fallback: use propulsion skill directly
            return 1.0 / (1 + (skills.propulsion || 1.0) - 1.0);
        }
        
        const skillValues = this.buildSkillValues(coefficients, skills);
        const alpha = this.economicRules.alpha_factors?.probe_performance || 0.75;
        const upgradeFactor = this.calculateTechTreeUpgradeFactor(skillValues, alpha);
        
        // Delta-v reduction: higher upgrade factor = lower delta-v requirement
        // Return inverse (1 / factor) so that factor > 1 means less delta-v needed
        return 1.0 / upgradeFactor;
    }
    
    /**
     * Calculate transfer speed multiplier from skills
     * @param {Object} skills - Current skills from research
     * @returns {number} Transfer speed multiplier (> 1.0 means faster transfers)
     */
    calculateTransferSpeedFactor(skills) {
        if (!this.economicRules || !this.economicRules.skill_coefficients) {
            // Fallback: no speed boost
            return 1.0;
        }
        
        const coefficients = this.economicRules.skill_coefficients.transfer_speed;
        if (!coefficients) {
            // Fallback: no speed boost
            return 1.0;
        }
        
        const skillValues = this.buildSkillValues(coefficients, skills);
        const alpha = this.economicRules.alpha_factors?.probe_performance || 0.75;
        const upgradeFactor = this.calculateTechTreeUpgradeFactor(skillValues, alpha);
        
        // Transfer speed: higher upgrade factor = faster transfers
        return upgradeFactor;
    }
    
    /**
     * Calculate delta-v for Hohmann transfer between two zones
     * @param {string} fromZoneId - Source zone
     * @param {string} toZoneId - Destination zone
     * @param {Object|number} skillsOrPropulsionSkill - Skills object or propulsion skill multiplier (for backward compatibility)
     * @returns {number} Delta-v in m/s
     */
    calculateDeltaV(fromZoneId, toZoneId, skillsOrPropulsionSkill = 1.0) {
        const fromZone = this.getZone(fromZoneId);
        const toZone = this.getZone(toZoneId);
        
        if (!fromZone || !toZone) return Infinity;
        
        // Get orbital radii in meters
        const r1 = fromZone.radius_km * 1000;  // Convert km to m
        const r2 = toZone.radius_km * 1000;
        
        // Hohmann transfer delta-v calculation
        // First burn: circularize at periapsis (if going outward) or apoapsis (if going inward)
        // Second burn: circularize at destination
        
        // For transfer from r1 to r2 (r2 > r1, going outward):
        // Δv1 = sqrt(μ/r1) * (sqrt(2*r2/(r1+r2)) - 1)
        // Δv2 = sqrt(μ/r2) * (1 - sqrt(2*r1/(r1+r2)))
        // Total Δv = |Δv1| + |Δv2|
        
        // Handle both directions (outward and inward)
        const rInner = Math.min(r1, r2);
        const rOuter = Math.max(r1, r2);
        
        if (rInner === rOuter) return 0;  // Same zone
        
        // Calculate Hohmann transfer delta-v
        const sqrtMu = Math.sqrt(this.SUN_MU);
        const rSum = rInner + rOuter;
        
        // First burn: from circular orbit to transfer ellipse
        const dv1 = sqrtMu / Math.sqrt(rInner) * (Math.sqrt(2 * rOuter / rSum) - 1);
        
        // Second burn: from transfer ellipse to circular orbit
        const dv2 = sqrtMu / Math.sqrt(rOuter) * (1 - Math.sqrt(2 * rInner / rSum));
        
        const totalDeltaV = Math.abs(dv1) + Math.abs(dv2);
        
        // Apply skill-based delta-v reduction
        let reductionFactor = 1.0;
        if (typeof skillsOrPropulsionSkill === 'object' && skillsOrPropulsionSkill !== null) {
            // New system: use skill coefficients from config
            reductionFactor = this.calculateDeltaVReductionFactor(skillsOrPropulsionSkill);
        } else {
            // Legacy system: use propulsion skill directly
            const propulsionSkill = skillsOrPropulsionSkill || 1.0;
            reductionFactor = 1.0 / (1 + (propulsionSkill - 1.0));
        }
        
        const effectiveDeltaV = totalDeltaV * reductionFactor;
        
        return effectiveDeltaV;
    }
    
    /**
     * Calculate transfer time based on Hohmann ellipse arc length
     * Uses constant cargo speed along the elliptical path
     * Calibrated so Earth (1 AU) to Mars (1.52 AU) takes ~8 months
     * @param {string} fromZoneId - Source zone
     * @param {string} toZoneId - Destination zone
     * @param {Object|number} skillsOrPropulsionSkill - Skills object or propulsion skill multiplier (for backward compatibility)
     * @returns {number} Transfer time in days
     */
    calculateTransferTime(fromZoneId, toZoneId, skillsOrPropulsionSkill = 1.0) {
        const fromZone = this.getZone(fromZoneId);
        const toZone = this.getZone(toZoneId);
        
        if (!fromZone || !toZone) return Infinity;
        
        // Get orbital radii in AU (convert from km if needed)
        const AU_KM = 149597870.7;
        const r1_au = fromZone.radius_au || (fromZone.radius_km / AU_KM);
        const r2_au = toZone.radius_au || (toZone.radius_km / AU_KM);
        
        if (r1_au === r2_au) return 0;
        
        // Calculate Hohmann transfer ellipse parameters
        const rInner = Math.min(r1_au, r2_au);
        const rOuter = Math.max(r1_au, r2_au);
        const semiMajorAxis = (rInner + rOuter) / 2;
        const eccentricity = (rOuter - rInner) / (rOuter + rInner);
        const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
        
        // Calculate arc length of half-ellipse using Ramanujan's approximation
        // Full ellipse circumference ≈ π * (3(a+b) - sqrt((3a+b)(a+3b)))
        const a = semiMajorAxis;
        const b = semiMinorAxis;
        const h = Math.pow((a - b) / (a + b), 2);
        const fullCircumference = Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
        const arcLength = fullCircumference / 2; // Half-orbit for Hohmann transfer
        
        // Base cargo speed: calibrated so Earth→Mars takes 8 months (243 days)
        // Earth-Mars arc length: a=1.26 AU, e=0.206, b≈1.23 AU, arc≈3.9 AU
        // Speed = 3.9 AU / 243 days ≈ 0.016 AU/day
        const EARTH_MARS_ARC = 3.9; // AU (approximate)
        const EARTH_MARS_TIME = 243; // days (8 months)
        const BASE_SPEED_AU_PER_DAY = EARTH_MARS_ARC / EARTH_MARS_TIME;
        
        const baseTimeDays = arcLength / BASE_SPEED_AU_PER_DAY;
        
        // Apply skill-based transfer speed multiplier
        let speedFactor = 1.0;
        if (typeof skillsOrPropulsionSkill === 'object' && skillsOrPropulsionSkill !== null) {
            // New system: use skill coefficients from config
            speedFactor = this.calculateTransferSpeedFactor(skillsOrPropulsionSkill);
        }
        // Legacy: if propulsionSkill is a number, it's currently unused (reserved for future)
        
        // Higher speed factor = faster transfers = less time
        const effectiveTimeDays = baseTimeDays / speedFactor;
        
        return effectiveTimeDays;
    }
    
    /**
     * Get zone mass in kg
     * @param {string} zoneId - Zone identifier
     * @returns {number} Mass in kg
     */
    getZoneMass(zoneId) {
        const zone = this.getZone(zoneId);
        if (!zone) return 0;
        return zone.total_mass_kg || 0;
    }
    
    /**
     * Get zone metal stores in kg
     * @param {string} zoneId - Zone identifier
     * @returns {number} Metal in kg
     */
    getZoneMetal(zoneId) {
        const zone = this.getZone(zoneId);
        if (!zone) return 0;
        return zone.metal_stores_kg || 0;
    }
    
    /**
     * Get zone metallicity (fraction of mass that is metal)
     * @param {string} zoneId - Zone identifier
     * @returns {number} Metallicity (0-1)
     */
    getZoneMetallicity(zoneId) {
        const zone = this.getZone(zoneId);
        if (!zone) return 0;
        const totalMass = zone.total_mass_kg || 0;
        const metalMass = zone.metal_stores_kg || 0;
        if (totalMass === 0) return 0;
        return metalMass / totalMass;
    }
    
    /**
     * Get zone mining rate multiplier
     * @param {string} zoneId - Zone identifier
     * @returns {number} Multiplier
     */
    getZoneMiningMultiplier(zoneId) {
        const zone = this.getZone(zoneId);
        if (!zone) return 1.0;
        return zone.mining_rate_multiplier || 1.0;
    }
    
    /**
     * Get zone energy cost multiplier
     * @param {string} zoneId - Zone identifier
     * @returns {number} Multiplier
     */
    getZoneEnergyCostMultiplier(zoneId) {
        const zone = this.getZone(zoneId);
        if (!zone) return 1.0;
        return zone.energy_cost_multiplier || 1.0;
    }
    
    /**
     * Get zone productivity modifier
     * @param {string} zoneId - Zone identifier
     * @returns {number} Multiplier
     */
    getZoneProductivityModifier(zoneId) {
        const zone = this.getZone(zoneId);
        if (!zone) return 1.0;
        return zone.productivity_modifier || 1.0;
    }
    
    /**
     * Check if zone is Dyson zone
     * @param {string} zoneId - Zone identifier
     * @returns {boolean}
     */
    isDysonZone(zoneId) {
        const zone = this.getZone(zoneId);
        if (!zone) return false;
        return zone.is_dyson_zone || false;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OrbitalMechanics;
}

