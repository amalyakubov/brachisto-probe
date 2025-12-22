/** Calculation Cache - Caches expensive calculations that don't change every tick */
class CalculationCache {
    constructor() {
        this.cache = {
            researchBonuses: {},
            zoneData: {},
            buildingEffects: {},
            zoneStructures: null,
            lastResearchHash: null,
            lastStructureHash: null,
            lastZonePolicyHash: null
        };
        
        this.invalidated = {
            research: false,
            structures: false,
            zonePolicies: false
        };
    }
    
    /**
     * Get research bonus (cached)
     * @param {string} treeId - Research tree ID
     * @param {string} bonusId - Bonus ID
     * @param {number} defaultValue - Default value if not found
     * @param {Function} calculateFn - Function to calculate if not cached
     * @returns {number} - Research bonus value
     */
    getResearchBonus(treeId, bonusId, defaultValue, calculateFn) {
        const key = `${treeId}:${bonusId}`;
        
        if (this.invalidated.research || !this.cache.researchBonuses[key]) {
            const value = calculateFn();
            this.cache.researchBonuses[key] = value;
            return value;
        }
        
        return this.cache.researchBonuses[key];
    }
    
    /**
     * Get building effect (cached)
     * @param {string} buildingId - Building ID
     * @param {string} effectKey - Effect key
     * @param {number} defaultValue - Default value if not found
     * @param {Function} calculateFn - Function to calculate if not cached
     * @returns {number} - Building effect value
     */
    getBuildingEffect(buildingId, effectKey, defaultValue, calculateFn) {
        const key = `${buildingId}:${effectKey}`;
        
        if (this.invalidated.structures || !this.cache.buildingEffects[key]) {
            const value = calculateFn();
            this.cache.buildingEffects[key] = value;
            return value;
        }
        
        return this.cache.buildingEffects[key];
    }
    
    /**
     * Build zone cache - combines zone data with structures and probes
     * @param {Array} zones - Array of zone objects
     * @param {Object} structuresByZone - Structures by zone
     * @param {Object} probesByZone - Probes by zone
     * @returns {Map} - Map of zoneId -> zoneCacheData
     */
    buildZoneCache(zones, structuresByZone, probesByZone) {
        // Check if cache is still valid
        const structureHash = this._hashStructures(structuresByZone);
        const policyHash = this._hashZonePolicies(structuresByZone);
        
        if (this.cache.zoneStructures && 
            structureHash === this.cache.lastStructureHash &&
            policyHash === this.cache.lastZonePolicyHash) {
            return this.cache.zoneStructures;
        }
        
        // Build new cache
        const zoneCache = new Map();
        
        for (const zone of zones) {
            const zoneId = zone.id;
            const zoneStructures = structuresByZone[zoneId] || {};
            const zoneProbes = probesByZone[zoneId] || {};
            
            // Pre-calculate structure effects
            const structureEffects = {
                energy: {production: 0, consumption: 0},
                factories: {rate: 0, metalCost: 0},
                mining: {rate: 0}
            };
            
            for (const [buildingId, count] of Object.entries(zoneStructures)) {
                // This will be populated by the caller with actual building data
                // For now, just store the structure counts
            }
            
            zoneCache.set(zoneId, {
                zone,
                structures: zoneStructures,
                probes: zoneProbes,
                structureEffects
            });
        }
        
        this.cache.zoneStructures = zoneCache;
        this.cache.lastStructureHash = structureHash;
        this.cache.lastZonePolicyHash = policyHash;
        
        return zoneCache;
    }
    
    /**
     * Invalidate research cache
     */
    invalidateResearch() {
        this.invalidated.research = true;
        this.cache.researchBonuses = {};
    }
    
    /**
     * Invalidate structure cache
     */
    invalidateStructures() {
        this.invalidated.structures = true;
        this.cache.buildingEffects = {};
        this.cache.zoneStructures = null;
    }
    
    /**
     * Invalidate zone policy cache
     */
    invalidateZonePolicies() {
        this.cache.zoneStructures = null;
    }
    
    /**
     * Clear all invalidated flags (call at end of tick)
     */
    clearInvalidated() {
        this.invalidated.research = false;
        this.invalidated.structures = false;
        this.invalidated.zonePolicies = false;
    }
    
    /**
     * Hash structures for cache validation
     * @private
     */
    _hashStructures(structuresByZone) {
        // Simple hash: sum of structure counts
        let hash = 0;
        for (const zoneStructures of Object.values(structuresByZone)) {
            for (const count of Object.values(zoneStructures)) {
                hash += count;
            }
        }
        return hash;
    }
    
    /**
     * Hash zone policies for cache validation
     * @private
     */
    _hashZonePolicies(structuresByZone) {
        // For now, just use structure hash
        // In the future, could include zone policy data
        return this._hashStructures(structuresByZone);
    }
}

// Export singleton instance
window.calculationCache = window.calculationCache || new CalculationCache();

