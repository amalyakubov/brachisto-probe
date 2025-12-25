/** Probe Stats Panel - Comprehensive probe statistics with base values and research multipliers */
class ProbePanel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.gameState = null;
        this.engine = null;
        this.collapsedCategories = new Set(['propulsion', 'mass_driver', 'compute', 'skills']);
        this.orbitalMechanics = null;
        this.transferSystem = null;
        this.init();
    }

    init() {
        // Initialize event listeners if needed
    }

    formatNumber(value, decimals = 2) {
        if (value >= 1e24) return (value / 1e24).toFixed(decimals) + 'Y';
        if (value >= 1e21) return (value / 1e21).toFixed(decimals) + 'Z';
        if (value >= 1e18) return (value / 1e18).toFixed(decimals) + 'E';
        if (value >= 1e15) return (value / 1e15).toFixed(decimals) + 'P';
        if (value >= 1e12) return (value / 1e12).toFixed(decimals) + 'T';
        if (value >= 1e9) return (value / 1e9).toFixed(decimals) + 'G';
        if (value >= 1e6) return (value / 1e6).toFixed(decimals) + 'M';
        if (value >= 1e3) return (value / 1e3).toFixed(decimals) + 'k';
        return value.toFixed(decimals);
    }

    formatDeltaV(dv) {
        // Format delta-v in m/s
        if (dv >= 1e6) return (dv / 1e6).toFixed(2) + ' Mm/s';
        if (dv >= 1e3) return (dv / 1e3).toFixed(2) + ' km/s';
        return dv.toFixed(2) + ' m/s';
    }

    getSkillValue(skillName, subcategory = null) {
        if (!this.engine) {
            // Fallback to gameState.skills
            const skills = this.gameState?.skills || {};
            if (subcategory) {
                // Handle computer systems subcategories
                const computerSkills = skills.computer_systems || {};
                return computerSkills[subcategory] || 1.0;
            }
            return skills[skillName] || 1.0;
        }
        
        try {
            if (subcategory) {
                return this.engine.getSkillValue(skillName, subcategory);
            }
            return this.engine.getSkillValue(skillName);
        } catch (e) {
            // Fallback
            const skills = this.gameState?.skills || {};
            return skills[skillName] || 1.0;
        }
    }

    getBaseSkillValue(skillName, subcategory = null) {
        if (!this.engine) {
            // Base values from SKILL_DEFINITIONS
            if (typeof SKILL_DEFINITIONS !== 'undefined') {
                const skillDef = SKILL_DEFINITIONS[skillName];
                if (skillDef) return skillDef.baseValue || 1.0;
            }
            return 1.0;
        }
        
        try {
            if (subcategory) {
                return this.engine.getBaseSkillValue(skillName, subcategory);
            }
            return this.engine.getBaseSkillValue(skillName);
        } catch (e) {
            return 1.0;
        }
    }

    getSkillDisplayName(skillName) {
        if (typeof SKILL_DEFINITIONS !== 'undefined') {
            const skillDef = SKILL_DEFINITIONS[skillName];
            if (skillDef) return skillDef.displayName || skillName;
        }
        // Fallback to formatted name
        return skillName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    toggleCategoryCollapse(categoryId) {
        if (this.collapsedCategories.has(categoryId)) {
            this.collapsedCategories.delete(categoryId);
        } else {
            this.collapsedCategories.add(categoryId);
        }
        this.render();
    }

    calculateMiningRate() {
        const baseRate = Config.PROBE_HARVEST_RATE;
        const locomotion = this.getSkillValue('locomotion');
        const acds = this.getSkillValue('acds') || 1.0; // ACDS might be computed
        // Try manipulation first, then robotic as fallback
        const robotics = this.getSkillValue('manipulation') || this.getSkillValue('robotic') || 1.0;
        const production = this.getSkillValue('production');
        return {
            base: baseRate,
            effective: baseRate * locomotion * acds * robotics * production,
            modifiers: [
                { name: 'Locomotion', value: locomotion, base: this.getBaseSkillValue('locomotion') },
                { name: 'ACDS', value: acds, base: 1.0 },
                { name: 'Robotics', value: robotics, base: this.getBaseSkillValue('manipulation') || this.getBaseSkillValue('robotic') || 1.0 },
                { name: 'Production', value: production, base: this.getBaseSkillValue('production') }
            ]
        };
    }

    calculateBuildingRate() {
        const baseRate = Config.PROBE_BUILD_RATE;
        const locomotion = this.getSkillValue('locomotion');
        const acds = this.getSkillValue('acds') || 1.0;
        // Try manipulation first, then robotic as fallback
        const robotics = this.getSkillValue('manipulation') || this.getSkillValue('robotic') || 1.0;
        return {
            base: baseRate,
            effective: baseRate * locomotion * acds * robotics,
            modifiers: [
                { name: 'Locomotion', value: locomotion, base: this.getBaseSkillValue('locomotion') },
                { name: 'ACDS', value: acds, base: 1.0 },
                { name: 'Robotics', value: robotics, base: this.getBaseSkillValue('manipulation') || this.getBaseSkillValue('robotic') || 1.0 }
            ]
        };
    }

    calculateDeltaV() {
        const baseIsp = Config.BASE_PROPULSION_ISP || 500;
        const propulsionSkill = this.getSkillValue('propulsion');
        const effectiveIsp = baseIsp * propulsionSkill;
        
        // Calculate delta-v using Tsiolkovsky rocket equation
        // Δv = Isp * g0 * ln(m0/mf)
        // For probes, assume mass ratio of 2 (half propellant, half payload)
        const g0 = 9.80665; // m/s²
        const massRatio = 2.0; // m0/mf
        const deltaV = effectiveIsp * g0 * Math.log(massRatio);
        
        return {
            baseIsp: baseIsp,
            effectiveIsp: effectiveIsp,
            deltaV: deltaV,
            propulsionSkill: propulsionSkill,
            basePropulsionSkill: this.getBaseSkillValue('propulsion')
        };
    }

    calculateMassDriverPerformance() {
        // Speed multiplier calculation (from transfer_system.js)
        const energyConverter = this.getSkillValue('energy_converter');
        const propulsion = this.getSkillValue('propulsion');
        const thrust = this.getSkillValue('thrust');
        const skillBoost = Math.sqrt(energyConverter) * Math.sqrt(propulsion) * Math.sqrt(thrust);
        
        // Base multiplier from mass driver count (1 driver = 0.1x time, so 10x speed)
        const baseMinMultiplier = 0.1;
        const speedMultiplier = baseMinMultiplier / skillBoost;
        const finalSpeedMultiplier = Math.max(0.001, speedMultiplier);
        
        // Capacity calculation (from transfer_system.js)
        const baseCapacityPerDriver = 100e12; // 100 GT/day
        const transportSkill = this.getSkillValue('energy_transport');
        const strengthSkill = this.getSkillValue('strength');
        const locomotionSkill = this.getSkillValue('locomotion');
        const skillMultiplier = transportSkill * Math.sqrt(strengthSkill) * Math.sqrt(locomotionSkill);
        const capacityPerDriver = baseCapacityPerDriver * skillMultiplier;
        
        return {
            speedMultiplier: finalSpeedMultiplier,
            speedBoost: 1.0 / finalSpeedMultiplier,
            capacityPerDriver: capacityPerDriver,
            modifiers: {
                energyConverter: energyConverter,
                propulsion: propulsion,
                thrust: thrust,
                transport: transportSkill,
                strength: strengthSkill,
                locomotion: locomotionSkill
            }
        };
    }

    calculateComputePower() {
        const cpu = this.getSkillValue('cpu');
        const gpu = this.getSkillValue('gpu');
        const interconnect = this.getSkillValue('interconnect');
        const ioBandwidth = this.getSkillValue('io_bandwidth');
        const baseFLOPS = 1.0; // Base 1 FLOPS per probe
        const effectiveFLOPS = baseFLOPS * cpu * gpu * interconnect * ioBandwidth;
        
        return {
            base: baseFLOPS,
            effective: effectiveFLOPS,
            modifiers: [
                { name: 'CPU', value: cpu, base: this.getBaseSkillValue('cpu') },
                { name: 'GPU', value: gpu, base: this.getBaseSkillValue('gpu') },
                { name: 'Interconnect', value: interconnect, base: this.getBaseSkillValue('interconnect') },
                { name: 'I/O Bandwidth', value: ioBandwidth, base: this.getBaseSkillValue('io_bandwidth') }
            ]
        };
    }

    /**
     * Calculate probe energy production with skill-based upgrades
     * Uses the same formula as EnergyCalculator.calculateProbeEnergyProduction()
     */
    calculateProbeEnergyProduction() {
        const baseProduction = 100000; // 100 kW per probe (BASE_ENERGY_PRODUCTION_PROBE)
        
        // Get skills for energy production
        const solarPv = this.getSkillValue('solar_pv') || this.getSkillValue('energy_collection') || 1.0;
        const energyConverter = this.getSkillValue('energy_converter') || 1.0;
        const radiator = this.getSkillValue('radiator') || 1.0;
        
        // Calculate upgrade factor using geometric mean (matching EnergyCalculator logic)
        // This matches the probe_energy_production coefficients: solar_pv (1.0), energy_converter (0.6), radiator (0.4)
        const skillValues = [
            1.0 * solarPv,
            0.6 * energyConverter,
            0.4 * radiator
        ];
        const product = skillValues.reduce((prod, val) => prod * val, 1.0);
        const geometricMean = Math.pow(product, 1.0 / skillValues.length);
        const alpha = 0.75; // probe_performance alpha factor
        const upgradeFactor = Math.exp(alpha * Math.log(geometricMean));
        
        const effectiveProduction = baseProduction * upgradeFactor;
        
        return {
            base: baseProduction,
            effective: effectiveProduction,
            upgradeFactor: upgradeFactor,
            modifiers: [
                { name: 'Solar PV', value: solarPv, base: this.getBaseSkillValue('solar_pv') || this.getBaseSkillValue('energy_collection') || 1.0 },
                { name: 'Energy Converter', value: energyConverter, base: this.getBaseSkillValue('energy_converter') },
                { name: 'Radiator', value: radiator, base: this.getBaseSkillValue('radiator') }
            ]
        };
    }

    /**
     * Calculate probe energy consumption with skill-based reductions
     * Uses the same formula as EnergyCalculator.getEffectiveEnergyCost()
     */
    calculateProbeEnergyConsumption() {
        // Base consumption for mining (500 kW) - this is per mining probe
        const baseMiningCost = 500000; // 500 kW per mining probe
        const baseRecycleCost = 300000; // 300 kW per slag recycling probe
        
        // Get skills for energy consumption reduction
        const energyTransport = this.getSkillValue('energy_transport') || 1.0;
        const radiator = this.getSkillValue('radiator') || 1.0;
        const heatPump = this.getSkillValue('heat_pump') || 1.0;
        
        // Calculate upgrade factor using geometric mean (matching EnergyCalculator logic)
        // This matches the probe_energy_consumption coefficients: energy_transport (1.0), radiator (0.6), heat_pump (0.4)
        const skillValues = [
            1.0 * energyTransport,
            0.6 * radiator,
            0.4 * heatPump
        ];
        const product = skillValues.reduce((prod, val) => prod * val, 1.0);
        const geometricMean = Math.pow(product, 1.0 / skillValues.length);
        const alpha = 0.75; // probe_performance alpha factor
        const consumptionReductionFactor = Math.exp(alpha * Math.log(geometricMean));
        
        // Effective costs are reduced by the upgrade factor
        const effectiveMiningCost = baseMiningCost / consumptionReductionFactor;
        const effectiveRecycleCost = baseRecycleCost / consumptionReductionFactor;
        
        return {
            mining: {
                base: baseMiningCost,
                effective: effectiveMiningCost,
                reductionFactor: consumptionReductionFactor
            },
            recycle: {
                base: baseRecycleCost,
                effective: effectiveRecycleCost,
                reductionFactor: consumptionReductionFactor
            },
            modifiers: [
                { name: 'Energy Transport', value: energyTransport, base: this.getBaseSkillValue('energy_transport') },
                { name: 'Radiator', value: radiator, base: this.getBaseSkillValue('radiator') },
                { name: 'Heat Pump', value: heatPump, base: this.getBaseSkillValue('heat_pump') }
            ]
        };
    }

    renderStatRow(label, baseValue, effectiveValue, unit, modifiers = []) {
        let html = '<div class="probe-summary-breakdown-item" style="margin-bottom: 6px;">';
        html += `<span class="probe-summary-breakdown-label" style="font-size: 10px;">${label}:</span> `;
        html += `<span class="probe-summary-breakdown-count" style="font-size: 10px;">`;
        html += `${this.formatNumber(baseValue)}`;
        if (effectiveValue !== baseValue) {
            html += ` → <span style="color: rgba(100, 200, 100, 0.9);">${this.formatNumber(effectiveValue)}</span>`;
        }
        html += ` ${unit}`;
        html += `</span>`;
        html += '</div>';
        
        if (modifiers.length > 0) {
            html += '<div style="margin-left: 12px; margin-top: 2px; margin-bottom: 4px;">';
            modifiers.forEach(mod => {
                const bonus = ((mod.value / mod.base) - 1.0) * 100;
                if (bonus > 0) {
                    html += `<div style="font-size: 9px; color: rgba(255, 255, 255, 0.6);">`;
                    html += `  ${mod.name}: <span style="color: rgba(100, 200, 100, 0.8);">+${bonus.toFixed(1)}%</span>`;
                    html += `</div>`;
                }
            });
            html += '</div>';
        }
        
        return html;
    }

    renderCategorySection(categoryId, title, content) {
        const isCollapsed = this.collapsedCategories.has(categoryId);
        let html = '<div class="collapsible-category" style="margin-bottom: 8px;">';
        html += `<div class="collapsible-category-header${isCollapsed ? ' collapsed' : ''}" `;
        html += `onclick="probePanel.toggleCategoryCollapse('${categoryId}')" `;
        html += `style="cursor: pointer; padding: 6px 8px; background: rgba(74, 158, 255, 0.1); border-radius: 3px; margin-bottom: 4px;">`;
        html += `<span class="collapsible-category-title" style="font-size: 11px; font-weight: 600; color: rgba(255, 255, 255, 0.9);">${title}</span>`;
        html += `<span style="float: right; color: rgba(255, 255, 255, 0.5); font-size: 9px;">${isCollapsed ? '▶' : '▼'}</span>`;
        html += '</div>';
        html += `<div class="collapsible-category-content${isCollapsed ? ' collapsed' : ''}" `;
        html += `style="${isCollapsed ? 'display: none;' : ''} padding: 4px 8px;">`;
        html += content;
        html += '</div>';
        html += '</div>';
        return html;
    }

    render() {
        if (!this.container) return;
        
        if (!this.gameState) {
            this.container.innerHTML = '<div style="padding: 20px; color: rgba(255, 255, 255, 0.5); font-size: 10px;">Loading probe stats...</div>';
            return;
        }

        let html = '<div class="probe-summary-panel">';
        html += '<div class="probe-summary-title" style="margin-bottom: 8px;">Probe Statistics</div>';
        html += '<div style="font-size: 9px; color: rgba(255, 255, 255, 0.5); padding: 4px 8px; margin-bottom: 8px;">Base values and research multipliers</div>';

        // Section 1: Core Probe Stats
        const miningRate = this.calculateMiningRate();
        const buildingRate = this.calculateBuildingRate();
        const energyProduction = this.calculateProbeEnergyProduction();
        const energyConsumption = this.calculateProbeEnergyConsumption();
        
        let coreStatsContent = '';
        coreStatsContent += this.renderStatRow('Mining Rate', miningRate.base, miningRate.effective, 'kg/day', miningRate.modifiers);
        coreStatsContent += this.renderStatRow('Building Rate', buildingRate.base, buildingRate.effective, 'kg/day', buildingRate.modifiers);
        coreStatsContent += this.renderStatRow('Energy Production', energyProduction.base, energyProduction.effective, 'W/probe', energyProduction.modifiers);
        coreStatsContent += this.renderStatRow('Energy Consumption (Mining)', energyConsumption.mining.base, energyConsumption.mining.effective, 'W/probe', energyConsumption.modifiers);
        coreStatsContent += this.renderStatRow('Energy Consumption (Recycle)', energyConsumption.recycle.base, energyConsumption.recycle.effective, 'W/probe', []);
        
        // Show net energy per probe when mining
        const netEnergyWhenMining = energyProduction.effective - energyConsumption.mining.effective;
        coreStatsContent += '<div class="probe-summary-breakdown-item" style="margin-top: 6px; margin-bottom: 6px;">';
        coreStatsContent += `<span class="probe-summary-breakdown-label" style="font-size: 10px;">Net Energy (when mining):</span> `;
        coreStatsContent += `<span class="probe-summary-breakdown-count" style="font-size: 10px; color: ${netEnergyWhenMining >= 0 ? 'rgba(100, 200, 100, 0.9)' : 'rgba(255, 100, 100, 0.9)'};">`;
        coreStatsContent += `${netEnergyWhenMining >= 0 ? '+' : ''}${this.formatNumber(netEnergyWhenMining)} W/probe`;
        coreStatsContent += `</span>`;
        coreStatsContent += '</div>';
        
        html += this.renderCategorySection('core', 'Core Probe Stats', coreStatsContent);

        // Section 2: Propulsion and Delta-V
        const deltaVData = this.calculateDeltaV();
        let propulsionContent = '';
        propulsionContent += this.renderStatRow('Base Isp', deltaVData.baseIsp, deltaVData.baseIsp, 's', []);
        propulsionContent += this.renderStatRow('Effective Isp', deltaVData.baseIsp, deltaVData.effectiveIsp, 's', [
            { name: 'Propulsion', value: deltaVData.propulsionSkill, base: deltaVData.basePropulsionSkill }
        ]);
        propulsionContent += '<div class="probe-summary-breakdown-item" style="margin-top: 6px; margin-bottom: 6px;">';
        propulsionContent += `<span class="probe-summary-breakdown-label" style="font-size: 10px;">Delta-V Capability:</span> `;
        propulsionContent += `<span class="probe-summary-breakdown-count" style="font-size: 10px; color: rgba(100, 200, 100, 0.9);">`;
        propulsionContent += this.formatDeltaV(deltaVData.deltaV);
        propulsionContent += `</span>`;
        propulsionContent += '</div>';
        
        html += this.renderCategorySection('propulsion', 'Propulsion & Delta-V', propulsionContent);

        // Section 3: Mass Driver Performance
        const massDriverData = this.calculateMassDriverPerformance();
        let massDriverContent = '';
        massDriverContent += '<div class="probe-summary-breakdown-item" style="margin-bottom: 6px;">';
        massDriverContent += `<span class="probe-summary-breakdown-label" style="font-size: 10px;">Speed Multiplier:</span> `;
        massDriverContent += `<span class="probe-summary-breakdown-count" style="font-size: 10px; color: rgba(100, 200, 100, 0.9);">`;
        massDriverContent += `${(massDriverData.speedBoost).toFixed(2)}x faster`;
        massDriverContent += `</span>`;
        massDriverContent += '</div>';
        massDriverContent += '<div class="probe-summary-breakdown-item" style="margin-bottom: 6px;">';
        massDriverContent += `<span class="probe-summary-breakdown-label" style="font-size: 10px;">Capacity per Driver:</span> `;
        massDriverContent += `<span class="probe-summary-breakdown-count" style="font-size: 10px;">`;
        massDriverContent += `${this.formatNumber(massDriverData.capacityPerDriver)} kg/day`;
        massDriverContent += `</span>`;
        massDriverContent += '</div>';
        massDriverContent += '<div style="margin-left: 12px; margin-top: 4px; margin-bottom: 4px;">';
        massDriverContent += `<div style="font-size: 9px; color: rgba(255, 255, 255, 0.6);">Speed modifiers:</div>`;
        const speedBonus = ((massDriverData.modifiers.energyConverter * massDriverData.modifiers.propulsion * massDriverData.modifiers.thrust) - 1.0) * 100;
        if (speedBonus > 0) {
            massDriverContent += `<div style="font-size: 9px; color: rgba(100, 200, 100, 0.8); margin-left: 8px;">`;
            massDriverContent += `Energy Converter × Propulsion × Thrust: +${speedBonus.toFixed(1)}%`;
            massDriverContent += `</div>`;
        }
        massDriverContent += `<div style="font-size: 9px; color: rgba(255, 255, 255, 0.6); margin-top: 4px;">Capacity modifiers:</div>`;
        const capacityBonus = ((massDriverData.modifiers.transport * Math.sqrt(massDriverData.modifiers.strength) * Math.sqrt(massDriverData.modifiers.locomotion)) - 1.0) * 100;
        if (capacityBonus > 0) {
            massDriverContent += `<div style="font-size: 9px; color: rgba(100, 200, 100, 0.8); margin-left: 8px;">`;
            massDriverContent += `Transport × √Strength × √Locomotion: +${capacityBonus.toFixed(1)}%`;
            massDriverContent += `</div>`;
        }
        massDriverContent += '</div>';
        
        html += this.renderCategorySection('mass_driver', 'Mass Driver Performance', massDriverContent);

        // Section 4: Compute Power
        const computeData = this.calculateComputePower();
        let computeContent = '';
        computeContent += this.renderStatRow('Base FLOPS', computeData.base, computeData.base, 'FLOPS', []);
        computeContent += this.renderStatRow('Effective FLOPS', computeData.base, computeData.effective, 'FLOPS', computeData.modifiers);
        
        html += this.renderCategorySection('compute', 'Compute Power', computeContent);

        // Section 5: Skill Summary by Category
        if (typeof SKILL_DEFINITIONS !== 'undefined' && typeof SKILLS_BY_CATEGORY !== 'undefined') {
            const categories = ['dexterity', 'intelligence', 'energy'];
            categories.forEach(category => {
                const skills = SKILLS_BY_CATEGORY[category] || [];
                if (skills.length === 0) return;
                
                let skillsContent = '';
                skills.forEach(skillName => {
                    const skillValue = this.getSkillValue(skillName);
                    const baseValue = this.getBaseSkillValue(skillName);
                    const bonus = ((skillValue / baseValue) - 1.0) * 100;
                    const displayName = this.getSkillDisplayName(skillName);
                    
                    skillsContent += '<div class="probe-summary-breakdown-item" style="margin-bottom: 4px;">';
                    skillsContent += `<span class="probe-summary-breakdown-label" style="font-size: 9px;">${displayName}:</span> `;
                    skillsContent += `<span class="probe-summary-breakdown-count" style="font-size: 9px;">`;
                    skillsContent += `${this.formatNumber(skillValue, 3)}`;
                    if (bonus > 0) {
                        skillsContent += ` <span style="color: rgba(100, 200, 100, 0.8);">(+${bonus.toFixed(1)}%)</span>`;
                    }
                    skillsContent += `</span>`;
                    skillsContent += '</div>';
                });
                
                const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
                html += this.renderCategorySection(`skills_${category}`, categoryTitle, skillsContent);
            });
        }

        html += '</div>';
        this.container.innerHTML = html;
    }

    update(gameState) {
        this.gameState = gameState;
        
        // Get engine reference
        if (typeof window !== 'undefined' && window.gameEngine) {
            if (window.gameEngine.engine) {
                this.engine = window.gameEngine.engine;
            } else if (window.gameEngine.techTree) {
                this.engine = window.gameEngine.techTree;
            }
        }
        
        // Get orbital mechanics and transfer system references if available
        if (window.gameEngine && window.gameEngine.engine) {
            if (window.gameEngine.engine.orbitalMechanics) {
                this.orbitalMechanics = window.gameEngine.engine.orbitalMechanics;
            }
            if (window.gameEngine.engine.transferSystem) {
                this.transferSystem = window.gameEngine.engine.transferSystem;
            }
        }
        
        this.render();
    }
}

// Expose globally for onclick handlers
if (typeof window !== 'undefined') {
    window.probePanel = null; // Will be set in main.js
}
