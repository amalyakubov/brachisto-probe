/**
 * Web Worker for game engine calculations
 * Runs game tick loop in background thread to prevent UI blocking
 */

// Import necessary dependencies using importScripts
// These files need to be worker-compatible (no window/DOM dependencies)
importScripts(
    '/static/js/game/config.js',
    '/static/js/game/data_loader.js',
    '/static/js/game/engine.js'
);

let engine = null;
let isRunning = false;
let tickInterval = null;
let tickRate = 60; // ticks per day - fixed rate
let timeSpeed = 1; // Speed multiplier
let uiUpdateCounter = 0;
let sessionId = null;
let isInitialized = false; // Track initialization state

// Message handler
self.onmessage = function(e) {
    const { type, data } = e.data;
    
    switch (type) {
        case 'init':
            // Initialize worker with game data and classes
            handleInit(data);
            break;
            
        case 'start':
            // Start the game engine
            handleStart(data);
            break;
            
        case 'stop':
            // Stop the game engine
            handleStop();
            break;
            
        case 'action':
            // Perform a game action
            handleAction(data);
            break;
            
        case 'getState':
            // Get current game state
            handleGetState();
            break;
            
        case 'setTimeSpeed':
            // Set time speed multiplier
            timeSpeed = Math.max(0.1, Math.min(1000, data.speed || 1));
            break;
            
        default:
            console.warn('Unknown message type:', type);
    }
};

function handleInit(data) {
    // Only initialize once
    if (isInitialized) {
        return;
    }
    
    try {
        // Initialize game data loader if needed
        // The data loader should be available from importScripts
        // Check if classes are available
        const hasGameEngine = typeof GameEngine !== 'undefined' || 
                             (typeof self !== 'undefined' && self.GameEngine);
        const hasConfig = typeof Config !== 'undefined' || 
                         (typeof self !== 'undefined' && self.Config);
        
        if (!hasGameEngine || !hasConfig) {
            throw new Error('Required classes not loaded. GameEngine: ' + hasGameEngine + ', Config: ' + hasConfig);
        }
        
        isInitialized = true;
        self.postMessage({
            type: 'initComplete',
            success: true
        });
    } catch (error) {
        console.error('Worker init error:', error);
        self.postMessage({
            type: 'error',
            error: error.message,
            stack: error.stack
        });
    }
}

async function handleStart(data) {
    try {
        sessionId = data.sessionId || 'local';
        const config = data.config || {};
        
        // Create game engine instance
        // GameEngine should be available from importScripts
        // Check both global scope and self scope
        const GameEngineClass = typeof GameEngine !== 'undefined' ? GameEngine : 
                               (typeof self !== 'undefined' && self.GameEngine ? self.GameEngine : null);
        
        if (!GameEngineClass) {
            const errorMsg = 'GameEngine class not available in worker. importScripts may have failed.';
            console.error('Worker start error:', errorMsg);
            self.postMessage({
                type: 'error',
                error: errorMsg
            });
            return;
        }
        
        if (data.engineState) {
            // Load from existing state
            engine = await GameEngineClass.loadFromState(sessionId, config, data.engineState);
        } else {
            // Create new engine
            engine = new GameEngineClass(sessionId, config);
            await engine.initialize();
        }
        
        isRunning = true;
        uiUpdateCounter = 0;
        
        // Start tick loop
        const tickIntervalMs = 1000 / tickRate; // ~16.67ms for 60 ticks/sec
        tickInterval = setInterval(() => tick(), tickIntervalMs);
        
        // Send initial state immediately after starting
        const initialState = engine.getState();
        console.log('Worker: Game engine started successfully');
        self.postMessage({
            type: 'startComplete',
            success: true,
            gameState: initialState
        });
    } catch (error) {
        console.error('Worker start error:', error);
        console.error('Error stack:', error.stack);
        self.postMessage({
            type: 'error',
            error: error.message,
            stack: error.stack
        });
    }
}

function handleStop() {
    isRunning = false;
    if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
    }
    
    // Send final state before stopping
    if (engine) {
        const gameState = engine.getState();
        self.postMessage({
            type: 'stateUpdate',
            gameState: gameState
        });
    }
    
    self.postMessage({
        type: 'stopComplete'
    });
}

function handleAction(data) {
    if (!engine) {
        self.postMessage({
            type: 'actionError',
            actionId: data.actionId,
            error: 'Engine not initialized'
        });
        return;
    }
    
    try {
        const { actionId, actionType, actionData } = data;
        const result = engine.performAction(actionType, actionData);
        const gameState = engine.getState();
        
        self.postMessage({
            type: 'actionComplete',
            actionId: actionId,
            success: true,
            result: result,
            gameState: gameState
        });
    } catch (error) {
        self.postMessage({
            type: 'actionError',
            actionId: data.actionId,
            error: error.message,
            stack: error.stack
        });
    }
}

function handleGetState() {
    if (!engine) {
        self.postMessage({
            type: 'stateUpdate',
            gameState: null
        });
        return;
    }
    
    const gameState = engine.getState();
    self.postMessage({
        type: 'stateUpdate',
        gameState: gameState
    });
}

function tick() {
    if (!isRunning || !engine) {
        return;
    }
    
    try {
        // Calculate delta time
        const DAYS_PER_TICK = 1.0 / 60.0; // 1 day / 60 ticks
        const effectiveDeltaTimeDays = DAYS_PER_TICK * timeSpeed;
        
        // Ensure effectiveDeltaTimeDays is valid
        if (!effectiveDeltaTimeDays || effectiveDeltaTimeDays <= 0 || 
            isNaN(effectiveDeltaTimeDays) || !isFinite(effectiveDeltaTimeDays)) {
            return;
        }
        
        // Execute game tick
        const tickStartTime = performance.now();
        engine.tick(effectiveDeltaTimeDays);
        const tickEndTime = performance.now();
        
        // Update UI every 2 ticks (30fps instead of 60fps)
        uiUpdateCounter++;
        const updateUI = uiUpdateCounter >= 2;
        
        if (updateUI) {
            uiUpdateCounter = 0;
            const gameState = engine.getState();
            if (gameState) {
                self.postMessage({
                    type: 'stateUpdate',
                    gameState: gameState,
                    tickTime: tickEndTime - tickStartTime
                });
            }
        }
    } catch (error) {
        self.postMessage({
            type: 'error',
            error: error.message,
            stack: error.stack
        });
    }
}

