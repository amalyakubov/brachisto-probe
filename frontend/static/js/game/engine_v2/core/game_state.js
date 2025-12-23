/**
 * Game State - Single source of truth structure
 * 
 * Immutable snapshot of game state at a point in time
 * All calculations read from and write to this structure
 */

/**
 * Create initial game state
 * @param {Object} config - Initial configuration
 * @returns {Object} Initial game state
 */
function createInitialGameState(config = {}) {
    return {
        // Time
        time: 0.0,              // Days elapsed
        tick: 0,                // Tick count
        
        // Resources (global)
        metal: config.initial_metal || 1000,      // kg
        energy: 0,                                 // watts (instantaneous production rate)
        slag: 0.0,                                 // kg
        intelligence: 0.0,                          // FLOPS (instantaneous production rate)
        
        // Core Skills (computed from research)
        skills: {
            propulsion: 1.0,        // ISP multiplier
            locomotion: 1.0,        // Movement efficiency
            robotic: 1.0,           // Dexterity multiplier
            production: 1.0,        // Mining/building efficiency
            recycling: 0.75,        // Slag-to-metal conversion (75% base)
            energy_collection: 1.0,
            energy_storage: 1.0,
            energy_transport: 1.0,
            dyson_construction: 1.0,
            computer: {
                processing: 1.0,
                memory: 1.0,
                interface: 1.0,
                transmission: 1.0,
                total: 1.0          // Geometric mean
            }
        },
        
        // Probes by zone and type
        probes_by_zone: {},
        
        // Probe allocations by zone (fractions 0-1)
        probe_allocations_by_zone: {},
        
        // Structures by zone
        structures_by_zone: {},
        
        // Zone resources
        zones: {},
        
        // Research progress
        research: {},
        
        // Dyson sphere
        dyson_sphere: {
            mass: 0.0,              // kg
            target_mass: config.dyson_target_mass || 5e24,  // kg
            progress: 0.0           // 0-1
        },
        
        // Active transfers
        active_transfers: [],
        
        // Production rates (for UI display)
        rates: {
            metal_mining: 0,          // kg/day
            metal_refining: 0,        // kg/day
            energy_production: 0,     // watts
            energy_consumption: 0,    // watts
            intelligence_production: 0, // FLOPS
            probe_production: 0,      // probes/day
            dyson_construction: 0,    // kg/day
            structure_construction: {} // kg/day by structure
        },
        
        // Construction progress
        construction_progress: {
            probes: {},               // {probeType: kg}
            structures: {}           // {zoneId: {structureId: kg}}
        }
    };
}

/**
 * Create a deep copy of game state (for immutability)
 * @param {Object} state - Game state to copy
 * @returns {Object} Deep copy of state
 */
function cloneGameState(state) {
    return JSON.parse(JSON.stringify(state));
}

/**
 * Freeze game state to make it immutable
 * @param {Object} state - Game state to freeze
 * @returns {Object} Frozen state
 */
function freezeGameState(state) {
    return Object.freeze(cloneGameState(state));
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createInitialGameState,
        cloneGameState,
        freezeGameState
    };
}

