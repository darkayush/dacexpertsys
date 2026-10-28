import { useEffect } from 'react';
import Lenis from 'lenis';

let lenisInstance = null;

/**
 * Initialises a single shared Lenis instance for the whole app.
 * Call this once at the root level (e.g. inside App or main).
 */
/**
 * Scrolls an element into view through the shared Lenis instance
 * (falls back to native scrolling when Lenis is not running).
 */
export function scrollToElement(el) {
    if (!el) return;
    if (lenisInstance) {
        // Content may have just grown (data loaded); refresh Lenis' scroll limits first.
        lenisInstance.resize();
        lenisInstance.scrollTo(el, { offset: -24 });
    }
    else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function useLenis() {
    useEffect(() => {
        if (lenisInstance) return; // already running

        lenisInstance = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            wheelMultiplier: 0.9,
        });

        function raf(time) {
            lenisInstance.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        return () => {
            lenisInstance.destroy();
            lenisInstance = null;
        };
    }, []);
}
