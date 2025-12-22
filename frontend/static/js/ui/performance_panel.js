/** Performance Panel - Displays real-time performance metrics */
class PerformancePanel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.isVisible = false;
        this.updateInterval = null;
        this.profiler = window.performanceProfiler;
        
        if (!this.container) {
            console.warn('PerformancePanel: Container not found:', containerId);
            return;
        }
        
        this.init();
    }
    
    init() {
        // Create panel HTML structure
        this.render();
        
        // Set up keyboard shortcut (FPS key)
        document.addEventListener('keydown', (e) => {
            // F key to toggle performance panel
            if (e.key.toLowerCase() === 'f' && !this._isInputFocused()) {
                e.preventDefault();
                this.toggle();
            }
        });
        
        // Start update loop
        this.startUpdateLoop();
    }
    
    render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="performance-panel" style="display: ${this.isVisible ? 'block' : 'none'};">
                <div class="performance-panel-header">
                    <h3>Performance Metrics</h3>
                    <button class="performance-panel-close" title="Close (F)">&times;</button>
                </div>
                <div class="performance-panel-content">
                    <div class="performance-section">
                        <div class="performance-metric">
                            <span class="metric-label">FPS:</span>
                            <span class="metric-value" id="perf-fps">0</span>
                        </div>
                        <div class="performance-metric">
                            <span class="metric-label">Tick Time:</span>
                            <span class="metric-value" id="perf-tick-time">0 ms</span>
                        </div>
                    </div>
                    
                    <div class="performance-section">
                        <div class="performance-subsection">
                            <div class="subsection-title">Calculation Times</div>
                            <div class="performance-metric">
                                <span class="metric-label">Zones:</span>
                                <span class="metric-value" id="perf-zone-time">0 ms</span>
                            </div>
                            <div class="performance-metric">
                                <span class="metric-label">Structures:</span>
                                <span class="metric-value" id="perf-structure-time">0 ms</span>
                            </div>
                            <div class="performance-metric">
                                <span class="metric-label">Probes:</span>
                                <span class="metric-value" id="perf-probe-time">0 ms</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="performance-section">
                        <div class="performance-subsection">
                            <div class="subsection-title">Update Times</div>
                            <div class="performance-metric">
                                <span class="metric-label">UI:</span>
                                <span class="metric-value" id="perf-ui-time">0 ms</span>
                            </div>
                            <div class="performance-metric">
                                <span class="metric-label">Visualization:</span>
                                <span class="metric-value" id="perf-viz-time">0 ms</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="performance-section">
                        <div class="performance-subsection">
                            <div class="subsection-title">Game State</div>
                            <div class="performance-metric">
                                <span class="metric-label">Probes:</span>
                                <span class="metric-value" id="perf-probe-count">0</span>
                            </div>
                            <div class="performance-metric">
                                <span class="metric-label">Structures:</span>
                                <span class="metric-value" id="perf-structure-count">0</span>
                            </div>
                            <div class="performance-metric">
                                <span class="metric-label">Memory:</span>
                                <span class="metric-value" id="perf-memory">0 MB</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="performance-section" id="perf-warnings-section" style="display: none;">
                        <div class="performance-subsection">
                            <div class="subsection-title">Warnings</div>
                            <div id="perf-warnings"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Set up close button
        const closeBtn = this.container.querySelector('.performance-panel-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }
    }
    
    toggle() {
        this.isVisible = !this.isVisible;
        this.render();
    }
    
    show() {
        this.isVisible = true;
        this.render();
    }
    
    hide() {
        this.isVisible = false;
        this.render();
    }
    
    startUpdateLoop() {
        // Update every 500ms (2 updates per second)
        this.updateInterval = setInterval(() => {
            if (this.isVisible) {
                this.update();
            }
        }, 500);
    }
    
    stopUpdateLoop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    update() {
        if (!this.isVisible || !this.profiler) return;
        
        const summary = this.profiler.getSummary();
        
        // Update FPS
        const fpsEl = document.getElementById('perf-fps');
        if (fpsEl) {
            fpsEl.textContent = summary.fps.toFixed(1);
            fpsEl.className = 'metric-value ' + this._getFPSClass(summary.fps);
        }
        
        // Update tick time
        const tickTimeEl = document.getElementById('perf-tick-time');
        if (tickTimeEl) {
            tickTimeEl.textContent = summary.averageTickTime.toFixed(2) + ' ms';
            tickTimeEl.className = 'metric-value ' + this._getTimeClass(summary.averageTickTime);
        }
        
        // Update calculation times
        this._updateMetric('perf-zone-time', summary.averageZoneTime);
        this._updateMetric('perf-structure-time', summary.averageStructureTime);
        this._updateMetric('perf-probe-time', summary.averageProbeTime);
        this._updateMetric('perf-ui-time', summary.averageUITime);
        this._updateMetric('perf-viz-time', summary.averageVisualizationTime);
        
        // Update game state
        const probeCountEl = document.getElementById('perf-probe-count');
        if (probeCountEl) {
            probeCountEl.textContent = this._formatNumber(summary.currentProbeCount);
        }
        
        const structureCountEl = document.getElementById('perf-structure-count');
        if (structureCountEl) {
            structureCountEl.textContent = this._formatNumber(summary.currentStructureCount);
        }
        
        const memoryEl = document.getElementById('perf-memory');
        if (memoryEl) {
            const memoryMB = summary.currentMemoryUsage / (1024 * 1024);
            memoryEl.textContent = memoryMB.toFixed(2) + ' MB';
        }
        
        // Update warnings
        this._updateWarnings(summary.warnings);
    }
    
    _updateMetric(elementId, value) {
        const el = document.getElementById(elementId);
        if (el) {
            el.textContent = value.toFixed(2) + ' ms';
        }
    }
    
    _updateWarnings(warnings) {
        const warningsSection = document.getElementById('perf-warnings-section');
        const warningsContainer = document.getElementById('perf-warnings');
        
        if (!warningsSection || !warningsContainer) return;
        
        if (warnings.length === 0) {
            warningsSection.style.display = 'none';
            return;
        }
        
        warningsSection.style.display = 'block';
        warningsContainer.innerHTML = warnings.map(warning => {
            const levelClass = warning.level === 'critical' ? 'warning-critical' : 'warning-normal';
            return `<div class="performance-warning ${levelClass}">${warning.message}</div>`;
        }).join('');
    }
    
    _getFPSClass(fps) {
        if (fps >= 55) return 'metric-good';
        if (fps >= 30) return 'metric-warning';
        return 'metric-critical';
    }
    
    _getTimeClass(timeMs) {
        if (timeMs <= 16.67) return 'metric-good';
        if (timeMs <= 33.33) return 'metric-warning';
        return 'metric-critical';
    }
    
    _formatNumber(num) {
        if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num.toFixed(0);
    }
    
    _isInputFocused() {
        const activeElement = document.activeElement;
        return activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
    }
}

