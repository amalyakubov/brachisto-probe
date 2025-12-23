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
            structureCounts: [],
            // New probe-specific metrics
            probeIterationTimes: [],
            stateCloneTimes: [],
            zoneCalculationTimesDetailed: [], // Per-zone calculation times
            uiProbeUpdateTimes: [],
            workerSerializationTimes: [],
            // Memory tracking
            stateSizeEstimates: [],
            probeDataStructureSizes: []
        };
        
        this.maxSamples = 60; // Keep last 60 samples (1 second at 60fps)
        this.isEnabled = true;
        this.warnings = [];
        
        // Performance thresholds
        this.thresholds = {
            tickTime: 16.67, // ms (60fps = 16.67ms per frame)
            warningTickTime: 20, // ms (warning if > 20ms)
            criticalTickTime: 33.33, // ms (critical if > 33ms = 30fps)
            stateCloneTime: 5, // ms (warning if state clone > 5ms)
            probeIterationTime: 10, // ms (warning if probe iteration > 10ms)
            workerSerializationTime: 5 // ms (warning if serialization > 5ms)
        };
        
        // Probe count thresholds for correlation tracking
        this.probeThresholds = [100, 1000, 10000, 100000, 1000000];
        this.probePerformanceData = {}; // Track performance at different probe counts
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
     * Record probe iteration time
     * @param {number} time - Duration in milliseconds
     */
    recordProbeIterationTime(time) {
        this._addSample('probeIterationTimes', time);
        this._checkThresholds('probeIterationTime', time);
    }
    
    /**
     * Record state clone time
     * @param {number} time - Duration in milliseconds
     */
    recordStateCloneTime(time) {
        this._addSample('stateCloneTimes', time);
        this._checkThresholds('stateCloneTime', time);
    }
    
    /**
     * Record zone calculation time (detailed per-zone)
     * @param {number} time - Duration in milliseconds
     */
    recordZoneCalculationTimeDetailed(time) {
        this._addSample('zoneCalculationTimesDetailed', time);
    }
    
    /**
     * Record UI probe update time
     * @param {number} time - Duration in milliseconds
     */
    recordUIProbeUpdateTime(time) {
        this._addSample('uiProbeUpdateTimes', time);
    }
    
    /**
     * Record worker serialization time
     * @param {number} time - Duration in milliseconds
     */
    recordWorkerSerializationTime(time) {
        this._addSample('workerSerializationTimes', time);
        this._checkThresholds('workerSerializationTime', time);
    }
    
    /**
     * Record state size estimate
     * @param {number} size - Size in bytes
     */
    recordStateSize(size) {
        this._addSample('stateSizeEstimates', size);
    }
    
    /**
     * Record probe data structure size
     * @param {number} size - Size in bytes
     */
    recordProbeDataStructureSize(size) {
        this._addSample('probeDataStructureSizes', size);
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
        if (gameState.probes_by_zone) {
            for (const zoneProbes of Object.values(gameState.probes_by_zone)) {
                totalProbes += Object.values(zoneProbes).reduce((sum, count) => sum + (count || 0), 0);
            }
        } else if (gameState.probes) {
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
        
        // Estimate state size
        const stateSize = this._estimateStateSize(gameState);
        this._addSample('stateSizeEstimates', stateSize);
        
        // Estimate probe data structure size
        const probeDataSize = this._estimateProbeDataStructureSize(gameState);
        this._addSample('probeDataStructureSizes', probeDataSize);
        
        this._addSample('memoryUsage', memoryEstimate);
        this._addSample('probeCounts', totalProbes);
        this._addSample('structureCounts', totalStructures);
        
        // Track performance at probe count thresholds
        this._trackProbePerformance(totalProbes);
    }
    
    /**
     * Track performance at different probe count thresholds
     * @private
     */
    _trackProbePerformance(probeCount) {
        // Find which threshold we're at
        let currentThreshold = null;
        for (const threshold of this.probeThresholds) {
            if (probeCount >= threshold) {
                currentThreshold = threshold;
            } else {
                break;
            }
        }
        
        if (currentThreshold) {
            if (!this.probePerformanceData[currentThreshold]) {
                this.probePerformanceData[currentThreshold] = {
                    tickTimes: [],
                    probeIterationTimes: [],
                    stateCloneTimes: [],
                    sampleCount: 0
                };
            }
            
            const data = this.probePerformanceData[currentThreshold];
            const latestTickTime = this._getLatest('tickTimes');
            const latestProbeIteration = this._getLatest('probeIterationTimes');
            const latestStateClone = this._getLatest('stateCloneTimes');
            
            if (latestTickTime > 0) {
                data.tickTimes.push(latestTickTime);
                if (data.tickTimes.length > 100) data.tickTimes.shift();
            }
            if (latestProbeIteration > 0) {
                data.probeIterationTimes.push(latestProbeIteration);
                if (data.probeIterationTimes.length > 100) data.probeIterationTimes.shift();
            }
            if (latestStateClone > 0) {
                data.stateCloneTimes.push(latestStateClone);
                if (data.stateCloneTimes.length > 100) data.stateCloneTimes.shift();
            }
            
            data.sampleCount++;
        }
    }
    
    /**
     * Get probe performance correlation data
     * @returns {Object} Performance data by probe count threshold
     */
    getProbePerformanceCorrelation() {
        const correlation = {};
        
        for (const threshold of this.probeThresholds) {
            const data = this.probePerformanceData[threshold];
            if (data && data.sampleCount > 0) {
                const avgTickTime = data.tickTimes.length > 0 
                    ? data.tickTimes.reduce((a, b) => a + b, 0) / data.tickTimes.length 
                    : 0;
                const avgProbeIteration = data.probeIterationTimes.length > 0
                    ? data.probeIterationTimes.reduce((a, b) => a + b, 0) / data.probeIterationTimes.length
                    : 0;
                const avgStateClone = data.stateCloneTimes.length > 0
                    ? data.stateCloneTimes.reduce((a, b) => a + b, 0) / data.stateCloneTimes.length
                    : 0;
                
                correlation[threshold] = {
                    probeCount: threshold,
                    averageTickTime: avgTickTime,
                    averageProbeIterationTime: avgProbeIteration,
                    averageStateCloneTime: avgStateClone,
                    sampleCount: data.sampleCount
                };
            }
        }
        
        return correlation;
    }
    
    /**
     * Export all performance metrics to JSON
     * @returns {Object} Complete performance data
     */
    exportMetrics() {
        const summary = this.getSummary();
        const correlation = this.getProbePerformanceCorrelation();
        
        return {
            timestamp: new Date().toISOString(),
            summary: summary,
            probeCorrelation: correlation,
            rawMetrics: {
                tickTimes: [...this.metrics.tickTimes],
                probeIterationTimes: [...this.metrics.probeIterationTimes],
                stateCloneTimes: [...this.metrics.stateCloneTimes],
                zoneCalculationTimes: [...this.metrics.zoneCalculationTimes],
                zoneCalculationTimesDetailed: [...this.metrics.zoneCalculationTimesDetailed],
                structureCalculationTimes: [...this.metrics.structureCalculationTimes],
                probeCalculationTimes: [...this.metrics.probeCalculationTimes],
                uiUpdateTimes: [...this.metrics.uiUpdateTimes],
                uiProbeUpdateTimes: [...this.metrics.uiProbeUpdateTimes],
                visualizationRenderTimes: [...this.metrics.visualizationRenderTimes],
                workerSerializationTimes: [...this.metrics.workerSerializationTimes],
                memoryUsage: [...this.metrics.memoryUsage],
                probeCounts: [...this.metrics.probeCounts],
                structureCounts: [...this.metrics.structureCounts],
                stateSizeEstimates: [...this.metrics.stateSizeEstimates],
                probeDataStructureSizes: [...this.metrics.probeDataStructureSizes]
            },
            warnings: [...this.warnings],
            probePerformanceData: JSON.parse(JSON.stringify(this.probePerformanceData)) // Deep clone
        };
    }
    
    /**
     * Download performance metrics as JSON file
     * @param {string} filename - Optional filename (default: performance-metrics-YYYY-MM-DD-HH-MM-SS.json)
     */
    downloadMetrics(filename = null) {
        const metrics = this.exportMetrics();
        const jsonString = JSON.stringify(metrics, null, 2);
        
        if (!filename) {
            const now = new Date();
            const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
            filename = `performance-metrics-${dateStr}.json`;
        }
        
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log(`Performance metrics exported to ${filename}`);
    }
    
    /**
     * Save metrics to localStorage (for persistence across sessions)
     * @param {string} key - Storage key (default: 'performance_metrics')
     */
    saveToLocalStorage(key = 'performance_metrics') {
        try {
            const metrics = this.exportMetrics();
            localStorage.setItem(key, JSON.stringify(metrics));
            console.log('Performance metrics saved to localStorage');
            return true;
        } catch (e) {
            console.error('Failed to save metrics to localStorage:', e);
            return false;
        }
    }
    
    /**
     * Load metrics from localStorage
     * @param {string} key - Storage key (default: 'performance_metrics')
     * @returns {Object|null} Loaded metrics or null if not found
     */
    loadFromLocalStorage(key = 'performance_metrics') {
        try {
            const data = localStorage.getItem(key);
            if (!data) return null;
            return JSON.parse(data);
        } catch (e) {
            console.error('Failed to load metrics from localStorage:', e);
            return null;
        }
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
        const avgProbeIteration = this._getAverage('probeIterationTimes');
        const avgStateClone = this._getAverage('stateCloneTimes');
        const avgWorkerSerialization = this._getAverage('workerSerializationTimes');
        const avgUIProbeUpdate = this._getAverage('uiProbeUpdateTimes');
        const avgZoneDetailed = this._getAverage('zoneCalculationTimesDetailed');
        
        // Calculate most expensive operations
        const operationTimes = {
            'Probe Iteration': avgProbeIteration,
            'State Cloning': avgStateClone,
            'Worker Serialization': avgWorkerSerialization,
            'UI Probe Updates': avgUIProbeUpdate,
            'Zone Calculations': avgZoneDetailed,
            'Structure Calculations': this._getAverage('structureCalculationTimes'),
            'UI Updates': this._getAverage('uiUpdateTimes'),
            'Visualization': this._getAverage('visualizationRenderTimes')
        };
        
        // Sort by time (descending)
        const sortedOperations = Object.entries(operationTimes)
            .filter(([_, time]) => time > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5); // Top 5
        
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
            // New probe-specific metrics
            averageProbeIterationTime: avgProbeIteration,
            averageStateCloneTime: avgStateClone,
            averageWorkerSerializationTime: avgWorkerSerialization,
            averageUIProbeUpdateTime: avgUIProbeUpdate,
            averageZoneCalculationTimeDetailed: avgZoneDetailed,
            // Memory metrics
            currentStateSize: this._getLatest('stateSizeEstimates'),
            currentProbeDataStructureSize: this._getLatest('probeDataStructureSizes'),
            // Analysis
            topOperations: sortedOperations,
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
        
        if (thresholdName === 'tickTime') {
            if (value > this.thresholds.criticalTickTime) {
                this._addWarning('critical', `Tick time critical: ${value.toFixed(2)}ms (>${this.thresholds.criticalTickTime}ms)`);
            } else if (value > this.thresholds.warningTickTime) {
                this._addWarning('warning', `Tick time high: ${value.toFixed(2)}ms (>${this.thresholds.warningTickTime}ms)`);
            }
        } else if (thresholdName === 'stateCloneTime' && value > threshold) {
            this._addWarning('warning', `State clone time high: ${value.toFixed(2)}ms (>${threshold}ms)`);
        } else if (thresholdName === 'probeIterationTime' && value > threshold) {
            this._addWarning('warning', `Probe iteration time high: ${value.toFixed(2)}ms (>${threshold}ms)`);
        } else if (thresholdName === 'workerSerializationTime' && value > threshold) {
            this._addWarning('warning', `Worker serialization time high: ${value.toFixed(2)}ms (>${threshold}ms)`);
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
    
    /**
     * Estimate state size in bytes
     * @private
     */
    _estimateStateSize(gameState) {
        try {
            const jsonString = JSON.stringify(gameState);
            return jsonString.length * 2; // UTF-16 encoding
        } catch (e) {
            return 0;
        }
    }
    
    /**
     * Estimate probe data structure size
     * @private
     */
    _estimateProbeDataStructureSize(gameState) {
        let size = 0;
        
        if (gameState.probes_by_zone) {
            // Estimate size of probes_by_zone structure
            // Each zone: ~20 bytes (zone ID string)
            // Each probe type: ~10 bytes (probe type string) + 8 bytes (count number)
            for (const [zoneId, zoneProbes] of Object.entries(gameState.probes_by_zone)) {
                size += zoneId.length * 2; // UTF-16
                if (zoneProbes && typeof zoneProbes === 'object') {
                    for (const [probeType, count] of Object.entries(zoneProbes)) {
                        size += probeType.length * 2; // UTF-16
                        size += 8; // Number
                    }
                }
            }
        }
        
        // Also estimate probe_allocations_by_zone
        if (gameState.probe_allocations_by_zone) {
            for (const [zoneId, allocations] of Object.entries(gameState.probe_allocations_by_zone)) {
                size += zoneId.length * 2;
                if (allocations && typeof allocations === 'object') {
                    size += Object.keys(allocations).length * 20; // Rough estimate per allocation key
                }
            }
        }
        
        return size;
    }
}

// Export singleton instance
window.performanceProfiler = window.performanceProfiler || new PerformanceProfiler();

