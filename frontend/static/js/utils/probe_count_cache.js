/**
 * Probe Count Cache
 * 
 * Centralized cache for probe-related calculations
 * Eliminates redundant calculations across UI components
 */

class ProbeCountCache {
    constructor() {
        this.cache = {
            totalProbes: 0,
            probesByZone: {},
            totalProbeMass: 0,
            probeMassByZone: {}
        };
        this.lastStateHash = null;
        this.PROBE_MASS = 100; // kg per probe
    }
    
    /**
     * Update cache from game state
     * @param {Object} gameState - Current game state
     * @returns {Object} Cached probe data
     */
    update(gameState) {
        const hash = this._hashProbeState(gameState);
        if (hash === this.lastStateHash && this.lastStateHash !== null) {
            return this.cache; // Return cached data if unchanged
        }
        
        // Recalculate
        this.cache = this._calculate(gameState);
        this.lastStateHash = hash;
        return this.cache;
    }
    
    /**
     * Calculate probe counts and masses
     * Single probe type only: 'probe'
     * @private
     */
    _calculate(gameState) {
        const probesByZone = gameState.probes_by_zone || {};
        const legacyProbes = gameState.probes || {};
        
        let totalProbes = 0;
        const zoneProbeCounts = {};
        let totalProbeMass = 0;
        const zoneProbeMasses = {};
        
        // Calculate zone-based probe counts - single probe type only
        for (const [zoneId, zoneProbes] of Object.entries(probesByZone)) {
            if (zoneProbes && typeof zoneProbes === 'object') {
                // Single probe type: directly access 'probe' key
                const zoneCount = zoneProbes['probe'] || 0;
                zoneProbeCounts[zoneId] = zoneCount;
                totalProbes += zoneCount;
                zoneProbeMasses[zoneId] = zoneCount * this.PROBE_MASS;
                totalProbeMass += zoneProbeMasses[zoneId];
            }
        }
        
        // Add legacy probes if probesByZone is empty (backward compatibility)
        if (totalProbes === 0) {
            // Single probe type: directly access 'probe' key
            totalProbes = legacyProbes['probe'] || 0;
            totalProbeMass = totalProbes * this.PROBE_MASS;
        }
        
        return {
            totalProbes,
            probesByZone: zoneProbeCounts,
            totalProbeMass,
            probeMassByZone: zoneProbeMasses
        };
    }
    
    /**
     * Create hash of probe state for change detection
     * Uses efficient hashing instead of JSON.stringify to avoid memory issues
     * Single probe type only: 'probe'
     * @private
     */
    _hashProbeState(gameState) {
        const probesByZone = gameState.probes_by_zone || {};
        const legacyProbes = gameState.probes || {};
        
        // Efficient hash: sum probe counts instead of stringifying entire objects
        let hash = 0;
        
        // Hash zone-based probes - single probe type only
        for (const [zoneId, zoneProbes] of Object.entries(probesByZone)) {
            if (zoneProbes && typeof zoneProbes === 'object') {
                // Single probe type: directly access 'probe' key
                const zoneCount = zoneProbes['probe'] || 0;
                // Simple hash combining zone ID and count
                hash = ((hash << 5) - hash) + zoneId.charCodeAt(0);
                hash = ((hash << 5) - hash) + zoneCount;
            }
        }
        
        // Hash legacy probes - single probe type only
        const legacyCount = legacyProbes['probe'] || 0;
        hash = ((hash << 5) - hash) + legacyCount;
        
        return hash.toString();
    }
    
    /**
     * Get total probe count
     * @returns {number}
     */
    getTotalProbes() {
        return this.cache.totalProbes;
    }
    
    /**
     * Get probe count for a specific zone
     * @param {string} zoneId - Zone identifier
     * @returns {number}
     */
    getZoneProbeCount(zoneId) {
        return this.cache.probesByZone[zoneId] || 0;
    }
    
    /**
     * Get total probe mass
     * @returns {number}
     */
    getTotalProbeMass() {
        return this.cache.totalProbeMass;
    }
    
    /**
     * Get probe mass for a specific zone
     * @param {string} zoneId - Zone identifier
     * @returns {number}
     */
    getZoneProbeMass(zoneId) {
        return this.cache.probeMassByZone[zoneId] || 0;
    }
    
    /**
     * Clear cache (for testing or reset)
     */
    clear() {
        this.cache = {
            totalProbes: 0,
            probesByZone: {},
            totalProbeMass: 0,
            probeMassByZone: {}
        };
        this.lastStateHash = null;
    }
}

// Export singleton instance
window.probeCountCache = window.probeCountCache || new ProbeCountCache();

