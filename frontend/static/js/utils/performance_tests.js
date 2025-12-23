/**
 * Performance Test Suite
 * 
 * Automated performance testing for different probe counts
 * Run tests via: window.performanceTests.runAll()
 */

class PerformanceTests {
    constructor() {
        this.probeThresholds = [100, 1000, 10000, 100000, 1000000];
        this.testDuration = 5000; // 5 seconds per test
        this.results = {};
    }
    
    /**
     * Run all performance tests
     * @returns {Promise<Object>} Test results
     */
    async runAll() {
        console.log('Starting performance test suite...');
        this.results = {};
        
        for (const probeCount of this.probeThresholds) {
            console.log(`Testing with ${this._formatNumber(probeCount)} probes...`);
            const result = await this.runTest(probeCount);
            this.results[probeCount] = result;
            console.log(`Completed: ${probeCount} probes - Tick: ${result.averageTickTime.toFixed(2)}ms, FPS: ${result.averageFPS.toFixed(1)}`);
        }
        
        this.generateReport();
        return this.results;
    }
    
    /**
     * Run a single performance test
     * @param {number} targetProbeCount - Target number of probes
     * @returns {Promise<Object>} Test results
     */
    async runTest(targetProbeCount) {
        // Check if game engine is available
        if (typeof window.gameEngine === 'undefined') {
            throw new Error('Game engine not available. Start a game first.');
        }
        
        const profiler = window.performanceProfiler;
        if (!profiler) {
            throw new Error('Performance profiler not available');
        }
        
        // Clear previous metrics
        profiler.clear();
        
        // Get current game state
        const currentState = window.gameEngine.getGameState();
        if (!currentState) {
            throw new Error('Could not get game state');
        }
        
        // Set probe count to target (distribute across zones)
        const probesByZone = {};
        const zones = Object.keys(currentState.zones || {});
        if (zones.length === 0) {
            throw new Error('No zones available');
        }
        
        // Distribute probes evenly across zones
        const probesPerZone = Math.floor(targetProbeCount / zones.length);
        const remainder = targetProbeCount % zones.length;
        
        for (let i = 0; i < zones.length; i++) {
            const zoneId = zones[i];
            const probeCount = probesPerZone + (i < remainder ? 1 : 0);
            probesByZone[zoneId] = { 'probe': probeCount };
        }
        
        // Update game state with target probe count
        // Note: This is a test-only operation, may need to use engine actions in real scenario
        currentState.probes_by_zone = probesByZone;
        
        // Wait for state to stabilize
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Record initial metrics
        const startTime = performance.now();
        const startMemory = this._getMemoryUsage();
        const startTickTime = profiler.getAverageTickTime();
        
        // Run test for specified duration
        const testStartTime = performance.now();
        let tickCount = 0;
        
        // Monitor performance
        const checkInterval = setInterval(() => {
            tickCount++;
            profiler.recordMemoryUsage(currentState);
        }, 16); // ~60fps
        
        // Wait for test duration
        await new Promise(resolve => setTimeout(resolve, this.testDuration));
        
        clearInterval(checkInterval);
        
        const endTime = performance.now();
        const endMemory = this._getMemoryUsage();
        const actualDuration = endTime - testStartTime;
        
        // Get final metrics
        const summary = profiler.getSummary();
        const probeCorrelation = profiler.getProbePerformanceCorrelation();
        
        // Calculate results
        const result = {
            probeCount: targetProbeCount,
            duration: actualDuration,
            tickCount: tickCount,
            averageTickTime: summary.averageTickTime,
            averageFPS: summary.fps,
            averageProbeIterationTime: summary.averageProbeIterationTime || 0,
            averageStateCloneTime: summary.averageStateCloneTime || 0,
            averageWorkerSerializationTime: summary.averageWorkerSerializationTime || 0,
            averageUIProbeUpdateTime: summary.averageUIProbeUpdateTime || 0,
            averageZoneCalculationTime: summary.averageZoneCalculationTimeDetailed || 0,
            memoryUsage: summary.currentMemoryUsage,
            stateSize: summary.currentStateSize || 0,
            probeDataStructureSize: summary.currentProbeDataStructureSize || 0,
            topOperations: summary.topOperations || [],
            memoryDelta: endMemory - startMemory,
            warnings: summary.warnings.length
        };
        
        return result;
    }
    
