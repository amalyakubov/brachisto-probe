/**
 * Game Engine V2 - Core Engine
 * 
 * Orchestrates all systems and calculations
 * Runs in worker thread
 */

// Import dependencies (will be loaded via importScripts in worker)
// In main thread, these should be available globally

class GameEngine {
    constructor(initialState, dataLoader, config = {}) {
        this.state = initialState;
        this.dataLoader = dataLoader;
        this.config = config;
        
        // Initialize time manager
        this.timeManager = new TimeManager(initialState.time || 0);
        this.timeManager.setTimeSpeed(config.timeSpeed || 1.0);
        
        // Initialize calculators
        this.orbitalMechanics = new OrbitalMechanics(dataLoader);
        this.skillsCalculator = new SkillsCalculator(dataLoader);
        this.compositeSkillsCalculator = null; // Will be initialized after orbitalMechanics
        this.productionCalculator = new ProductionCalculator(this.orbitalMechanics);
        this.energyCalculator = new EnergyCalculator(this.orbitalMechanics);
        this.researchCalculator = new ResearchCalculator(dataLoader);
        
        // Initialize systems
        this.probeSystem = new ProbeSystem(this.productionCalculator);
        this.structureSystem = new StructureSystem(this.productionCalculator);
        this.miningSystem = new MiningSystem(this.productionCalculator, this.orbitalMechanics);
        this.dysonSystem = new DysonSystem(this.productionCalculator, this.orbitalMechanics);
        this.transferSystem = new TransferSystem(this.orbitalMechanics);
        this.recyclingSystem = null; // Will be initialized after compositeSkillsCalculator
        
        // Initialize data (will be loaded asynchronously)
        this.orbitalZones = null;
        this.buildings = null;
        this.researchTrees = null;
        
        // Initialize state
        this.initialized = false;
    }
    
    /**
     * Initialize engine with game data
     */
    async initialize() {
        if (this.initialized) return;
        
        // Load game data
        this.orbitalZones = await this.dataLoader.loadOrbitalMechanics();
        this.buildings = await this.dataLoader.loadBuildings();
        this.researchTrees = await this.dataLoader.loadResearchTrees();
        
        // Initialize calculators with data
        this.orbitalMechanics.initialize(this.orbitalZones);
        this.skillsCalculator.initialize(this.researchTrees);
        this.researchCalculator.initialize(this.researchTrees);
        
        // Initialize composite skills calculator (needs orbitalMechanics)
        // Check both global scope and self scope for worker context
        const CompositeSkillsCalc = typeof CompositeSkillsCalculator !== 'undefined' ? 
            CompositeSkillsCalculator : 
            (typeof self !== 'undefined' && self.CompositeSkillsCalculator ? self.CompositeSkillsCalculator : null);
        if (CompositeSkillsCalc) {
            this.compositeSkillsCalculator = new CompositeSkillsCalc(this.orbitalMechanics);
        }
        
        // Initialize recycling system (needs compositeSkillsCalculator)
        const RecyclingSys = typeof RecyclingSystem !== 'undefined' ? 
            RecyclingSystem : 
            (typeof self !== 'undefined' && self.RecyclingSystem ? self.RecyclingSystem : null);
        if (RecyclingSys && this.compositeSkillsCalculator) {
            this.recyclingSystem = new RecyclingSys(this.compositeSkillsCalculator);
        }
        
        // Initialize zones in state if not already done
        this.initializeZones();
        
        // Initialize probes if not already done
        this.initializeProbes();
        
        this.initialized = true;
    }
    
    /**
     * Initialize zones in state
     */
    initializeZones() {
        if (!this.orbitalZones) return;
        
        const zones = this.state.zones || {};
        
        for (const zone of this.orbitalZones) {
            const zoneId = zone.id;
            
            if (!zones[zoneId]) {
                zones[zoneId] = {
                    metal_remaining: zone.metal_stores_kg || 0,
                    mass_remaining: zone.total_mass_kg || 0,
                    slag_produced: 0,
                    depleted: false
                };
            }
        }
        
        this.state.zones = zones;
    }
    
