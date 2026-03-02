/**
 * HELIX LOADING OVERLAY - All-in-one Script
 * Just include this file: <script src="loading.js"></script>
 * Auto-injects HTML and CSS, provides global functions
 */

(function() {
    'use strict';
    
    // Inject CSS
    const styles = `
        .loading-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.98);
            z-index: 9999;
            justify-content: center;
            align-items: center;
        }
        
        .loading-overlay.active {
            display: flex;
        }
        
        .loading-container {
            text-align: center;
        }
        
        .loading-spinner {
            position: relative;
            width: 200px;
            height: 200px;
            margin: 0 auto 2rem;
        }
        
        .spinner-svg {
            width: 100%;
            height: 100%;
            transform: rotate(-90deg);
            position: absolute;
            top: 0;
            left: 0;
        }
        
        .spinner-track {
            fill: none;
            stroke: #e0e0e0;
            stroke-width: 4;
        }
        
        .spinner-circle {
            fill: none;
            stroke: #49a6a6;
            stroke-width: 4;
            stroke-linecap: round;
            stroke-dasharray: 251.2;
            stroke-dashoffset: 251.2;
            animation: spinnerAnimation 1.5s ease-in-out infinite;
        }
        
        @keyframes spinnerAnimation {
            0% {
                stroke-dashoffset: 251.2;
                transform: rotate(0deg);
            }
            50% {
                stroke-dashoffset: 62.8;
                transform: rotate(180deg);
            }
            100% {
                stroke-dashoffset: 251.2;
                transform: rotate(360deg);
            }
        }
        
        .loading-logo {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 120px;
            height: 120px;
            border-radius: 50%;
            object-fit: cover;
            background: white;
        }
        
        .loading-text {
            font-size: 1.2rem;
            color: #49a6a6;
            font-weight: 600;
            animation: pulse 1.5s ease-in-out infinite;
        }
        
        @keyframes pulse {
            0%, 100% {
                opacity: 1;
            }
            50% {
                opacity: 0.5;
            }
        }
    `;
    
    // Inject HTML
    const html = `
        <div class="loading-overlay" id="loadingOverlay">
            <div class="loading-container">
                <div class="loading-spinner">
                    <svg class="spinner-svg" viewBox="0 0 100 100">
                        <circle class="spinner-track" cx="50" cy="50" r="40"></circle>
                        <circle class="spinner-circle" cx="50" cy="50" r="40"></circle>
                    </svg>
                    <img src="logo.png" alt="Helix Logo" class="loading-logo">
                </div>
                <p class="loading-text">Loading...</p>
            </div>
        </div>
    `;
    
    // Initialize when DOM is ready
    function init() {
        // Inject CSS
        const styleEl = document.createElement('style');
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
        
        // Inject HTML
        document.body.insertAdjacentHTML('beforeend', html);
    }
    
    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // ========================================
    // GLOBAL API FUNCTIONS
    // ========================================
    
    /**
     * Show loading overlay
     * @param {string} message - Optional custom loading message (default: "Loading...")
     * @example showLoading('Loading your pets...')
     */
    window.showLoading = function(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const text = overlay ? overlay.querySelector('.loading-text') : null;
        
        if (text && message) {
            text.textContent = message;
        }
        
        if (overlay) {
            overlay.classList.add('active');
        }
    };
    
    /**
     * Hide loading overlay
     * @param {number} delay - Optional delay in milliseconds before hiding (default: 0)
     * @example hideLoading(1000) // Hide after 1 second
     */
    window.hideLoading = function(delay = 0) {
        const overlay = document.getElementById('loadingOverlay');
        
        if (!overlay) return;
        
        if (delay > 0) {
            setTimeout(() => {
                overlay.classList.remove('active');
            }, delay);
        } else {
            overlay.classList.remove('active');
        }
    };
    
    /**
     * Show loading for a specific duration then auto-hide
     * @param {number} duration - Duration in milliseconds
     * @param {string} message - Optional custom loading message
     * @example showLoadingFor(2000, 'Loading data...') // Show for 2 seconds
     */
    window.showLoadingFor = function(duration, message = 'Loading...') {
        window.showLoading(message);
        window.hideLoading(duration);
    };
    
})();