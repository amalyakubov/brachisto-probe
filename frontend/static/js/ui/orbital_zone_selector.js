/** Orbital Zone Selector - Clickable bars for selecting harvest location */
class OrbitalZoneSelector {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.gameState = null;
        this.orbitalZones = null;
        this.selectedZone = null; // No zone selected by default
        this.transferSourceZone = null; // First zone clicked for transfer
        this.probeDots = {}; // Track probe dots per zone: {zoneId: [dots]}
        this.transferArcs = []; // Active transfer arcs: [{from, to, type, count, rate, ...}]
        this.init();
        this.loadData();
        this.setupKeyboardShortcuts();
    }

    async loadData() {
        try {
            const zonesResponse = await fetch('/game_data/orbital_mechanics.json');
            const zonesData = await zonesResponse.json();
            this.orbitalZones = zonesData.orbital_zones;
            this.render();
        } catch (error) {
            console.error('Failed to load orbital zones:', error);
        }
    }

    init() {
        if (!this.container) return;
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle if not typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // Handle number keys 1-9, 0, and - (minus)
            const key = e.key;
            if (key >= '1' && key <= '9') {
                const zoneIndex = parseInt(key) - 1;
                if (this.orbitalZones && zoneIndex < this.orbitalZones.length) {
                    const zoneId = this.orbitalZones[zoneIndex].id;
                    this.selectZone(zoneId);
                }
            } else if (key === '0') {
                // 0 = neptune
                const neptuneZone = this.orbitalZones?.find(z => z.id === 'neptune');
                if (neptuneZone) {
                    this.selectZone('neptune');
                }
            } else if (key === '-' || key === '_') {
                // - = kuiper belt
                const kuiperZone = this.orbitalZones?.find(z => z.id === 'kuiper');
                if (kuiperZone) {
                    this.selectZone('kuiper');
                }
            }
        });
    }

    formatScientific(value) {
        if (value === 0) return '0';
        return value.toExponential(2);
    }

    getEquivalentMasses(kg) {
        // Earth mass: ~5.97e24 kg
        const earthMass = 5.97e24;
        return {
            earth: kg / earthMass
        };
    }

    getZoneMass(zoneId) {
        // Get base mass for each zone (in kg)
        const earthMass = 5.97e24;
        const zoneMasses = {
            'mercury': 0.055 * earthMass,      // ~0.055 Earth masses
            'venus': 0.815 * earthMass,        // ~0.815 Earth masses
            'earth': 1.0 * earthMass,          // 1 Earth mass
            'mars': 0.107 * earthMass,           // ~0.107 Earth masses
            'asteroid_belt': 0.04 * earthMass, // ~0.04 Earth masses
            'jupiter': 317.8 * earthMass,      // ~317.8 Earth masses
            'saturn': 95.2 * earthMass,        // ~95.2 Earth masses
            'uranus': 14.5 * earthMass,        // ~14.5 Earth masses
            'neptune': 17.1 * earthMass,       // ~17.1 Earth masses
            'kuiper': 0.1 * earthMass,         // ~0.1 Earth masses
            'oort_cloud': 100.0 * earthMass     // 100 Earth masses (as specified)
        };
        return zoneMasses[zoneId] || 0;
    }

    calculateDeltaV(zone) {
        // Delta-v from sun to zone (simplified - proportional to radius_au)
        // Earth is baseline at 1.0 AU
        const earthRadiusAU = 1.0;
        const zoneRadiusAU = zone.radius_au || 1.0;
        
        // Delta-v scales roughly with sqrt of distance ratio (simplified)
        // Using delta_v_penalty as a multiplier
        const baseDeltaV = 30.0; // km/s baseline for Earth
        const deltaV = baseDeltaV * (1 + (zone.delta_v_penalty || 0.1));
        
        return deltaV;
    }

    calculateEnergyCost(zone) {
        // Energy cost per kg/s: Earth baseline = 100 kW per 1 kg/s
        // Scales with delta-v penalty
        const earthBaseline = 100; // kW per kg/s
        const deltaVPenalty = zone.delta_v_penalty || 0.1;
        const energyCost = earthBaseline * (1 + deltaVPenalty);
        
        return energyCost;
    }

    render() {
        if (!this.container || !this.orbitalZones) return;

        let html = '<div class="orbital-zone-selector-content">';
        html += '<div class="orbital-zone-bars">';

        // Calculate planet square sizes based on mass (for visual representation)
        const zoneMasses = {};
        let minMass = Infinity;
        let maxMass = -Infinity;
        
        this.orbitalZones.forEach(zone => {
            const zoneTotalMass = zone.total_mass_kg || this.getZoneMass(zone.id);
            zoneMasses[zone.id] = zoneTotalMass;
            if (zoneTotalMass > 0) {
                minMass = Math.min(minMass, zoneTotalMass);
                maxMass = Math.max(maxMass, zoneTotalMass);
            }
        });
        
        const massRange = maxMass - minMass || 1;
        const minSquareSize = 20; // Minimum square size in pixels
        const maxSquareSize = 50; // Maximum square size in pixels
        
        // Calculate total width for planet squares container to match tiles
        const tileWidth = 120;
        const tileGap = 15;
        const totalTilesWidth = this.orbitalZones.length * tileWidth + (this.orbitalZones.length - 1) * tileGap;
        
        // Render floating planet squares above the menu
        html += `<div class="orbital-zone-planet-squares" style="width: ${totalTilesWidth}px;">`;
        this.orbitalZones.forEach((zone, index) => {
            const zoneTotalMass = zoneMasses[zone.id] || 0;
            
            // Calculate square size proportional to planet mass
            const squareSize = zoneTotalMass > 0 ? 
                minSquareSize + ((zoneTotalMass - minMass) / massRange) * (maxSquareSize - minSquareSize) : 
                minSquareSize;
            const squareSizePx = Math.max(minSquareSize, Math.min(maxSquareSize, squareSize));
            
            // Position squares above their corresponding tiles
            // Tiles are centered using flexbox, so calculate position from center
            // Position from center: calculate offset for each tile
            // First tile starts at -totalWidth/2 + tileWidth/2
            const tileCenter = (index * (tileWidth + tileGap)) + (tileWidth / 2);
            const tileLeft = tileCenter - (totalTilesWidth / 2);
            
            // Calculate probe count for this zone
            let probeCount = 0;
            const probesByZone = (this.gameState && this.gameState.probes_by_zone) ? 
                this.gameState.probes_by_zone[zone.id] || {} : {};
            for (const [probeType, count] of Object.entries(probesByZone)) {
                probeCount += count;
            }
            
            // Calculate Dyson swarm mass for this zone (if applicable)
            // For now, show Dyson swarm dots around Earth zone only
            const dysonMass = (zone.id === 'earth' && this.gameState) ? 
                (this.gameState.dyson_sphere_mass || 0) : 0;
            const dysonTargetMass = (zone.id === 'earth' && this.gameState) ? 
                (this.gameState.dyson_sphere_target_mass || 5e21) : 0;
            const dysonCompletion = dysonTargetMass > 0 ? dysonMass / dysonTargetMass : 0;
            
            // Calculate number of dots to show (logarithmic scale)
            const maxDots = 20; // Maximum dots to show around each zone
            const probeDots = Math.min(maxDots, Math.max(0, Math.floor(Math.log10(Math.max(1, probeCount)) * 5)));
            const dysonDots = Math.min(maxDots, Math.floor(dysonCompletion * maxDots));
            const totalDots = probeDots + dysonDots;
            
            html += `<div class="orbital-zone-planet-square-float" 
                         data-zone="${zone.id}"
                         style="width: ${squareSizePx}px; 
                                height: ${squareSizePx}px; 
                                background-color: ${zone.color || '#4a9eff'};
                                left: calc(50% + ${tileLeft}px);">
                         <div class="orbital-zone-probe-dots-container" data-zone="${zone.id}"></div>
                     </div>`;
        });
        html += '</div>';
        
        // Render zone tiles (uniform size, no planet square inside)
        this.orbitalZones.forEach(zone => {
            const remainingMetal = (this.gameState && this.gameState.zone_metal_remaining) ? 
                (this.gameState.zone_metal_remaining[zone.id] || 0) : 0;
            
            // Calculate probe count and mass in this zone
            let probeCount = 0;
            let probeMass = 0;
            const PROBE_MASS = 10; // kg per probe
            const probesByZone = (this.gameState && this.gameState.probes_by_zone) ? 
                this.gameState.probes_by_zone[zone.id] || {} : {};
            for (const [probeType, count] of Object.entries(probesByZone)) {
                probeCount += count;
                probeMass += (count || 0) * PROBE_MASS;
            }
            
            // Calculate structures count in this zone
            let structuresCount = 0;
            const structuresByZone = (this.gameState && this.gameState.structures_by_zone) ? 
                this.gameState.structures_by_zone[zone.id] || {} : {};
            for (const count of Object.values(structuresByZone)) {
                structuresCount += (count || 0);
            }
            
            // Remove "Orbit" from zone name
            const zoneName = zone.name.replace(/\s+Orbit\s*$/i, '');
            
            const isSelected = this.selectedZone === zone.id;
            const isTransferSource = this.transferSourceZone === zone.id && this.transferSourceZone !== this.selectedZone;
            let tileClass = '';
            if (isSelected && isTransferSource) {
                tileClass = 'selected transfer-source';
            } else if (isSelected) {
                tileClass = 'selected';
            } else if (isTransferSource) {
                tileClass = 'transfer-source';
            }
            
            html += `<div class="orbital-zone-tile ${tileClass}" data-zone="${zone.id}">`;
            html += `<div class="orbital-zone-tile-label">${zoneName}</div>`;
            html += `<div class="orbital-zone-tile-stats">`;
            html += `<div class="orbital-zone-stat">Probe mass: ${this.formatMass(probeMass)}</div>`;
            html += `<div class="orbital-zone-stat">Metal mass: ${this.formatMass(remainingMetal)}</div>`;
            html += `<div class="orbital-zone-stat">Structures: ${this.formatNumber(structuresCount)}</div>`;
            html += `</div>`;
            html += `</div>`;
        });

        html += '</div>';
        html += '</div>';

        this.container.innerHTML = html;

        // Set up event listeners
        this.setupTooltips();
        this.setupClickHandlers();
        
        // Update probe dots after render
        if (this.gameState) {
            this.updateProbeDots();
            this.updateTransferArcs();
        }
    }
    
    formatMass(kg) {
        if (!kg || kg === 0) return '0';
        if (kg < 1000) return kg.toFixed(1);
        if (kg < 1e6) return (kg / 1000).toFixed(1) + 'k';
        if (kg < 1e9) return (kg / 1e6).toFixed(1) + 'M';
        if (kg < 1e12) return (kg / 1e9).toFixed(2) + 'B';
        if (kg < 1e15) return (kg / 1e12).toFixed(2) + 'T';
        if (kg < 1e18) return (kg / 1e15).toFixed(2) + 'P';
        if (kg < 1e21) return (kg / 1e18).toFixed(2) + 'E';
        return kg.toExponential(2);
    }
    
    formatNumber(num) {
        if (!num || num === 0) return '0';
        if (num < 1) return num.toFixed(2);
        if (num < 1000) return Math.floor(num).toLocaleString('en-US');
        if (num < 1e6) return (num / 1000).toFixed(1) + 'k';
        if (num < 1e9) return (num / 1e6).toFixed(2) + 'M';
        if (num < 1e12) return (num / 1e9).toFixed(2) + 'B';
        return num.toExponential(2);
    }

    setupTooltips() {
        const tiles = this.container.querySelectorAll('.orbital-zone-tile[data-zone]');
        const planetSquares = this.container.querySelectorAll('.orbital-zone-planet-square-float[data-zone]');
        
        // Track which zone is currently hovered
        let hoveredZoneId = null;
        let hideTimeout = null;
        
        const showTooltip = (zoneId) => {
            if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
            }
            hoveredZoneId = zoneId;
            const planetSquare = this.container.querySelector(`.orbital-zone-planet-square-float[data-zone="${zoneId}"]`);
            if (planetSquare) {
                this.showZoneInfoTooltip(zoneId, planetSquare);
            }
        };
        
        const hideTooltip = () => {
            hoveredZoneId = null;
            this.hideZoneInfoTooltip();
        };
        
        const scheduleHide = () => {
            if (hideTimeout) {
                clearTimeout(hideTimeout);
            }
            hideTimeout = setTimeout(() => {
                hideTooltip();
            }, 100); // Small delay to allow mouse movement between tile and square
        };
        
        // Add handlers to tiles
        tiles.forEach(tile => {
            const zoneId = tile.dataset.zone;
            
            tile.addEventListener('mouseenter', (e) => {
                if (zoneId) {
                    showTooltip(zoneId);
                }
            });

            tile.addEventListener('mouseleave', (e) => {
                const relatedTarget = e.relatedTarget;
                // If moving to planet square or tooltip, keep showing
                if (relatedTarget && 
                    (relatedTarget.closest('.orbital-zone-planet-square-float') || 
                     relatedTarget.closest('#zone-info-panel'))) {
                    return;
                }
                scheduleHide();
            });
        });
        
        // Add handlers to planet squares
        planetSquares.forEach(square => {
            const zoneId = square.dataset.zone;
            
            square.addEventListener('mouseenter', (e) => {
                if (zoneId) {
                    showTooltip(zoneId);
                }
            });

            square.addEventListener('mouseleave', (e) => {
                const relatedTarget = e.relatedTarget;
                // If moving to tile or tooltip, keep showing
                if (relatedTarget && 
                    (relatedTarget.closest('.orbital-zone-tile') || 
                     relatedTarget.closest('#zone-info-panel'))) {
                    return;
                }
                scheduleHide();
            });
        });
        
        // Hide tooltip when mouse leaves the tooltip itself
        const panel = document.getElementById('zone-info-panel');
        if (panel) {
            panel.addEventListener('mouseenter', () => {
                if (hideTimeout) {
                    clearTimeout(hideTimeout);
                    hideTimeout = null;
                }
            });
            
            panel.addEventListener('mouseleave', (e) => {
                const relatedTarget = e.relatedTarget;
                // If moving back to tile or square, keep showing
                if (relatedTarget && 
                    (relatedTarget.closest('.orbital-zone-tile') || 
                     relatedTarget.closest('.orbital-zone-planet-square-float'))) {
                    return;
                }
                hideTooltip();
            });
        }
    }
    
    calculateZoneEnergy(zoneId) {
        // Calculate energy production and consumption for a specific zone
        if (!this.gameState) return { production: 0, consumption: 0 };
        
        const zone = this.orbitalZones.find(z => z.id === zoneId);
        if (!zone) return { production: 0, consumption: 0 };
        
        const isDysonZone = zone.is_dyson_zone || false;
        let production = 0;
        let consumption = 0;
        
        // Energy production
        if (isDysonZone) {
            // Dyson zone: energy from Dyson sphere itself
            const dysonMass = this.gameState.dyson_sphere_mass || 0;
            const dysonTargetMass = this.gameState.dyson_sphere_target_mass || 5e21;
            const dysonPowerAllocation = this.gameState.dyson_power_allocation || 0; // 0 = all economy, 100 = all compute
            const economyFraction = (100 - dysonPowerAllocation) / 100.0;
            
            if (dysonMass >= dysonTargetMass) {
                // Complete: all star's power
                const sunTotalPower = 3.8e26; // watts
                production += sunTotalPower * economyFraction;
            } else {
                // During construction: 5 kW per kg
                const dysonPower = dysonMass * 5000; // 5000W = 5 kW per kg
                production += dysonPower * economyFraction;
            }
        }
        
        // Energy from structures in this zone
        const structuresByZone = this.gameState.structures_by_zone || {};
        const zoneStructures = structuresByZone[zoneId] || {};
        
        // Load buildings data if available (would need to be passed in or loaded)
        // For now, we'll need to access it from gameDataLoader if available
        if (typeof gameDataLoader !== 'undefined') {
            for (const [buildingId, count] of Object.entries(zoneStructures)) {
                const building = gameDataLoader.getBuildingById(buildingId);
                if (building) {
                    const effects = building.effects || {};
                    const energyOutput = effects.energy_production_per_second || 0;
                    const energyCost = effects.energy_consumption_per_second || 0;
                    
                    // Apply orbital efficiency if available
                    let orbitalEfficiency = 1.0;
                    if (building.orbital_efficiency && building.orbital_efficiency[zoneId]) {
                        orbitalEfficiency = building.orbital_efficiency[zoneId];
                    }
                    
                    production += energyOutput * count * orbitalEfficiency;
                    consumption += energyCost * count;
                }
            }
        }
        
        // Energy consumption from probes in this zone
        const probesByZone = this.gameState.probes_by_zone || {};
        const zoneProbes = probesByZone[zoneId] || {};
        const PROBE_ENERGY_CONSUMPTION = 100000; // 100kW per probe
        let probeCount = 0;
        for (const count of Object.values(zoneProbes)) {
            probeCount += (count || 0);
        }
        consumption += probeCount * PROBE_ENERGY_CONSUMPTION;
        
        // Energy consumption from activities in this zone
        const probeAllocationsByZone = this.gameState.probe_allocations_by_zone || {};
        const zoneAllocations = probeAllocationsByZone[zoneId] || {};
        
        // Harvesting energy cost
        const harvestAllocation = zoneAllocations.harvest || {};
        const harvestProbes = Object.values(harvestAllocation).reduce((a, b) => a + b, 0);
        if (harvestProbes > 0 && !isDysonZone) {
            const deltaVPenalty = zone.delta_v_penalty || 0.1;
            const miningEnergyCostMultiplier = zone.mining_energy_cost_multiplier || 1.0;
            const baseEnergyCost = 453515; // watts per kg/s at Earth baseline
            const energyCostPerKgS = baseEnergyCost * Math.pow(1.0 + deltaVPenalty, 2) * miningEnergyCostMultiplier;
            const harvestRatePerProbe = 0.5; // Config.PROBE_HARVEST_RATE
            consumption += energyCostPerKgS * harvestRatePerProbe * harvestProbes;
        }
        
        // Probe construction energy cost (from replicate allocation)
        const replicateAllocation = zoneAllocations.replicate || {};
        const replicateProbes = Object.values(replicateAllocation).reduce((a, b) => a + b, 0);
        if (replicateProbes > 0) {
            const PROBE_BUILD_RATE = 0.1; // kg/s per probe
            const PROBE_MASS = 10; // kg per probe
            const probeConstructionRateKgS = replicateProbes * PROBE_BUILD_RATE;
            const probeConstructionEnergyCost = probeConstructionRateKgS * 250000; // 250kW per kg/s
            consumption += probeConstructionEnergyCost;
        }
        
        // Structure construction energy cost (from construct allocation)
        const constructAllocation = zoneAllocations.construct || {};
        const constructProbes = Object.values(constructAllocation).reduce((a, b) => a + b, 0);
        if (constructProbes > 0) {
            const buildAllocation = this.gameState.build_allocation || 100; // 0 = all structures, 100 = all probes
            const structureFraction = (100 - buildAllocation) / 100.0;
            const structureBuildingProbes = constructProbes * structureFraction;
            if (structureBuildingProbes > 0) {
                const PROBE_BUILD_RATE = 0.1; // kg/s per probe
                const structureConstructionRateKgS = structureBuildingProbes * PROBE_BUILD_RATE;
                const structureConstructionEnergyCost = structureConstructionRateKgS * 250000; // 250kW per kg/s
                consumption += structureConstructionEnergyCost;
            }
        }
        
        // Dyson construction energy cost (for dyson zone)
        if (isDysonZone) {
            const dysonAllocation = zoneAllocations.construct || {}; // Dyson uses construct allocation
            const dysonProbes = Object.values(dysonAllocation).reduce((a, b) => a + b, 0);
            if (dysonProbes > 0) {
                const PROBE_BUILD_RATE = 0.1; // kg/s per probe
                const dysonConstructionRateKgS = dysonProbes * PROBE_BUILD_RATE;
                const dysonConstructionEnergyCost = dysonConstructionRateKgS * 250000; // 250kW per kg/s
                consumption += dysonConstructionEnergyCost;
            }
        }
        
        return { production, consumption };
    }
    
    showZoneInfoTooltip(zoneId, planetSquareElement) {
        const panel = document.getElementById('zone-info-panel');
        if (!panel) return;
        
        const zone = this.orbitalZones.find(z => z.id === zoneId);
        if (!zone) return;
        
        const isDysonZone = zone.is_dyson_zone || false;
        
        // Calculate zone-specific stats
        const deltaVPenalty = zone.delta_v_penalty || 0.1;
        const miningEnergyCostMultiplier = zone.mining_energy_cost_multiplier || 1.0;
        const miningRateMultiplier = zone.mining_rate_multiplier || 1.0;
        const metalPercentage = zone.metal_percentage || 0.32;
        
        // Get stats from game state
        let miningRate = 0; // kg/s total material
        let metalMiningRate = 0; // kg/s metal
        let slagMiningRate = 0; // kg/s slag
        let numProbes = 0;
        let totalProbeMass = 0;
        let probesPerSecond = 0;
        let dysonBuildRate = 0; // kg/s for dyson zone
        let droneProductionRate = 0; // probes/s from structures in dyson zone
        let metalRemaining = 0;
        let massRemaining = 0;
        let slagProduced = 0;
        let buildingCounts = {};
        let zoneEnergy = { production: 0, consumption: 0 };
        
        if (this.gameState) {
            // Get probes in this zone
            const probesByZone = this.gameState.probes_by_zone || {};
            const zoneProbes = probesByZone[zoneId] || {};
            for (const [probeType, count] of Object.entries(zoneProbes)) {
                numProbes += (count || 0);
                totalProbeMass += (count || 0) * 10; // Config.PROBE_MASS = 10 kg
            }
            
            // Get probe allocations for this zone
            const probeAllocationsByZone = this.gameState.probe_allocations_by_zone || {};
            const zoneAllocations = probeAllocationsByZone[zoneId] || {};
            
            if (isDysonZone) {
                // Dyson zone: calculate construction rate
                const constructAllocation = zoneAllocations.construct || {};
                const dysonProbes = Object.values(constructAllocation).reduce((a, b) => a + b, 0);
                if (dysonProbes > 0) {
                    const PROBE_BUILD_RATE = 0.1; // kg/s per probe
                    dysonBuildRate = dysonProbes * PROBE_BUILD_RATE;
                }
                
                // Calculate drone production from structures (factories) in dyson zone
                const structuresByZone = this.gameState.structures_by_zone || {};
                const zoneStructures = structuresByZone[zoneId] || {};
                const factoryProductionByZone = this.gameState.factory_production_by_zone || {};
                const zoneFactoryProduction = factoryProductionByZone[zoneId] || {};
                
                if (zoneFactoryProduction.rate) {
                    droneProductionRate = zoneFactoryProduction.rate; // probes/s
                }
            } else {
                // Regular zone: calculate mining rate
                const harvestAllocation = zoneAllocations.harvest || {};
                const baseHarvestRate = 0.5; // Config.PROBE_BASE_MINING_RATE
                for (const [probeType, count] of Object.entries(harvestAllocation)) {
                    if (count > 0) {
                        const probeHarvestRate = baseHarvestRate * miningRateMultiplier * count;
                        miningRate += probeHarvestRate;
                    }
                }
                
                // Split into metal and slag based on zone's metal percentage
                metalMiningRate = miningRate * metalPercentage;
                slagMiningRate = miningRate * (1.0 - metalPercentage);
            }
            
            // Get probe production rate for this zone (probes per second)
            // Calculate from replicate allocation in this zone
            const replicateAllocation = zoneAllocations.replicate || {};
            let zoneProbeProductionRate = 0;
            for (const [probeType, count] of Object.entries(replicateAllocation)) {
                if (count > 0) {
                    // Base probe production: 0.1 kg/s per probe (Config.PROBE_BUILD_RATE)
                    // Probe mass: 10 kg (Config.PROBE_MASS)
                    // Production rate: (0.1 kg/s) / (10 kg/probe) = 0.01 probes/s per probe
                    const probesPerSecondPerProbe = 0.1 / 10; // 0.01 probes/s per replicating probe
                    zoneProbeProductionRate += count * probesPerSecondPerProbe;
                }
            }
            probesPerSecond = zoneProbeProductionRate;
            
            // Get remaining resources
            metalRemaining = (this.gameState.zone_metal_remaining && this.gameState.zone_metal_remaining[zoneId]) || 0;
            massRemaining = (this.gameState.zone_mass_remaining && this.gameState.zone_mass_remaining[zoneId]) || 0;
            slagProduced = (this.gameState.zone_slag_produced && this.gameState.zone_slag_produced[zoneId]) || 0;
            
            // Get building counts for this zone
            const structuresByZone = this.gameState.structures_by_zone || {};
            buildingCounts = structuresByZone[zoneId] || {};
            
            // Calculate zone energy
            zoneEnergy = this.calculateZoneEnergy(zoneId);
        }
        
        // Format values
        const formatRate = (rate) => {
            if (rate === 0) return '0.00';
            if (rate < 0.01) return rate.toFixed(4);
            if (rate < 1) return rate.toFixed(2);
            return rate.toExponential(2);
        };
        
        const formatMass = (mass) => {
            if (mass === 0) return '0';
            if (mass < 1000) return mass.toFixed(1);
            if (mass < 1e6) return (mass / 1000).toFixed(1) + 'k';
            if (mass < 1e9) return (mass / 1e6).toFixed(1) + 'M';
            return mass.toExponential(2);
        };
        
        const formatEnergy = (energy) => {
            if (energy === 0) return '0 W';
            if (energy >= 1e15) return (energy / 1e15).toFixed(2) + ' PW';
            if (energy >= 1e12) return (energy / 1e12).toFixed(2) + ' TW';
            if (energy >= 1e9) return (energy / 1e9).toFixed(2) + ' GW';
            if (energy >= 1e6) return (energy / 1e6).toFixed(2) + ' MW';
            if (energy >= 1e3) return (energy / 1e3).toFixed(2) + ' kW';
            return energy.toFixed(2) + ' W';
        };
        
        // Position tooltip above the planet square
        const rect = planetSquareElement.getBoundingClientRect();
        const panelWidth = 250;
        let leftPos = rect.left + (rect.width / 2) - (panelWidth / 2);
        const topPos = rect.top - 380; // Position further above the planet square
        
        // Keep tooltip within viewport
        if (leftPos < 10) leftPos = 10;
        if (leftPos + panelWidth > window.innerWidth - 10) {
            leftPos = window.innerWidth - panelWidth - 10;
        }
        
        // Show panel with probe summary panel styling
        panel.style.display = 'block';
        panel.style.left = `${leftPos}px`;
        panel.style.top = `${topPos}px`;
        
        // Build building counts display
        let buildingCountsHtml = '';
        const buildingEntries = Object.entries(buildingCounts);
        if (buildingEntries.length > 0) {
            buildingCountsHtml = '<div class="probe-summary-item" style="border-top: 1px solid rgba(255, 255, 255, 0.2); margin-top: 8px; padding-top: 8px;">';
            buildingCountsHtml += '<div class="probe-summary-label">Buildings</div>';
            buildingCountsHtml += '<div class="probe-summary-breakdown">';
            buildingEntries.forEach(([buildingId, count]) => {
                if (count > 0) {
                    // Try to get building name, fallback to ID
                    const buildingName = buildingId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    buildingCountsHtml += `<div class="probe-summary-breakdown-item">
                        <span class="probe-summary-breakdown-label">${buildingName}:</span>
                        <span class="probe-summary-breakdown-value">${count}</span>
                    </div>`;
                }
            });
            buildingCountsHtml += '</div></div>';
        }
        
        // Build tooltip content based on zone type
        let tooltipContent = '';
        
        if (isDysonZone) {
            // Dyson zone tooltip
            tooltipContent = `
                <div class="probe-summary-title">${zone.name}</div>
                <div class="probe-summary-item">
                    <div class="probe-summary-label">Probes</div>
                    <div class="probe-summary-value">${this.formatNumber(Math.floor(numProbes))}</div>
                </div>
                <div class="probe-summary-item">
                    <div class="probe-summary-label">Dyson Build Rate</div>
                    <div class="probe-summary-value">${formatRate(dysonBuildRate)} kg/s</div>
                </div>
                ${droneProductionRate > 0 ? `
                <div class="probe-summary-item">
                    <div class="probe-summary-label">Drone Production</div>
                    <div class="probe-summary-value">${formatRate(droneProductionRate)} /s</div>
                </div>
                ` : ''}
                ${probesPerSecond > 0 ? `
                <div class="probe-summary-item">
                    <div class="probe-summary-label">Probe Production Rate</div>
                    <div class="probe-summary-value">${formatRate(probesPerSecond)} /s</div>
                </div>
                ` : ''}
                <div class="probe-summary-item">
                    <div class="probe-summary-label">Energy Produced</div>
                    <div class="probe-summary-value">${formatEnergy(zoneEnergy.production)}</div>
                </div>
                <div class="probe-summary-item">
                    <div class="probe-summary-label">Energy Consumed</div>
                    <div class="probe-summary-value">${formatEnergy(zoneEnergy.consumption)}</div>
                </div>
                ${buildingCountsHtml}
            `;
        } else {
            // Regular zone tooltip
            tooltipContent = `
                <div class="probe-summary-title">${zone.name}</div>
                <div class="probe-summary-item">
                    <div class="probe-summary-label">Probes</div>
                    <div class="probe-summary-value">${this.formatNumber(Math.floor(numProbes))}</div>
                </div>
                ${probesPerSecond > 0 ? `
                <div class="probe-summary-item">
                    <div class="probe-summary-label">Probe Production Rate</div>
                    <div class="probe-summary-value">${formatRate(probesPerSecond)} /s</div>
                </div>
                ` : ''}
                ${metalMiningRate > 0 ? `
                <div class="probe-summary-item">
                    <div class="probe-summary-label">Mining Rate</div>
                    <div class="probe-summary-value">${formatRate(metalMiningRate)} kg/s metal</div>
                </div>
                ` : ''}
                ${slagMiningRate > 0 ? `
                <div class="probe-summary-item">
                    <div class="probe-summary-label">Slag Production</div>
                    <div class="probe-summary-value">${formatRate(slagMiningRate)} kg/s</div>
                </div>
                ` : ''}
                <div class="probe-summary-item">
                    <div class="probe-summary-label">Metal Remaining</div>
                    <div class="probe-summary-value">${formatMass(metalRemaining)}</div>
                </div>
                ${massRemaining > 0 ? `
                <div class="probe-summary-item">
                    <div class="probe-summary-label">Mass Remaining</div>
                    <div class="probe-summary-value">${formatMass(massRemaining)}</div>
                </div>
                ` : ''}
                <div class="probe-summary-item">
                    <div class="probe-summary-label">Energy Produced</div>
                    <div class="probe-summary-value">${formatEnergy(zoneEnergy.production)}</div>
                </div>
                <div class="probe-summary-item">
                    <div class="probe-summary-label">Energy Consumed</div>
                    <div class="probe-summary-value">${formatEnergy(zoneEnergy.consumption)}</div>
                </div>
                ${buildingCountsHtml}
            `;
        }
        
        panel.style.bottom = 'auto';
        panel.className = 'zone-info-panel probe-summary-panel';
        panel.innerHTML = tooltipContent;
    }
    
    hideZoneInfoTooltip() {
        const panel = document.getElementById('zone-info-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    setupClickHandlers() {
        // Click handler for tiles
        const tiles = this.container.querySelectorAll('.orbital-zone-tile[data-zone]');
        tiles.forEach(tile => {
            tile.addEventListener('click', (e) => {
                e.stopPropagation();
                const zoneId = tile.dataset.zone;
                if (zoneId) {
                    this.selectZone(zoneId);
                }
            });
        });
        
        // Zones only deselect when clicking the same zone tile again (toggle behavior)
        // Clicking anywhere else keeps the zone selected
    }

    async selectZone(zoneId) {
        // If we already have a source zone selected for transfer, this is the destination
        if (this.transferSourceZone && this.transferSourceZone !== zoneId) {
            // Show transfer dialog
            this.showTransferDialog(this.transferSourceZone, zoneId);
            // Keep destination selected for purchase panel
            this.selectedZone = zoneId;
            this.render();
            return;
        }
        
        // If clicking the same zone, deselect it (toggle behavior)
        if (this.selectedZone === zoneId) {
            this.deselectZone();
            return;
        }
        
        // Select the new zone and mark as transfer source
        this.selectedZone = zoneId;
        this.transferSourceZone = zoneId; // Mark as transfer source (persists until transfer confirmed/cancelled)
        this.render(); // Re-render to show selection with transfer-source highlight
        
        // Notify purchase panel of selection change
        if (window.purchasePanel) {
            window.purchasePanel.setSelectedZone(zoneId);
            if (window.commandPanel) {
                window.commandPanel.setSelectedZone(zoneId);
            }
        }
        
        // Update backend with selected harvest zone
        try {
            await gameEngine.performAction('set_harvest_zone', { zone_id: zoneId });
        } catch (error) {
            console.error('Failed to set harvest zone:', error);
        }
    }
    
    deselectZone() {
        this.selectedZone = null;
        this.transferSourceZone = null;
        this.render(); // Re-render to show deselection
        
        // Notify panels of deselection
        if (window.purchasePanel) {
            window.purchasePanel.setSelectedZone(null);
        }
        if (window.commandPanel) {
            window.commandPanel.setSelectedZone(null);
        }
    }
    
    showTransferDialog(fromZoneId, toZoneId) {
        // Get zone data
        const fromZone = this.orbitalZones.find(z => z.id === fromZoneId);
        const toZone = this.orbitalZones.find(z => z.id === toZoneId);
        if (!fromZone || !toZone) return;
        
        // Calculate delta-v difference
        const deltaV = this.calculateTransferDeltaV(fromZone, toZone);
        
        // Calculate energy cost
        const energyCost = this.calculateTransferEnergyCost(fromZone, toZone);
        
        // Get probe count in source zone
        let availableProbes = 0;
        if (this.gameState && this.gameState.probes_by_zone) {
            const zoneProbes = this.gameState.probes_by_zone[fromZoneId] || {};
            for (const count of Object.values(zoneProbes)) {
                availableProbes += count;
            }
        }
        
        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'transfer-dialog';
        dialog.innerHTML = `
            <div class="transfer-dialog-content">
                <div class="transfer-dialog-header">
                    <h3>Hohmann Transfer</h3>
                    <button class="transfer-dialog-close">&times;</button>
                </div>
                <div class="transfer-dialog-body">
                    <div class="transfer-route">
                        <span class="transfer-zone">${fromZone.name.replace(/\s+Orbit\s*$/i, '')}</span>
                        <span class="transfer-arrow">→</span>
                        <span class="transfer-zone">${toZone.name.replace(/\s+Orbit\s*$/i, '')}</span>
                    </div>
                    <div class="transfer-info">
                    <div class="transfer-info-item">
                        <span class="transfer-label">Delta-V:</span>
                        <span class="transfer-value">${deltaV.toFixed(2)} km/s</span>
                    </div>
                    <div class="transfer-info-item">
                        <span class="transfer-label">Transfer Time:</span>
                        <span class="transfer-value" id="transfer-time">—</span>
                    </div>
                    <div class="transfer-info-item">
                        <span class="transfer-label">Energy Cost (one-time):</span>
                        <span class="transfer-value" id="transfer-energy-one-time">—</span>
                    </div>
                    <div class="transfer-info-item">
                        <span class="transfer-label">Energy Cost (continuous):</span>
                        <span class="transfer-value" id="transfer-energy-continuous">—</span>
                    </div>
                        <div class="transfer-info-item">
                            <span class="transfer-label">Available Probes:</span>
                            <span class="transfer-value">${this.formatNumber(availableProbes)}</span>
                        </div>
                    </div>
                    <div class="transfer-options">
                        <div class="transfer-option">
                            <label>
                                <input type="radio" name="transfer-type" value="one-time" checked>
                                One-Time Transfer
                            </label>
                            <input type="number" id="transfer-count" min="1" max="${availableProbes}" value="1" 
                                   placeholder="Number of probes">
                        </div>
                        <div class="transfer-option">
                            <label>
                                <input type="radio" name="transfer-type" value="continuous">
                                Continuous Transfer
                            </label>
                            <input type="number" id="transfer-rate" min="0.01" max="100" step="0.1" value="10" 
                                   placeholder="% of probe production">
                        </div>
                    </div>
                    <div class="transfer-actions">
                        <button class="transfer-cancel">Cancel</button>
                        <button class="transfer-confirm">Confirm Transfer</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Calculate energy costs
        const energyCostPerProbe = this.calculateTransferEnergyCost(fromZone, toZone, 1);
        
        // Calculate transfer time
        const transferTime = this.calculateTransferTime(fromZone, toZone);
        
        // Display transfer time
        const timeEl = dialog.querySelector('#transfer-time');
        if (timeEl) {
            const timeDisplay = transferTime > 60 ? 
                `${(transferTime / 60).toFixed(1)} minutes` : 
                `${transferTime.toFixed(1)} seconds`;
            timeEl.textContent = timeDisplay;
        }
        
        // Update energy cost displays
        const updateEnergyCosts = () => {
            const count = parseInt(dialog.querySelector('#transfer-count').value) || 1;
            const rate = parseFloat(dialog.querySelector('#transfer-rate').value) || 1;
            const oneTimeCost = energyCostPerProbe * count;
            const continuousCostPerSecond = energyCostPerProbe * rate;
            
            const oneTimeEl = dialog.querySelector('#transfer-energy-one-time');
            const continuousEl = dialog.querySelector('#transfer-energy-continuous');
            
            if (oneTimeEl) {
                // Show in MJ and kW with realistic transfer duration
                const transferDuration = transferTime; // seconds
                const avgPower = transferDuration > 0 ? oneTimeCost / transferDuration : 0;
                const timeDisplay = transferDuration > 60 ? 
                    `${(transferDuration / 60).toFixed(1)} min` : 
                    `${transferDuration.toFixed(1)}s`;
                oneTimeEl.textContent = `${(oneTimeCost / 1e6).toFixed(2)} MJ (${(avgPower / 1e3).toFixed(1)} kW avg, ${timeDisplay})`;
            }
            if (continuousEl) {
                continuousEl.textContent = `${(continuousCostPerSecond / 1e3).toFixed(1)} kW`;
            }
        };
        
        // Set up event listeners for energy cost updates
        const countInput = dialog.querySelector('#transfer-count');
        const rateInput = dialog.querySelector('#transfer-rate');
        const typeRadios = dialog.querySelectorAll('input[name="transfer-type"]');
        
        countInput.addEventListener('input', updateEnergyCosts);
        rateInput.addEventListener('input', updateEnergyCosts);
        typeRadios.forEach(radio => radio.addEventListener('change', updateEnergyCosts));
        updateEnergyCosts(); // Initial update
        
        // Event handlers
        const closeDialog = () => {
            document.body.removeChild(dialog);
            // Clear transfer source when dialog closes
            this.transferSourceZone = null;
            this.render();
        };
        
        dialog.querySelector('.transfer-dialog-close').addEventListener('click', closeDialog);
        
        dialog.querySelector('.transfer-cancel').addEventListener('click', closeDialog);
        
        dialog.querySelector('.transfer-confirm').addEventListener('click', () => {
            const transferType = dialog.querySelector('input[name="transfer-type"]:checked').value;
            if (transferType === 'one-time') {
                const count = parseInt(dialog.querySelector('#transfer-count').value) || 1;
                this.createTransfer(fromZoneId, toZoneId, 'one-time', count, 0);
            } else {
                const rate = parseFloat(dialog.querySelector('#transfer-rate').value) || 1;
                this.createTransfer(fromZoneId, toZoneId, 'continuous', 0, rate);
            }
            closeDialog();
        });
        
        // Click outside to close
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeDialog();
            }
        });
    }
    
    calculateTransferDeltaV(fromZone, toZone) {
        // Hohmann transfer delta-v calculation
        // Simplified: delta-v ≈ sqrt(GM/r1) * (sqrt(2*r2/(r1+r2)) - 1) + sqrt(GM/r2) * (1 - sqrt(2*r1/(r1+r2)))
        // For simplicity, use radius-based calculation
        const r1 = fromZone.radius_au || 1.0;
        const r2 = toZone.radius_au || 1.0;
        
        // Base delta-v at Earth (1 AU) = 30 km/s
        const baseDeltaV = 30.0;
        
        // Simplified Hohmann transfer: delta-v scales with radius difference
        const radiusRatio = Math.max(r1, r2) / Math.min(r1, r2);
        const deltaV = baseDeltaV * Math.sqrt(radiusRatio) * 0.5; // Simplified formula
        
        return deltaV;
    }
    
    calculateTransferDistance(fromZone, toZone) {
        // Calculate distance between zones in km
        // Use semi-major axis of Hohmann transfer orbit
        const r1 = (fromZone.radius_km || fromZone.radius_au * 149597870.7) || 149597870.7; // km
        const r2 = (toZone.radius_km || toZone.radius_au * 149597870.7) || 149597870.7; // km
        
        // Hohmann transfer semi-major axis
        const a = (r1 + r2) / 2;
        
        // Transfer distance is approximately half the ellipse perimeter
        // Simplified: use average of r1 and r2 as approximation
        const distance = Math.PI * Math.sqrt((r1 + r2) / 2 * a);
        
        return distance;
    }
    
    getProbeMovementSpeed() {
        // Get probe movement speed with research upgrades
        // Base speed from config
        const baseSpeed = 30.0; // km/s (PROBE_BASE_MOVEMENT_SPEED)
        
        // Get research bonuses for propulsion
        let speedMultiplier = 1.0;
        if (typeof gameEngine !== 'undefined' && gameEngine.engine && typeof gameEngine.engine._getResearchBonus === 'function') {
            // Check for propulsion speed bonuses
            const specificImpulseBonus = gameEngine.engine._getResearchBonus('propulsion_systems', 'specific_impulse_improvement', 0.0);
            const propulsionEfficiency = gameEngine.engine._getResearchBonus('propulsion_systems', 'ultimate_propulsion_efficiency', 0.0);
            
            // Speed scales with specific impulse improvement
            speedMultiplier = 1.0 + specificImpulseBonus + propulsionEfficiency;
        }
        
        return baseSpeed * speedMultiplier;
    }
    
    calculateTransferTime(fromZone, toZone) {
        // Calculate realistic transfer time based on distance and probe speed
        const distance = this.calculateTransferDistance(fromZone, toZone); // km
        const speed = this.getProbeMovementSpeed(); // km/s
        
        // Transfer time = distance / speed (in seconds)
        const transferTimeSeconds = distance / speed;
        
        return transferTimeSeconds;
    }
    
    calculateTransferEnergyCost(fromZone, toZone, probeCount = 1) {
        // Energy cost based on delta-v difference
        // Energy = 0.5 * mass * v^2
        const deltaV = this.calculateTransferDeltaV(fromZone, toZone);
        const probeMass = 10.0; // kg per probe (Config.PROBE_MASS)
        
        // Energy cost: E = 0.5 * m * v^2
        // deltaV is in km/s, convert to m/s: v_mps = deltaV * 1000
        // Energy per probe in Joules: E = 0.5 * m * v^2
        const vMps = deltaV * 1000; // m/s
        const energyPerProbeJoules = 0.5 * probeMass * vMps * vMps;
        const totalEnergyJoules = energyPerProbeJoules * probeCount;
        
        // Return in Joules (will be converted to kW in display)
        return totalEnergyJoules;
    }
    
    createTransfer(fromZoneId, toZoneId, type, count, rate) {
        // Create transfer object
        const transfer = {
            from: fromZoneId,
            to: toZoneId,
            type: type, // 'one-time' or 'continuous'
            count: count, // For one-time
            rate: rate, // For continuous (probes per second)
            progress: 0, // For one-time transfers
            startTime: Date.now()
        };
        
        this.transferArcs.push(transfer);
        
        // Dispatch event for transfer panel
        const event = new CustomEvent('transferCreated', { detail: transfer });
        document.dispatchEvent(event);
        
        // Execute transfer via game engine
        if (window.gameEngine) {
            window.gameEngine.performAction('create_transfer', {
                from_zone: fromZoneId,
                to_zone: toZoneId,
                transfer_type: type,
                count: count,
                rate: rate
            }).catch(error => {
                console.error('Failed to create transfer:', error);
            });
        }
        
        this.render(); // Re-render to show transfer arc
    }

    update(gameState) {
        this.gameState = gameState;
        // Don't override selected zone from game state - let user selection persist
        // if (gameState.harvest_zone) {
        //     this.selectedZone = gameState.harvest_zone;
        // }
        this.render();
        this.updateProbeDots();
        this.updateTransferArcs();
    }
    
    updateProbeDots() {
        if (!this.gameState || !this.orbitalZones) return;
        
        // First, calculate total probes across all zones
        let totalProbes = 0;
        const probesByZone = this.gameState.probes_by_zone || {};
        const zoneProbeCounts = {};
        
        this.orbitalZones.forEach(zone => {
            const zoneProbes = probesByZone[zone.id] || {};
            let zoneProbeCount = 0;
            for (const count of Object.values(zoneProbes)) {
                zoneProbeCount += count || 0;
            }
            zoneProbeCounts[zone.id] = zoneProbeCount;
            totalProbes += zoneProbeCount;
        });
        
        // Maximum dots to show across all zones
        const MAX_TOTAL_DOTS = 200;
        
        // Distribute dots proportionally across zones
        this.orbitalZones.forEach(zone => {
            const planetSquare = this.container.querySelector(`.orbital-zone-planet-square-float[data-zone="${zone.id}"]`);
            if (!planetSquare) return;
            
            let container = planetSquare.querySelector('.orbital-zone-probe-dots-container');
            if (!container) {
                // Create container if it doesn't exist
                container = document.createElement('div');
                container.className = 'orbital-zone-probe-dots-container';
                container.setAttribute('data-zone', zone.id);
                planetSquare.appendChild(container);
            }
            
            // Calculate probe count for this zone
            const probeCount = zoneProbeCounts[zone.id] || 0;
            
            // Calculate number of probe dots for this zone (proportional to total)
            const zonePercentage = totalProbes > 0 ? (probeCount / totalProbes) : 0;
            const totalDots = Math.floor(MAX_TOTAL_DOTS * zonePercentage);
            
            // Clear existing dots
            container.innerHTML = '';
            
            if (totalDots === 0) return;
            
            // Create floating dots around the planet square
            const squareSize = parseInt(planetSquare.style.width) || 35;
            const innerRadius = squareSize / 2 + 8; // Distance from center for inner circle
            const outerRadius = innerRadius + 14; // Distance for outer circle
            const dotsPerCircle = 15; // Approximate dots that fit nicely in first circle
            
            // Determine if we need two circles
            const needsTwoCircles = totalDots > dotsPerCircle;
            const innerCircleDots = needsTwoCircles ? dotsPerCircle : totalDots;
            const outerCircleDots = needsTwoCircles ? totalDots - dotsPerCircle : 0;
            
            // Create dots for inner circle
            for (let i = 0; i < innerCircleDots; i++) {
                const dot = document.createElement('div');
                dot.className = 'orbital-zone-probe-dot probe-dot';
                
                // Position dots in a circle around the planet square
                const angle = (i / innerCircleDots) * Math.PI * 2;
                const x = Math.cos(angle) * innerRadius;
                const y = Math.sin(angle) * innerRadius;
                
                // Add animation delay for floating effect
                const animationDelay = (i / innerCircleDots) * 2; // 2 second cycle
                
                dot.style.left = `calc(50% + ${x}px)`;
                dot.style.top = `calc(50% + ${y}px)`;
                dot.style.animationDelay = `${animationDelay}s`;
                
                container.appendChild(dot);
            }
            
            // Create dots for outer circle if needed
            if (outerCircleDots > 0) {
                for (let i = 0; i < outerCircleDots; i++) {
                    const dot = document.createElement('div');
                    dot.className = 'orbital-zone-probe-dot probe-dot';
                    
                    // Position dots in outer circle
                    const angle = (i / outerCircleDots) * Math.PI * 2;
                    const x = Math.cos(angle) * outerRadius;
                    const y = Math.sin(angle) * outerRadius;
                    
                    // Add animation delay for floating effect (offset from inner circle)
                    const animationDelay = (i / outerCircleDots) * 2 + 1; // Offset by 1 second
                    
                    dot.style.left = `calc(50% + ${x}px)`;
                    dot.style.top = `calc(50% + ${y}px)`;
                    dot.style.animationDelay = `${animationDelay}s`;
                    
                    container.appendChild(dot);
                }
            }
        });
    }
    
    updateTransferArcs() {
        // Get active transfers from game state
        if (this.gameState && this.gameState.active_transfers) {
            // Filter out completed one-time transfers
            this.transferArcs = this.gameState.active_transfers.filter(transfer => {
                // Keep continuous transfers and incomplete one-time transfers
                if (transfer.type === 'continuous') {
                    return true;
                }
                // For one-time transfers, check if they're complete
                if (transfer.type === 'one-time') {
                    const progress = transfer.progress || 0;
                    const totalCount = transfer.totalCount || transfer.count || 0;
                    return progress < totalCount;
                }
                return true;
            });
        }
        
        // Clear existing transfer arcs
        const svgContainer = this.container.querySelector('.transfer-arc-svg-container');
        if (svgContainer) {
            svgContainer.innerHTML = '';
        }
        
        // Draw transfer arcs
        this.transferArcs.forEach(transfer => {
            this.drawTransferArc(transfer);
        });
    }
    
    drawTransferArc(transfer) {
        // Find source and destination planet squares (the colored squares, not zone selector tiles)
        const fromSquare = this.container.querySelector(`.orbital-zone-planet-square-float[data-zone="${transfer.from}"]`);
        const toSquare = this.container.querySelector(`.orbital-zone-planet-square-float[data-zone="${transfer.to}"]`);
        if (!fromSquare || !toSquare) return;
        
        // Create SVG overlay for transfer arc
        let svgContainer = this.container.querySelector('.transfer-arc-svg-container');
        if (!svgContainer) {
            svgContainer = document.createElement('div');
            svgContainer.className = 'transfer-arc-svg-container';
            svgContainer.style.position = 'absolute';
            svgContainer.style.top = '0';
            svgContainer.style.left = '0';
            svgContainer.style.width = '100%';
            svgContainer.style.height = '100%';
            svgContainer.style.pointerEvents = 'none';
            svgContainer.style.zIndex = '10';
            const content = this.container.querySelector('.orbital-zone-selector-content');
            if (content) {
                content.appendChild(svgContainer);
            } else {
                return; // Can't draw without container
            }
        }
        
        // Get positions relative to the planet squares container
        const planetSquaresContainer = this.container.querySelector('.orbital-zone-planet-squares');
        if (!planetSquaresContainer) return;
        
        const fromRect = fromSquare.getBoundingClientRect();
        const toRect = toSquare.getBoundingClientRect();
        const containerRect = planetSquaresContainer.getBoundingClientRect();
        
        const fromX = fromRect.left + fromRect.width / 2 - containerRect.left;
        const fromY = fromRect.top + fromRect.height / 2 - containerRect.top;
        const toX = toRect.left + toRect.width / 2 - containerRect.left;
        const toY = toRect.top + toRect.height / 2 - containerRect.top;
        
        // Create SVG path for Hohmann transfer (elliptical arc)
        const transferId = `transfer-${transfer.id || `${transfer.from}-${transfer.to}-${transfer.type}`}`;
        let svg = svgContainer.querySelector(`svg[data-transfer-id="${transferId}"]`);
        
        if (!svg) {
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'transfer-arc');
            svg.setAttribute('width', containerRect.width.toString());
            svg.setAttribute('height', containerRect.height.toString());
            svg.style.position = 'absolute';
            svg.style.top = '0';
            svg.style.left = '0';
            svg.setAttribute('data-transfer-id', transferId);
            svgContainer.appendChild(svg);
        } else {
            // Clear existing content but keep SVG
            svg.innerHTML = '';
        }
        
        // Calculate elliptical arc for Hohmann transfer
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Create elliptical arc path (Hohmann transfer is an elliptical orbit)
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const largeArc = distance > 50 ? 1 : 0; // Large arc if distance is significant
        const sweep = dy > 0 ? 1 : 0; // Sweep direction based on vertical direction
        
        // Create upward-bending arc (always bend upward)
        // Use a quadratic bezier curve that bends upward
        const controlX = (fromX + toX) / 2;
        const controlY = Math.min(fromY, toY) - 30; // Bend upward by 30px
        
        // Use quadratic bezier: M start, Q control, end
        path.setAttribute('d', `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`);
        path.setAttribute('fill', 'none');
        
        // White arc for all transfers
        path.setAttribute('stroke', '#ffffff');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('opacity', '0.8');
        
        // Dotted line for continuous transfers, solid for one-time
        if (transfer.type === 'continuous') {
            path.setAttribute('stroke-dasharray', '5,5');
        }
        
        svg.appendChild(path);
        
        // Add probe dots traveling along the arc
        if (transfer.type === 'one-time') {
            this.animateTransferProbe(transfer, fromX, fromY, toX, toY, path, svg);
        } else {
            // For continuous transfers, show multiple dots traveling along dotted line
            this.animateContinuousTransfer(transfer, fromX, fromY, toX, toY, path, svg);
        }
    }
    
    animateTransferProbe(transfer, fromX, fromY, toX, toY, path, svg) {
        // Calculate progress based on probes in transit
        const pathLength = path.getTotalLength();
        const transferTime = transfer.transferTime || 1; // seconds
        const gameTime = (this.gameState && this.gameState.time) ? this.gameState.time : 0;
        const startTime = transfer.startTime || gameTime;
        
        // Show dots for probes currently in transit
        if (transfer.inTransit && transfer.inTransit.length > 0) {
            transfer.inTransit.forEach((transit, index) => {
                const probeDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                probeDot.setAttribute('r', '4');
                probeDot.setAttribute('fill', '#ffffff');
                probeDot.setAttribute('opacity', '0.9');
                probeDot.setAttribute('data-transit-index', index.toString());
                svg.appendChild(probeDot);
                
                // Calculate progress for this transit group
                const elapsed = gameTime - transit.departureTime;
                const progress = Math.max(0, Math.min(1, elapsed / transferTime));
                
                // Animate along path
                const animate = () => {
                    const currentGameTime = (this.gameState && this.gameState.time) ? this.gameState.time : gameTime;
                    const currentElapsed = currentGameTime - transit.departureTime;
                    const currentProgress = Math.max(0, Math.min(1, currentElapsed / transferTime));
                    
                    if (currentProgress < 1 && this.transferArcs.includes(transfer)) {
                        const point = path.getPointAtLength(pathLength * currentProgress);
                        probeDot.setAttribute('cx', point.x);
                        probeDot.setAttribute('cy', point.y);
                        requestAnimationFrame(animate);
                    } else {
                        // Transfer complete or transfer removed
                        probeDot.remove();
                    }
                };
                
                // Set initial position
                const initialPoint = path.getPointAtLength(pathLength * progress);
                probeDot.setAttribute('cx', initialPoint.x);
                probeDot.setAttribute('cy', initialPoint.y);
                
                animate();
            });
        }
    }
    
    animateContinuousTransfer(transfer, fromX, fromY, toX, toY, path, svg) {
        const pathLength = path.getTotalLength();
        const transferTime = transfer.transferTime || 1; // seconds
        const gameTime = (this.gameState && this.gameState.time) ? this.gameState.time : 0;
        const rate = transfer.rate || 0.1; // probes per second
        
        // Show dots for probes currently in transit
        if (transfer.inTransit && transfer.inTransit.length > 0) {
            transfer.inTransit.forEach((transit, index) => {
                const probeDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                probeDot.setAttribute('r', '3');
                probeDot.setAttribute('fill', '#ffffff');
                probeDot.setAttribute('opacity', '0.8');
                probeDot.setAttribute('data-transit-index', index.toString());
                svg.appendChild(probeDot);
                
                // Calculate progress for this transit group
                const elapsed = gameTime - transit.departureTime;
                const progress = Math.max(0, Math.min(1, elapsed / transferTime));
                
                // Animate along path
                const animate = () => {
                    const currentGameTime = (this.gameState && this.gameState.time) ? this.gameState.time : gameTime;
                    const currentElapsed = currentGameTime - transit.departureTime;
                    const currentProgress = Math.max(0, Math.min(1, currentElapsed / transferTime));
                    
                    if (currentProgress < 1 && this.transferArcs.includes(transfer)) {
                        const point = path.getPointAtLength(pathLength * currentProgress);
                        probeDot.setAttribute('cx', point.x);
                        probeDot.setAttribute('cy', point.y);
                        requestAnimationFrame(animate);
                    } else {
                        // Transfer complete or transfer removed
                        probeDot.remove();
                    }
                };
                
                // Set initial position
                const initialPoint = path.getPointAtLength(pathLength * progress);
                probeDot.setAttribute('cx', initialPoint.x);
                probeDot.setAttribute('cy', initialPoint.y);
                
                animate();
            });
        }
    }
}
