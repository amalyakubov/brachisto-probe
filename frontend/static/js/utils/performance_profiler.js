/** Performance Profiler - Tracks game performance metrics */
class PerformanceProfiler {
    constructor() {
        this.metrics = {
            tickTimes: [],
            zoneCalculationTimes: [],
            structureCalculationTimes: [],
            probeCalculationTimes: [],
            uiUpdateTimes: [],
            visualizationRenderTimes: [],
            memoryUsage: [],
            probeCounts: [],
            structureCounts: []
        };
        
        this.maxSamples = 60; // Keep last 60 samples (1 second at 60fps)
        this.isEnabled = true;
        this.warnings = [];
        
        // Performance thresholds
        this.thresholds = {
            tickTime: 16.67, // ms (60fps = 16.67ms per frame)
            warningTickTime: 20, // ms (warning if > 20ms)
            criticalTickTime: 33.33 // ms (critical if > 33ms = 30fps)
        };
    }
    
    /**
     * Start timing a specific operation
     * @param {string} operation - Name of the operation
     * @returns {number} - Start timestamp
     */
    startTiming(operation) {
        if (!this.isEnabled) return null;
        return performance.now();
    }
    
    /**
     * End timing and record the duration
     * @param {string} operation - Name of the operation
     * @param {number} startTime - Start timestamp from startTiming()
     */
    endTiming(operation, startTime) {
        if (!this.isEnabled || startTime === null) return;
        
        const duration = performance.now() - startTime;
        this._recordMetric(operation, duration);
    }
    
    /**
     * Record a complete tick time
     * @param {number} tickTime - Duration in milliseconds
     */
    recordTickTime(tickTime) {
        this._addSample('tickTimes', tickTime);
        this._checkThresholds('tickTime', tickTime);
    }
    
    /**
     * Record zone calculation time
     * @param {number} time - Duration in milliseconds
     */
    recordZoneCalculationTime(time) {
        this._addSample('zoneCalculationTimes', time);
    }
    
    /**
     * Record structure calculation time
     * @param {number} time - Duration in milliseconds
     */
    recordStructureCalculationTime(time) {
        this._addSample('structureCalculationTimes', time);
    }
    
    /**
     * Record probe calculation time
     * @param {number} time - Duration in milliseconds
     */
    recordProbeCalculationTime(time) {
        this._addSample('probeCalculationTimes', time);
    }
    
    /**
     * Record UI update time
     * @param {number} time - Duration in milliseconds
     */
    recordUIUpdateTime(time) {
        this._addSample('uiUpdateTimes', time);
    }
    
    /**
     * Record visualization render time
     * @param {number} time - Duration in milliseconds
     */
    recordVisualizationRenderTime(time) {
        this._addSample('visualizationRenderTimes', time);
    }
    
    /**
     * Record memory usage snapshot
     * @param {Object} gameState - Current game state
     */
    recordMemoryUsage(gameState) {
        if (!this.isEnabled) return;
        
        // Calculate total probe count
        let totalProbes = 0;
        if (gameState.probes) {
            totalProbes = Object.values(gameState.probes).reduce((sum, count) => sum + count, 0);
        }
        
        // Calculate total structure count
        let totalStructures = 0;
        if (gameState.structures_by_zone) {
            for (const zoneStructures of Object.values(gameState.structures_by_zone)) {
                totalStructures += Object.values(zoneStructures).reduce((sum, count) => sum + count, 0);
            }
        }
        
        // Estimate memory usage (rough approximation)
        const memoryEstimate = this._estimateMemoryUsage(gameState);
        
        this._addSample('memoryUsage', memoryEstimate);
        this._addSample('probeCounts', totalProbes);
        this._addSample('structureCounts', totalStructures);
    }
    
    /**
     * Get average tick time
     * @returns {number} - Average tick time in milliseconds
     */
    getAverageTickTime() {
        return this._getAverage('tickTimes');
    }
    
    /**
     * Get current FPS
     * @returns {number} - Frames per second
     */
    getFPS() {
        const avgTickTime = this.getAverageTickTime();
        return avgTickTime > 0 ? 1000 / avgTickTime : 0;
    }
    
