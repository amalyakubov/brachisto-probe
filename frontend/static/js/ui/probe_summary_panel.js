/** Probe summary panel - left side overlay showing probe statistics */
class ProbeSummaryPanel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.gameState = null;
        
        // Performance optimization: Cache calculations
        this.cachedCalculations = null;
        this.lastCalculationKey = null;
        
        if (!this.container) {
            console.error('ProbeSummaryPanel: Container not found:', containerId);
        } else {
            console.log('ProbeSummaryPanel: Container found, initializing');
            this.init();
        }
    }

    init() {
        if (this.container) {
            this.render();
        } else {
            console.warn('ProbeSummaryPanel: Cannot init, container not found');
        }
    }

    formatNumber(value) {
        if (value === 0) return '0';
        // Use scientific notation for numbers >= 10
        if (value >= 10) {
            return value.toExponential(2);
        }
        // Use float notation for numbers < 1
        if (value < 1 && value > 0) {
            return value.toFixed(4);
        }
        // Regular notation for 1 <= value < 10
        return value.toFixed(2);
    }

    formatNumberWithCommas(value) {
        if (value >= 1e6) {
            return value.toExponential(2);
        }
        return Math.floor(value).toLocaleString('en-US');
    }

    render() {
        if (!this.container) {
            console.warn('ProbeSummaryPanel: Cannot render, container not found');
            return;
        }

        try {
            let html = '<div class="probe-summary-panel">';
            
            // Title
            html += '<div class="probe-summary-title">Probe Summary</div>';
            
            // Total Probes
            html += '<div class="probe-summary-item">';
            html += '<div class="probe-summary-label">Total Probes</div>';
            html += '<div class="probe-summary-value" id="probe-summary-total">0</div>';
            html += '</div>';

            // Probe Production Rate
            html += '<div class="probe-summary-item">';
            html += '<div class="probe-summary-label">Production Rate</div>';
            html += '<div class="probe-summary-value" id="probe-summary-rate">0.00 probes/day</div>';
            html += '</div>';

            // Doubling Time
            html += '<div class="probe-summary-item">';
            html += '<div class="probe-summary-label">Doubling Time</div>';
            html += '<div class="probe-summary-value" id="probe-summary-doubling">—</div>';
            html += '</div>';

            // Dexterity Breakdown (merged from metrics panel)
            html += '<div class="probe-summary-item">';
            html += '<div class="probe-summary-label">Dexterity Breakdown</div>';
            html += '<div class="probe-summary-breakdown" id="probe-summary-dexterity">';
            html += '<div class="probe-summary-breakdown-item">';
            html += '<span class="probe-summary-breakdown-label">Dyson:</span>';
            html += '<span class="probe-summary-breakdown-value" id="probe-dex-dyson-rate">0 kg/s</span>';
            html += '<span class="probe-summary-breakdown-count" id="probe-dex-dyson-count">0</span>';
            html += '</div>';
            html += '<div class="probe-summary-breakdown-item">';
            html += '<span class="probe-summary-breakdown-label">Mining:</span>';
            html += '<span class="probe-summary-breakdown-value" id="probe-dex-mining-rate">0 kg/s</span>';
            html += '<span class="probe-summary-breakdown-count" id="probe-dex-mining-count">0</span>';
            html += '</div>';
            html += '<div class="probe-summary-breakdown-item">';
            html += '<span class="probe-summary-breakdown-label">Probes:</span>';
            html += '<span class="probe-summary-breakdown-value" id="probe-dex-probes-rate">0 kg/s</span>';
            html += '<span class="probe-summary-breakdown-count" id="probe-dex-probes-count">0</span>';
            html += '</div>';
            html += '<div class="probe-summary-breakdown-item">';
            html += '<span class="probe-summary-breakdown-label">Structures:</span>';
            html += '<span class="probe-summary-breakdown-value" id="probe-dex-structures-rate">0 kg/s</span>';
            html += '<span class="probe-summary-breakdown-count" id="probe-dex-structures-count">0</span>';
            html += '</div>';
            html += '</div>';
            html += '</div>';

            html += '</div>'; // Close probe-summary-panel
            
            // Zone Controls section (rendered by CommandPanel)
            // The command-panel-content div is already in the container, CommandPanel will render into it

            this.container.innerHTML = html;
        } catch (error) {
            console.error('ProbeSummaryPanel: Error rendering panel:', error);
        }
    }

    update(gameState) {
        if (!gameState) return;
        
        // Ensure container exists
        if (!this.container) {
            this.container = document.getElementById('probe-summary-panel');
            if (!this.container) {
                console.warn('ProbeSummaryPanel: container not found, skipping update');
                return;
            }
        }
        
        // Ensure the panel is rendered
        const hasContent = this.container.querySelector('.probe-summary-panel');
        if (!hasContent) {
            console.log('ProbeSummaryPanel: Rendering panel (content missing)');
            this.render();
            if (!this.container.querySelector('.probe-summary-panel')) {
                console.error('ProbeSummaryPanel: Render failed, panel still missing');
                return;
            }
        }

        this.gameState = gameState;

        // Use shared probe count cache to avoid redundant calculations
        const probeCache = window.probeCountCache;
        if (probeCache) {
            probeCache.update(gameState);
            var totalProbes = probeCache.getTotalProbes();
        } else {
            // Fallback: calculate manually if cache not available
            let totalProbes = 0;
            const probesByZone = gameState.probes_by_zone || {};
            for (const [zoneId, zoneProbes] of Object.entries(probesByZone)) {
                if (zoneProbes && typeof zoneProbes === 'object') {
                    totalProbes += Object.values(zoneProbes).reduce((sum, count) => sum + (count || 0), 0);
                }
            }
            
            // Only use legacy probes if probesByZone is empty (backward compatibility for old saves)
            // Single probe type only: directly access 'probe' key
            if (totalProbes === 0) {
                totalProbes += gameState.probes?.['probe'] || 0;
            }
        }
        const totalEl = document.getElementById('probe-summary-total');
        if (totalEl) {
            totalEl.textContent = this.formatNumberWithCommas(Math.floor(totalProbes));
        }

        // Probe production rate (includes both factory production and manual probe building)
        // Rate is in probes/day (fundamental time unit)
        const totalProbeProductionRate = gameState.probe_production_rate !== undefined 
            ? gameState.probe_production_rate 
            : 0;
        const rateEl = document.getElementById('probe-summary-rate');
        if (rateEl) {
            // Format in scientific notation for probes per day
            if (totalProbeProductionRate === 0) {
                rateEl.textContent = '0.00 probes/day';
            } else {
                rateEl.textContent = `${totalProbeProductionRate.toExponential(2)} probes/day`;
            }
        }
        
        // Calculate doubling time
        // For exponential growth: if production_rate scales with probe_count,
        // then doubling_time = ln(2) * current_probes / production_rate
        // For linear growth (constant production rate): doubling_time = current_probes / production_rate
        // Since probe production includes replicating probes (which scale with probe count),
        // we use exponential growth formula
        // Note: production_rate is in probes/day, so doubling_time will be in days
        let doublingTime = Infinity;
        if (totalProbeProductionRate > 0 && totalProbes > 0) {
            // Calculate growth rate: production_rate / current_probes (probes per day per probe)
            const growthRate = totalProbeProductionRate / totalProbes;
            
            // For exponential growth: doubling_time = ln(2) / growth_rate (in days)
            // This is equivalent to: ln(2) * current_probes / production_rate
            if (growthRate > 0 && isFinite(growthRate)) {
                doublingTime = Math.log(2) / growthRate; // Result in days
            } else {
                // Fallback to linear growth if growth rate is invalid
                doublingTime = totalProbes / totalProbeProductionRate; // Result in days
            }
        }
        const doublingEl = document.getElementById('probe-summary-doubling');
        if (doublingEl) {
            if (doublingTime === Infinity || doublingTime <= 0 || !isFinite(doublingTime)) {
                doublingEl.textContent = '—';
            } else {
                // doublingTime is in days, use FormatUtils for consistent formatting
                // FormatUtils.formatDoublingTime can show hours/minutes for very short times
                doublingEl.textContent = FormatUtils.formatDoublingTime(doublingTime);
            }
        }

        // Dexterity Breakdown (merged from metrics panel)
        // Cache expensive calculations - only recalculate when inputs change
        const allocations = gameState.probe_allocations || {};
        const allocationsByZone = gameState.probe_allocations_by_zone || {};
        const breakdown = gameState.resource_breakdowns?.dexterity;
        const buildAllocation = gameState.build_allocation || 50;
        
        // Create cache key from relevant inputs (use efficient hash instead of JSON.stringify)
        let hash = 0;
        hash = ((hash << 5) - hash) + (buildAllocation || 0);
        hash = ((hash << 5) - hash) + ((breakdown?.probes?.upgrades?.find(u => u.name === 'Robotic Systems')?.bonus || 0) * 1000);
        
        // Hash allocations efficiently
        for (const [key, alloc] of Object.entries(allocations)) {
            hash = ((hash << 5) - hash) + key.charCodeAt(0);
            if (alloc && typeof alloc === 'object') {
                for (const count of Object.values(alloc)) {
                    hash = ((hash << 5) - hash) + (count || 0);
                }
            }
        }
        
        // Hash allocationsByZone efficiently
        for (const [zoneId, zoneAllocs] of Object.entries(allocationsByZone)) {
            hash = ((hash << 5) - hash) + zoneId.charCodeAt(0);
            if (zoneAllocs && typeof zoneAllocs === 'object') {
                for (const [key, alloc] of Object.entries(zoneAllocs)) {
                    hash = ((hash << 5) - hash) + key.charCodeAt(0);
                    if (alloc && typeof alloc === 'object') {
                        for (const count of Object.values(alloc)) {
                            hash = ((hash << 5) - hash) + (count || 0);
                        }
                    }
                }
            }
        }
        
        const calculationKey = hash.toString();
        
        // Reuse cached calculations if inputs haven't changed
        if (this.lastCalculationKey !== calculationKey || !this.cachedCalculations) {
            // Get research multiplier
            const roboticBonus = breakdown?.probes?.upgrades?.find(u => u.name === 'Robotic Systems')?.bonus || 0;
            const totalMultiplier = 1.0 + (roboticBonus || 0);
            
            // Calculate actual rates in kg/day
            // Base rates from config
            const PROBE_HARVEST_RATE = Config.PROBE_HARVEST_RATE; // 100 kg/day per probe
            const PROBE_BUILD_RATE = Config.PROBE_BUILD_RATE; // 10 kg/day per probe
            
            // Helper function to calculate dexterity rate in kg/day
            const calculateDexterityRateForProbes = (probes, baseRatePerProbe, multiplier = 1.0) => {
                return probes * baseRatePerProbe * multiplier; // kg/day
            };
            
            // Sum allocations across all zones
            let totalDysonProbes = 0;
            let totalDysonDexterityPerDay = 0; // kg/day
            let totalMiningProbes = 0;
            let totalMiningDexterityPerDay = 0; // kg/day
            let totalProbeConstructProbes = 0;
            let totalProbeConstructDexterityPerDay = 0; // kg/day
            let totalStructureProbes = 0;
            let totalStructureDexterityPerDay = 0; // kg/day
            
            // Legacy allocations
            totalDysonProbes += (allocations.dyson?.probe || 0) + (allocations.dyson?.construction_probe || 0);
            totalDysonDexterityPerDay += calculateDexterityRateForProbes(
                (allocations.dyson?.probe || 0), PROBE_BUILD_RATE, totalMultiplier
            ) + calculateDexterityRateForProbes(
                (allocations.dyson?.construction_probe || 0), PROBE_BUILD_RATE * 1.8, totalMultiplier
            );
            
            totalMiningProbes += (allocations.harvest?.probe || 0) + (allocations.harvest?.miner_probe || 0);
            totalMiningDexterityPerDay += calculateDexterityRateForProbes(
                (allocations.harvest?.probe || 0), PROBE_HARVEST_RATE, totalMultiplier
            ) + calculateDexterityRateForProbes(
                (allocations.harvest?.miner_probe || 0), PROBE_HARVEST_RATE * 1.5, totalMultiplier
            );
            
            totalProbeConstructProbes += (allocations.construct?.probe || 0) + (allocations.construct?.construction_probe || 0);
            totalProbeConstructDexterityPerDay += calculateDexterityRateForProbes(
                (allocations.construct?.probe || 0), PROBE_BUILD_RATE, totalMultiplier
            ) + calculateDexterityRateForProbes(
                (allocations.construct?.construction_probe || 0), PROBE_BUILD_RATE * 1.8, totalMultiplier
            );
            
            // Zone-based allocations - use probe cache for probe counts
            const probeCache = window.probeCountCache;
            const cachedProbes = probeCache ? probeCache.update(gameState) : null;
            
            for (const [zoneId, zoneAllocs] of Object.entries(allocationsByZone)) {
                // Use cached probe counts if available
                let zoneDysonProbes = 0;
                let zoneMiningProbes = 0;
                let constructProbes = 0;
                
                if (cachedProbes) {
                    // Get probe counts from allocations and cache
                    const zoneProbeCount = cachedProbes.probesByZone[zoneId] || 0;
                    const dysonAlloc = zoneAllocs.dyson || 0;
                    const harvestAlloc = zoneAllocs.harvest || 0;
                    const constructAlloc = zoneAllocs.construct || 0;
                    
                    zoneDysonProbes = Math.floor(zoneProbeCount * dysonAlloc);
                    zoneMiningProbes = Math.floor(zoneProbeCount * harvestAlloc);
                    constructProbes = Math.floor(zoneProbeCount * constructAlloc);
                } else {
                    // Fallback: calculate from allocations
                    zoneDysonProbes = Object.values(zoneAllocs.dyson || {}).reduce((sum, count) => sum + (count || 0), 0);
                    zoneMiningProbes = Object.values(zoneAllocs.harvest || {}).reduce((sum, count) => sum + (count || 0), 0);
                    constructProbes = Object.values(zoneAllocs.construct || {}).reduce((sum, count) => sum + (count || 0), 0);
                }
                
                totalDysonProbes += zoneDysonProbes;
                totalDysonDexterityPerDay += calculateDexterityRateForProbes(
                    zoneDysonProbes, PROBE_BUILD_RATE, totalMultiplier
                );
                
                totalMiningProbes += zoneMiningProbes;
                totalMiningDexterityPerDay += calculateDexterityRateForProbes(
                    zoneMiningProbes, PROBE_HARVEST_RATE, totalMultiplier
                );
                
                totalProbeConstructProbes += constructProbes;
                totalProbeConstructDexterityPerDay += calculateDexterityRateForProbes(
                    constructProbes, PROBE_BUILD_RATE, totalMultiplier
                );
                
                // Structure building probes (based on build_allocation slider)
                const structureFraction = (100 - buildAllocation) / 100.0;
                const structureBuildingProbes = constructProbes * structureFraction;
                totalStructureProbes += structureBuildingProbes;
                totalStructureDexterityPerDay += calculateDexterityRateForProbes(
                    structureBuildingProbes, PROBE_BUILD_RATE, totalMultiplier
                );
            }
            
            // Also calculate structure probes from legacy allocations
            const legacyConstructProbes = (allocations.construct?.probe || 0) + (allocations.construct?.construction_probe || 0);
            const structureFraction = (100 - buildAllocation) / 100.0;
            const legacyStructureProbes = legacyConstructProbes * structureFraction;
            totalStructureProbes += legacyStructureProbes;
            totalStructureDexterityPerDay += calculateDexterityRateForProbes(
                legacyStructureProbes, PROBE_BUILD_RATE, totalMultiplier
            );
            
            // Cache the results
            this.cachedCalculations = {
                totalDysonProbes,
                totalDysonDexterityPerDay,
                totalMiningProbes,
                totalMiningDexterityPerDay,
                totalProbeConstructProbes,
                totalProbeConstructDexterityPerDay,
                totalStructureProbes,
                totalStructureDexterityPerDay
            };
            this.lastCalculationKey = calculationKey;
        }
        
        // Use cached calculations
        const {
            totalDysonProbes,
            totalDysonDexterityPerDay,
            totalMiningProbes,
            totalMiningDexterityPerDay,
            totalProbeConstructProbes,
            totalProbeConstructDexterityPerDay,
            totalStructureProbes,
            totalStructureDexterityPerDay
        } = this.cachedCalculations;
        
        // Update Dyson dexterity - use actual Dyson construction rate from gameState (kg/day)
        const dysonConstructionRate = gameState.dyson_construction_rate || 0; // kg/day from backend
        const dysonRateEl = document.getElementById('probe-dex-dyson-rate');
        const dysonCountEl = document.getElementById('probe-dex-dyson-count');
        if (dysonRateEl) dysonRateEl.textContent = FormatUtils.formatRate(dysonConstructionRate, 'kg');
        if (dysonCountEl) dysonCountEl.textContent = `${this.formatNumberWithCommas(Math.floor(totalDysonProbes))}`;

        // Update Mining dexterity (rates are in kg/day)
        const miningRateEl = document.getElementById('probe-dex-mining-rate');
        const miningCountEl = document.getElementById('probe-dex-mining-count');
        if (miningRateEl) miningRateEl.textContent = FormatUtils.formatRate(totalMiningDexterityPerDay, 'kg');
        if (miningCountEl) miningCountEl.textContent = `${this.formatNumberWithCommas(Math.floor(totalMiningProbes))}`;

        // Update Probe construction dexterity (rates are in kg/day)
        const probeConstructRateEl = document.getElementById('probe-dex-probes-rate');
        const probeCountEl = document.getElementById('probe-dex-probes-count');
        if (probeConstructRateEl) probeConstructRateEl.textContent = FormatUtils.formatRate(totalProbeConstructDexterityPerDay, 'kg');
        if (probeCountEl) probeCountEl.textContent = `${this.formatNumberWithCommas(Math.floor(totalProbeConstructProbes))}`;

        // Update Structure construction dexterity (rates are in kg/day)
        const structureRateEl = document.getElementById('probe-dex-structures-rate');
        const structureCountEl = document.getElementById('probe-dex-structures-count');
        if (structureRateEl) structureRateEl.textContent = FormatUtils.formatRate(totalStructureDexterityPerDay, 'kg');
        if (structureCountEl) structureCountEl.textContent = `${this.formatNumberWithCommas(Math.floor(totalStructureProbes))}`;
    }
}