    /**
     * Initialize probes in state
     */
    initializeProbes() {
        const probesByZone = this.state.probes_by_zone || {};
        const probeAllocationsByZone = this.state.probe_allocations_by_zone || {};
        
        // Initialize default zone (Earth) with initial probes
        const defaultZoneId = this.config.default_zone || 'earth';
        const initialProbes = this.config.initial_probes || 1;
        
        if (!probesByZone[defaultZoneId]) {
            probesByZone[defaultZoneId] = { 'probe': initialProbes };
        } else if (!probesByZone[defaultZoneId]['probe']) {
            probesByZone[defaultZoneId]['probe'] = initialProbes;
        }
        
        // Initialize probe allocations
        for (const zone of this.orbitalZones || []) {
            const zoneId = zone.id;
            
            if (!probeAllocationsByZone[zoneId]) {
                if (zone.is_dyson_zone) {
                    probeAllocationsByZone[zoneId] = {
                        harvest: 0,
                        construct: 0,
                        replicate: 0,
                        dyson: 1.0
                    };
                } else {
                    probeAllocationsByZone[zoneId] = {
                        harvest: 0.5,
                        construct: 0.3,
                        replicate: 0.2,
                        dyson: 0
                    };
                }
            }
        }
        
        this.state.probes_by_zone = probesByZone;
        this.state.probe_allocations_by_zone = probeAllocationsByZone;
    }
    
    /**
     * Main tick function - processes one game tick
     */
    tick() {
        if (!this.initialized) {
            console.warn('Engine not initialized, skipping tick');
            return;
        }
        
        const profiler = typeof self !== 'undefined' && self.performanceProfiler 
            ? self.performanceProfiler 
            : (typeof window !== 'undefined' && window.performanceProfiler ? window.performanceProfiler : null);
        const tickStart = profiler ? profiler.startTiming('tick') : null;
        
        const deltaTime = this.timeManager.getDeltaTime();
        this.timeManager.tick();
        
        // Update state time
        this.state.time = this.timeManager.getTime();
        this.state.tick = this.timeManager.getTick();
        
        // 1. Calculate current skills from research
        const skills = this.skillsCalculator.calculateSkills(this.state.research || {}, this.state.time);
        this.state.skills = skills;
        
        // 2. Update research progress (consumes intelligence)
        this.state = this.researchCalculator.updateResearch(this.state, deltaTime, skills);
        
        // 3. Calculate energy balance
        const dysonPower = this.dysonSystem.calculateDysonEnergyProduction(
            this.state, 
            skills, 
            this.config.dyson_power_allocation || 0.5
        );
        const energyBalance = this.energyCalculator.calculateEnergyBalance(
            this.state, 
            this.buildings, 
            skills, 
            dysonPower.economy
        );
        
        // Update energy and intelligence in state
        this.state.energy = energyBalance.net;
        this.state.intelligence = dysonPower.intelligence + 
            this.researchCalculator.calculateIntelligenceProduction(this.state, this.buildings, skills);
        
        // Energy throttle (if negative energy, throttle production)
        const energyThrottle = energyBalance.throttle;
        
        // 4. Process mining (extract metal, produce slag)
        this.state = this.miningSystem.processMining(
            this.state, 
            deltaTime, 
            skills, 
            this.buildings, 
            energyThrottle
        );
        
        // 5. Process structure construction
        this.state = this.structureSystem.processStructureConstruction(
            this.state, 
            deltaTime, 
            skills, 
            this.buildings, 
            energyThrottle
        );
        
        // 6. Process probe operations (mining, building, replication)
        const probeIterationStart = profiler ? profiler.startTiming('probe_iteration') : null;
        for (const zoneId in this.state.probes_by_zone || {}) {
            this.state = this.probeSystem.processProbeOperations(
                this.state, 
                zoneId, 
                deltaTime, 
                skills, 
                this.buildings
            );
        }
        if (profiler && probeIterationStart !== null) {
            profiler.endTiming('probe_iteration', probeIterationStart);
            profiler.recordProbeIterationTime(performance.now() - probeIterationStart);
        }
        
        // 7. Process Dyson construction
        this.state = this.dysonSystem.processDysonConstruction(
            this.state, 
            deltaTime, 
            skills, 
            energyThrottle
        );
        
        // 8. Process transfers
        this.state = this.transferSystem.processTransfers(this.state, deltaTime);
        
        // 9. Process probe recycling (slag → metal)
        if (this.recyclingSystem) {
            this.state = this.recyclingSystem.processRecycling(this.state, deltaTime, skills);
        }
        
        // 10. Calculate and update rates (for UI display)
        this.updateRates(skills, dysonPower, energyBalance);
        
        if (profiler && tickStart !== null) {
            profiler.endTiming('tick', tickStart);
            profiler.recordTickTime(performance.now() - tickStart);
        }
    }
    