    /**
     * Get performance summary
     * @returns {Object} - Performance metrics summary
     */
    getSummary() {
        return {
            fps: this.getFPS(),
            averageTickTime: this.getAverageTickTime(),
            averageZoneTime: this._getAverage('zoneCalculationTimes'),
            averageStructureTime: this._getAverage('structureCalculationTimes'),
            averageProbeTime: this._getAverage('probeCalculationTimes'),
            averageUITime: this._getAverage('uiUpdateTimes'),
            averageVisualizationTime: this._getAverage('visualizationRenderTimes'),
            currentMemoryUsage: this._getLatest('memoryUsage'),
            currentProbeCount: this._getLatest('probeCounts'),
            currentStructureCount: this._getLatest('structureCounts'),
            warnings: [...this.warnings]
        };
    }
    
    /**
     * Clear all metrics
     */
    clear() {
        for (const key in this.metrics) {
            this.metrics[key] = [];
        }
        this.warnings = [];
    }
    
    /**
     * Enable/disable profiling
     * @param {boolean} enabled - Whether profiling is enabled
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }
    
    /**
     * Add a sample to a metric array
     * @private
     */
    _addSample(metricName, value) {
        if (!this.isEnabled) return;
        
        const array = this.metrics[metricName];
        if (!array) return;
        
        array.push(value);
        if (array.length > this.maxSamples) {
            array.shift(); // Remove oldest sample
        }
    }
    
    /**
     * Record a metric with operation name
     * @private
     */
    _recordMetric(operation, duration) {
        // Map operation names to metric arrays
        const metricMap = {
            'zone_calculation': 'zoneCalculationTimes',
            'structure_calculation': 'structureCalculationTimes',
            'probe_calculation': 'probeCalculationTimes',
            'ui_update': 'uiUpdateTimes',
            'visualization_render': 'visualizationRenderTimes'
        };
        
        const metricName = metricMap[operation];
        if (metricName) {
            this._addSample(metricName, duration);
        }
    }
    
    /**
     * Get average value from a metric array
     * @private
     */
    _getAverage(metricName) {
        const array = this.metrics[metricName];
        if (!array || array.length === 0) return 0;
        
        const sum = array.reduce((a, b) => a + b, 0);
        return sum / array.length;
    }
    
    /**
     * Get latest value from a metric array
     * @private
     */
    _getLatest(metricName) {
        const array = this.metrics[metricName];
        if (!array || array.length === 0) return 0;
        return array[array.length - 1];
    }
    
    /**
     * Check if metrics exceed thresholds
     * @private
     */
    _checkThresholds(thresholdName, value) {
        const threshold = this.thresholds[thresholdName];
        if (!threshold) return;
        
        if (value > this.thresholds.criticalTickTime) {
            this._addWarning('critical', `Tick time critical: ${value.toFixed(2)}ms (>${this.thresholds.criticalTickTime}ms)`);
        } else if (value > this.thresholds.warningTickTime) {
            this._addWarning('warning', `Tick time high: ${value.toFixed(2)}ms (>${this.thresholds.warningTickTime}ms)`);
        }
    }
    
    /**
     * Add a performance warning
     * @private
     */
    _addWarning(level, message) {
        const warning = {
            level,
            message,
            timestamp: Date.now()
        };
        
        this.warnings.push(warning);
        
        // Keep only last 10 warnings
        if (this.warnings.length > 10) {
            this.warnings.shift();
        }
        
        // Log to console
        if (level === 'critical') {
            console.error(`[Performance] ${message}`);
        } else {
            console.warn(`[Performance] ${message}`);
        }
    }
    
    /**
     * Estimate memory usage based on game state
     * @private
     */
    _estimateMemoryUsage(gameState) {
        // Rough estimation: count objects and arrays
        let size = 0;
        
        // Estimate based on probe count (each probe ~8 bytes in Number)
        const totalProbes = this._getLatest('probeCounts') || 0;
        size += totalProbes * 8;
        
        // Estimate based on structure count
        const totalStructures = this._getLatest('structureCounts') || 0;
        size += totalStructures * 8;
        
        // Estimate JSON size (rough approximation)
        try {
            const jsonString = JSON.stringify(gameState);
            size += jsonString.length * 2; // UTF-16 encoding
        } catch (e) {
            // If stringify fails, use fallback
            size += 100000; // Default estimate
        }
        
        return size;
    }
}

// Export singleton instance
window.performanceProfiler = window.performanceProfiler || new PerformanceProfiler();

