/*
    Modern Portfolio Design & Animation Engine
    Clean, high-performance animations (Scroll Reveal, Navbar Scroll & Card Spotlights)
*/

(function() {
    // --- 1. Card Radial Spotlight Glare ---
    function initCardSpotlights() {
        document.addEventListener('mousemove', (e) => {
            const panel = e.target.closest('.glass-panel');
            if (panel) {
                const rect = panel.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                panel.style.setProperty('--mouse-x', `${x}px`);
                panel.style.setProperty('--mouse-y', `${y}px`);
            }
        });
    }
    
    function injectCardSpotlights() {
        const panels = document.querySelectorAll('.glass-panel');
        panels.forEach(panel => {
            if (!panel.querySelector('.glass-panel-spotlight')) {
                const spotlight = document.createElement('div');
                spotlight.className = 'glass-panel-spotlight';
                panel.appendChild(spotlight);
            }
        });
    }

    // --- 2. DOM Loader Orchestration ---
    document.addEventListener('DOMContentLoaded', () => {
        // --- Navbar Scroll Effect ---
        const nav = document.querySelector('.nav-modern'); 
        if (nav) {
            const handleScroll = () => {
                if (window.scrollY > 50) {
                    nav.classList.add('scrolled');
                } else {
                    nav.classList.remove('scrolled');
                }
            };
            window.addEventListener('scroll', handleScroll);
            handleScroll();
        }

        // --- Intersection Observer for Scroll Reveals ---
        const revealElements = document.querySelectorAll('.reveal-up');
        const revealOptions = {
            threshold: 0.15,
            rootMargin: "0px 0px -50px 0px"
        };

        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            });
        }, revealOptions);

        revealElements.forEach(el => revealObserver.observe(el));

        // --- Spotlights Init ---
        injectCardSpotlights();
        initCardSpotlights();
    });
})();