    /**
     * Update production rates in state (for UI display)
     */
    updateRates(skills, dysonPower, energyBalance) {
        const profiler = typeof self !== 'undefined' && self.performanceProfiler 
            ? self.performanceProfiler 
            : (typeof window !== 'undefined' && window.performanceProfiler ? window.performanceProfiler : null);
        const ratesStart = profiler ? profiler.startTiming('rate_calculation') : null;
        
        const rates = {
            metal_mining: 0,
            metal_refining: 0,
            energy_production: energyBalance.production,
            energy_consumption: energyBalance.consumption,
            intelligence_production: this.state.intelligence || 0,
            probe_production: 0,
            dyson_construction: this.state.rates?.dyson_construction || 0,
            structure_construction: {}
        };
        
        // Calculate mining rates per zone
        const zoneCalcStart = profiler ? profiler.startTiming('zone_calculation') : null;
        for (const zoneId in this.state.probes_by_zone || {}) {
            if (this.orbitalMechanics.isDysonZone(zoneId)) continue;
            
            const perZoneStart = profiler ? performance.now() : null;
            const zoneRates = this.productionCalculator.calculateZoneRates(
                this.state, 
                zoneId, 
                this.buildings, 
                skills
            );
            if (profiler && perZoneStart !== null) {
                profiler.recordZoneCalculationTimeDetailed(performance.now() - perZoneStart);
            }
            rates.metal_mining += zoneRates.mining;
        }
        if (profiler && zoneCalcStart !== null) {
            profiler.endTiming('zone_calculation', zoneCalcStart);
        }
        
        // Calculate probe production rate
        const probeProdStart = profiler ? profiler.startTiming('probe_production_calc') : null;
        for (const zoneId in this.state.probes_by_zone || {}) {
            const allocations = this.state.probe_allocations_by_zone?.[zoneId] || {};
            const replicateAllocation = allocations.replicate || 0;
            const zoneProbes = this.state.probes_by_zone[zoneId] || {};
            
            // Instrument probe count calculation
            const probeCountStart = profiler ? performance.now() : null;
            const totalProbes = Object.values(zoneProbes).reduce((sum, count) => sum + (count || 0), 0);
            if (profiler && probeCountStart !== null) {
                // This is part of probe iteration overhead
                const probeCountTime = performance.now() - probeCountStart;
                if (probeCountTime > 0.1) { // Only record if significant
                    profiler.recordProbeIterationTime(probeCountTime);
                }
            }
            
            if (totalProbes > 0 && replicateAllocation > 0) {
                const buildingRate = this.productionCalculator.calculateBuildingRate(
                    totalProbes * replicateAllocation, 
                    skills
                );
                rates.probe_production += buildingRate / 100;  // Convert kg/day to probes/day (100kg per probe)
            }
        }
        if (profiler && probeProdStart !== null) {
            profiler.endTiming('probe_production_calc', probeProdStart);
        }
        
        this.state.rates = rates;
        
        if (profiler && ratesStart !== null) {
            profiler.endTiming('rate_calculation', ratesStart);
        }
    }
    
    /**
     * Perform a game action
     * @param {string} actionType - Action type
     * @param {Object} actionData - Action data
     * @returns {Object} Result
     */
    performAction(actionType, actionData) {
        switch (actionType) {
            case 'purchase_structure':
                return this.purchaseStructure(actionData);
            case 'purchase_probe':
                return this.purchaseProbe(actionData);
            case 'allocate_probes':
                return this.allocateProbes(actionData);
            case 'create_transfer':
                return this.createTransfer(actionData);
            case 'set_time_speed':
                this.timeManager.setTimeSpeed(actionData.speed || 1.0);
                return { success: true };
            default:
                console.warn('Unknown action type:', actionType);
                return { success: false, error: 'Unknown action type' };
        }
    }
    