    /**
     * Generate performance report
     */
    generateReport() {
        console.log('\n=== Performance Test Report ===\n');
        
        // Header
        console.log('Probe Count | Tick Time | FPS | Probe Iter | State Clone | Memory | Top Operation');
        console.log('------------|-----------|-----|------------|-------------|--------|--------------');
        
        // Results
        for (const probeCount of this.probeThresholds) {
            const result = this.results[probeCount];
            if (!result) continue;
            
            const topOp = result.topOperations.length > 0 
                ? `${result.topOperations[0][0]}: ${result.topOperations[0][1].toFixed(2)}ms`
                : 'N/A';
            
            console.log(
                `${this._padNumber(probeCount, 11)} | ` +
                `${result.averageTickTime.toFixed(2).padStart(9)}ms | ` +
                `${result.averageFPS.toFixed(1).padStart(3)} | ` +
                `${result.averageProbeIterationTime.toFixed(2).padStart(10)}ms | ` +
                `${result.averageStateCloneTime.toFixed(2).padStart(11)}ms | ` +
                `${(result.memoryUsage / 1024 / 1024).toFixed(2).padStart(6)}MB | ` +
                topOp
            );
        }
        
        // Analysis
        console.log('\n=== Performance Analysis ===\n');
        
        // Find bottlenecks
        const bottlenecks = this._identifyBottlenecks();
        if (bottlenecks.length > 0) {
            console.log('Top Bottlenecks:');
            bottlenecks.forEach((bottleneck, index) => {
                console.log(`${index + 1}. ${bottleneck.operation}: ${bottleneck.impact.toFixed(1)}% of tick time at ${this._formatNumber(bottleneck.probeCount)} probes`);
            });
        }
        
        // Scaling analysis
        console.log('\nScaling Analysis:');
        const scaling = this._analyzeScaling();
        for (const [operation, scale] of Object.entries(scaling)) {
            console.log(`${operation}: ${scale > 1 ? 'Worse' : 'Better'} than linear (${scale.toFixed(2)}x)`);
        }
        
        // Recommendations
        console.log('\n=== Recommendations ===\n');
        const recommendations = this._generateRecommendations();
        recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. ${rec}`);
        });
        
        // Export results to file
        this.exportResults();
    }
    
    /**
     * Export test results to JSON file
     */
    exportResults() {
        const exportData = {
            timestamp: new Date().toISOString(),
            testDuration: this.testDuration,
            probeThresholds: this.probeThresholds,
            results: this.results,
            analysis: {
                bottlenecks: this._identifyBottlenecks(),
                scaling: this._analyzeScaling(),
                recommendations: this._generateRecommendations()
            }
        };
        
        const jsonString = JSON.stringify(exportData, null, 2);
        const now = new Date();
        const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `performance-test-results-${dateStr}.json`;
        
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log(`\nTest results exported to ${filename}`);
    }
    
    /**
     * Identify performance bottlenecks
     * @private
     */
    _identifyBottlenecks() {
        const bottlenecks = [];
        
        for (const probeCount of this.probeThresholds) {
            const result = this.results[probeCount];
            if (!result || result.topOperations.length === 0) continue;
            
            const tickTime = result.averageTickTime;
            if (tickTime === 0) continue;
            
            for (const [operation, time] of result.topOperations) {
                const impact = (time / tickTime) * 100;
                if (impact > 10) { // More than 10% of tick time
                    bottlenecks.push({
                        operation,
                        impact,
                        probeCount,
                        time
                    });
                }
            }
        }
        
        // Sort by impact (descending)
        bottlenecks.sort((a, b) => b.impact - a.impact);
        
        // Return top 5
        return bottlenecks.slice(0, 5);
    }
    
    /**
     * Analyze scaling behavior
     * @private
     */
    _analyzeScaling() {
        const scaling = {};
        const baseline = this.results[this.probeThresholds[0]];
        if (!baseline) return scaling;
        
        for (const probeCount of this.probeThresholds.slice(1)) {
            const result = this.results[probeCount];
            if (!result) continue;
            
            const probeRatio = probeCount / this.probeThresholds[0];
            
            // Analyze each operation
            for (const [operation, time] of result.topOperations) {
                if (!scaling[operation]) {
                    scaling[operation] = [];
                }
                
                // Find baseline time for this operation
                const baselineTime = baseline.topOperations.find(op => op[0] === operation)?.[1] || 0;
                if (baselineTime > 0) {
                    const timeRatio = time / baselineTime;
                    const scaleFactor = timeRatio / probeRatio;
                    scaling[operation].push(scaleFactor);
                }
            }
        }
        
        // Average scaling factors
        const averaged = {};
        for (const [operation, factors] of Object.entries(scaling)) {
            if (factors.length > 0) {
                averaged[operation] = factors.reduce((a, b) => a + b, 0) / factors.length;
            }
        }
        
        return averaged;
    }
    
    /**
     * Generate recommendations based on test results
     * @private
     */
    _generateRecommendations() {
        const recommendations = [];
        const bottlenecks = this._identifyBottlenecks();
        
        // Check for state cloning issues
        const highStateClone = Object.values(this.results).find(r => r.averageStateCloneTime > 5);
        if (highStateClone) {
            recommendations.push('State cloning is expensive. Consider using shallow copies or immutable update patterns.');
        }
        
        // Check for probe iteration issues
        const highProbeIteration = Object.values(this.results).find(r => r.averageProbeIterationTime > 10);
        if (highProbeIteration) {
            recommendations.push('Probe iteration is slow. Consider caching probe counts or using more efficient data structures.');
        }
        
        // Check for worker serialization issues
        const highSerialization = Object.values(this.results).find(r => r.averageWorkerSerializationTime > 5);
        if (highSerialization) {
            recommendations.push('Worker serialization is slow. Consider using Transferable objects or reducing state size.');
        }
        
        // Check for memory issues
        const highMemory = Object.values(this.results).find(r => r.memoryUsage > 100 * 1024 * 1024);
        if (highMemory) {
            recommendations.push('Memory usage is high. Consider reducing state size or implementing memory cleanup.');
        }
        
        // Check scaling
        const scaling = this._analyzeScaling();
        for (const [operation, scale] of Object.entries(scaling)) {
            if (scale > 1.5) {
                recommendations.push(`${operation} scales worse than linear. Consider optimization.`);
            }
        }
        
        if (recommendations.length === 0) {
            recommendations.push('No major performance issues detected. Performance scales well.');
        }
        
        return recommendations;
    }
    
    /**
     * Get memory usage (if available)
     * @private
     */
    _getMemoryUsage() {
        if (performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }
    
    /**
     * Format number for display
     * @private
     */
    _formatNumber(num) {
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return num.toString();
    }
    
    /**
     * Pad number for table display
     * @private
     */
    _padNumber(num, width) {
        const str = this._formatNumber(num);
        return str.padStart(width);
    }
}

// Export singleton instance
window.performanceTests = window.performanceTests || new PerformanceTests();

