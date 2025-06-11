// Global NProgress configuration
import NProgress from 'nprogress';

// Configure NProgress
NProgress.configure({
    showSpinner: false,
    minimum: 0.15,        // Show earlier in the process
    easing: 'ease-out',   // Smoother easing
    speed: 400,           // Animation speed in ms
    trickleSpeed: 100,    // Speed of trickle in ms
    trickle: true         // Enable incremental updates
});