    /**
     * Purchase structure
     */
    purchaseStructure(actionData) {
        const { zone_id, structure_id, count = 1 } = actionData;
        const building = this.buildings && this.findBuilding(structure_id);
        
        if (!building) {
            return { success: false, error: 'Building not found' };
        }
        
        const cost = building.base_cost_metal || 0;
        const totalCost = cost * count;
        
        if (this.state.metal < totalCost) {
            return { success: false, error: 'Insufficient metal' };
        }
        
        // Deduct metal
        this.state.metal -= totalCost;
        
        // Add structure
        this.state = this.structureSystem.addStructure(this.state, zone_id, structure_id, count);
        
        return { success: true };
    }
    
    /**
     * Purchase probe (instant)
     */
    purchaseProbe(actionData) {
        const { zone_id, probe_type = 'probe', count = 1 } = actionData;
        const cost = 100;  // 100 kg per probe
        const totalCost = cost * count;
        
        if (this.state.metal < totalCost) {
            return { success: false, error: 'Insufficient metal' };
        }
        
        // Deduct metal
        this.state.metal -= totalCost;
        
        // Add probes
        const probesByZone = this.state.probes_by_zone || {};
        if (!probesByZone[zone_id]) {
            probesByZone[zone_id] = {};
        }
        if (!probesByZone[zone_id][probe_type]) {
            probesByZone[zone_id][probe_type] = 0;
        }
        probesByZone[zone_id][probe_type] += count;
        this.state.probes_by_zone = probesByZone;
        
        return { success: true };
    }
    
    /**
     * Allocate probes
     */
    allocateProbes(actionData) {
        const { zone_id, allocations } = actionData;
        
        if (!this.state.probe_allocations_by_zone) {
            this.state.probe_allocations_by_zone = {};
        }
        if (!this.state.probe_allocations_by_zone[zone_id]) {
            this.state.probe_allocations_by_zone[zone_id] = {};
        }
        
        // Update allocations (normalize to 0-1)
        for (const key in allocations) {
            this.state.probe_allocations_by_zone[zone_id][key] = Math.max(0, Math.min(1, allocations[key]));
        }
        
        return { success: true };
    }
    
    /**
     * Create transfer
     */
    createTransfer(actionData) {
        const { from_zone, to_zone, probe_type = 'probe', probe_count } = actionData;
        
        // Check if enough probes available
        const probesByZone = this.state.probes_by_zone || {};
        const zoneProbes = probesByZone[from_zone] || {};
        const available = zoneProbes[probe_type] || 0;
        
        if (available < probe_count) {
            return { success: false, error: 'Insufficient probes' };
        }
        
        // Create transfer
        const transfer = this.transferSystem.createTransfer(
            this.state, 
            from_zone, 
            to_zone, 
            probe_type, 
            probe_count, 
            this.state.skills
        );
        
        // Add transfer to state
        this.state = this.transferSystem.addTransfer(this.state, transfer);
        
        return { success: true, transfer };
    }
    
    /**
     * Find building by ID
     */
    findBuilding(buildingId) {
        if (!this.buildings) return null;
        
        // Search all categories
        for (const category in this.buildings) {
            const items = this.buildings[category];
            if (Array.isArray(items)) {
                const building = items.find(b => b.id === buildingId);
                if (building) return building;
            }
        }
        
        return null;
    }
    
    /**
     * Get current game state (immutable snapshot)
     * @returns {Object} Game state
     */
    getState() {
        const profiler = typeof self !== 'undefined' && self.performanceProfiler 
            ? self.performanceProfiler 
            : (typeof window !== 'undefined' && window.performanceProfiler ? window.performanceProfiler : null);
        const cloneStart = profiler ? performance.now() : null;
        
        // Return deep copy (immutable)
        const clonedState = JSON.parse(JSON.stringify(this.state));
        
        if (profiler && cloneStart !== null) {
            const cloneTime = performance.now() - cloneStart;
            profiler.recordStateCloneTime(cloneTime);
        }
        
        return clonedState;
    }
    
    /**
     * Load from state
     */
    static async loadFromState(initialState, dataLoader, config) {
        const engine = new GameEngine(initialState, dataLoader, config);
        await engine.initialize();
        return engine;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameEngine;
}

