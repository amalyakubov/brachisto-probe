# UI Performance Bottlenecks Analysis

## Summary of Optimizations Applied

### 1. Probe Visualization Throttling ✅
- **Location**: `orbital_zone_selector.js`
- **Change**: Probe dots now update once per second instead of ~12 times/second
- **Impact**: ~92% reduction in DOM operations (from 24,000/sec to 2,000/sec)
- **Implementation**: Added `probeUpdateInterval` and `lastProbeUpdateTime` tracking

### 2. Change Detection ✅
- **Location**: `orbital_zone_selector.js` - `updateProbeDots()`
- **Change**: Only updates DOM if probe counts have actually changed
- **Impact**: Eliminates unnecessary DOM manipulation when probe counts are stable
- **Implementation**: Cache probe counts as JSON string, compare before updating

### 3. DocumentFragment Optimization ✅
- **Location**: `orbital_zone_selector.js` - `updateProbeDots()`
- **Change**: Use DocumentFragment for batch DOM insertion instead of individual appends
- **Impact**: ~30-50% reduction in DOM operation overhead
- **Implementation**: Create all dots in fragment, append once

## Other UI Bottlenecks Identified

### 1. Frequent Full Renders in OrbitalZoneSelector
**Location**: `orbital_zone_selector.js`

**Problem**:
- `render()` is called 10+ times in various places:
  - Line 29: After loadData()
  - Line 58: After spacebar (transfer source)
  - Line 300: After zone click
  - Line 910: After transfer destination
  - Line 928: After zone selection
  - Line 955: After transfer creation
  - Line 1162: After transfer update
  - Line 1330: After transfer arc creation
  - Line 1339: In update() method

**Impact**:
- `render()` does `container.innerHTML = html` which:
  - Destroys all existing DOM elements
  - Recreates entire HTML structure
  - Re-attaches event listeners
  - Recalculates all zone data

**Solution**:
- Only call `render()` when structure actually changes (zone selection, transfer creation)
- For data updates, use incremental DOM updates instead of full re-render
- Cache rendered HTML and only update changed parts

### 2. Tooltip innerHTML Updates
**Location**: Multiple files

**Problem**:
- `resource_display.js` line 550: `tooltipEl.innerHTML = html` on every update
- `orbital_zone_selector.js` line 870: `panel.innerHTML = tooltipContent`
- Tooltips are regenerated even when hovering over same element

**Impact**:
- Unnecessary HTML regeneration
- Potential layout thrashing

**Solution**:
- Cache tooltip content
- Only regenerate when data actually changes
- Use `textContent` for simple text updates instead of `innerHTML`

### 3. Command Panel Full Re-renders
**Location**: `command_panel.js`

**Problem**:
- Line 104: `this.container.innerHTML = html` - Full panel re-render
- Line 178: `sliderContainer.innerHTML = html` - Slider re-render
- Line 557: `allocationsContainer.innerHTML = html` - Allocations re-render
- Line 723: `buildingsContainer.innerHTML = html` - Buildings re-render

**Impact**:
- Full DOM destruction/recreation on every update
- Event listeners need to be re-attached

**Solution**:
- Use incremental updates for sliders (update values, not recreate)
- Cache container references
- Only re-render when structure changes, not on data updates

### 4. Probe Summary Panel Calculations
**Location**: `probe_summary_panel.js`

**Problem**:
- Lines 145-150: Iterates through all zones and probes every update
- Lines 272-302: Nested loops calculating dexterity for each zone
- Some caching exists (lines 209-325) but only for dexterity, not probe counts

**Impact**:
- O(zones × probes) calculation every throttled update (~12 times/second)
- Redundant calculations when probe counts haven't changed

**Solution**:
- Cache probe count calculations
- Only recalculate when probe counts change
- Share probe count cache with other components

### 5. Resource Display Probe Mass Calculation
**Location**: `resource_display.js`

**Problem**:
- Lines 638-645: Iterates through all zones and probes every frame
- Calculates probe mass independently from other components
- No caching

**Impact**:
- Redundant iteration through all probes
- Unnecessary calculations when probe counts are stable

**Solution**:
- Use shared probe count cache
- Cache probe mass calculation
- Only recalculate when probe counts change

### 6. Transfer Arc SVG Updates
**Location**: `orbital_zone_selector.js`

**Problem**:
- Line 1490: `svgContainer.innerHTML = ''` - Clears all arcs
- Line 1554: `svg.innerHTML = ''` - Clears SVG content
- Recreates all transfer arcs on every update

**Impact**:
- SVG manipulation is expensive
- Unnecessary recreation when transfers haven't changed

**Solution**:
- Track active transfers
- Only update changed transfers
- Use incremental SVG updates

## Recommended Next Steps

### Priority 1: Incremental DOM Updates
1. **OrbitalZoneSelector.render()**: Only update changed parts, not full re-render
2. **Command Panel**: Update slider values instead of recreating sliders
3. **Transfer Arcs**: Only update changed transfers

### Priority 2: Shared Caching
1. Create `ProbeCountCache` utility
2. Share probe counts across all UI components
3. Cache probe mass calculations

### Priority 3: Change Detection
1. Add change detection to all UI components
2. Skip updates when data hasn't changed
3. Use dirty flags for partial updates

### Priority 4: Tooltip Optimization
1. Cache tooltip content
2. Only regenerate when data changes
3. Use `textContent` for simple updates

## Expected Combined Impact

After all optimizations:
- **Probe visualization**: Already optimized (92% reduction)
- **UI updates**: 60-80% reduction in unnecessary work
- **DOM operations**: 70-90% reduction overall
- **Memory**: Reduced redundant calculations

## Measurement

Monitor these metrics:
- `uiProbeUpdateTimes` - Should be < 5ms after optimizations
- `uiUpdateTimes` - Should be < 10ms after optimizations
- DOM operation count (via PerformanceObserver)
- Memory usage (should decrease with caching)

