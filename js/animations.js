/*
    Modern Portfolio Design & Animation Engine
    Supports 2D Sleek Mode and 3D Immersive Mode
    Integrates WebGL Three.js, Canvas 2D, Card Tilt, Spotlights, and Cursors
*/

(function() {
    // Global State
    let currentMode = localStorage.getItem('portfolio_design_mode') || '2d';
    let threeScriptLoaded = false;
    let tiltScriptLoaded = false;
    
    // Canvas Engines State
    let canvas2D = null;
    let ctx2D = null;
    let animationFrame2D = null;
    let particles2D = [];
    
    let scene3D = null;
    let camera3D = null;
    let renderer3D = null;
    let animationFrame3D = null;
    let wavePoints = null;
    let waveGeometry = null;
    let waveCountX = 75;
    let waveCountY = 75;
    let waveSpacing = 30;
    
    // Mouse Coordinates
    let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let windowHalfX = window.innerWidth / 2;
    let windowHalfY = window.innerHeight / 2;

    // Helper to dynamically load external scripts
    function loadScript(url) {
        return new Promise((resolve, reject) => {
            // Check if already in DOM
            const scripts = Array.from(document.querySelectorAll('script'));
            if (scripts.some(s => s.src === url)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
            document.head.appendChild(script);
        });
    }

    // --- 1. 2D Constellation Canvas Engine ---
    function init2DBackground() {
        // Destroy 3D scene first
        destroy3D();
        
        let canvas = document.getElementById('design-bg-canvas-2d');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'design-bg-canvas-2d';
            canvas.className = 'design-bg-canvas';
            document.body.appendChild(canvas);
        }
        canvas.style.opacity = '1';
        canvas2D = canvas;
        ctx2D = canvas.getContext('2d');
        
        resize2DCanvas();
        window.addEventListener('resize', resize2DCanvas);
        
        // Initialize particles
        particles2D = [];
        const particleCount = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000));
        for (let i = 0; i < particleCount; i++) {
            particles2D.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.8,
                vy: (Math.random() - 0.5) * 0.8,
                radius: Math.random() * 2 + 1
            });
        }
        
        animate2D();
    }
    
    function resize2DCanvas() {
        if (canvas2D) {
            canvas2D.width = window.innerWidth;
            canvas2D.height = window.innerHeight;
        }
    }
    
    function animate2D() {
        if (!canvas2D) return;
        
        ctx2D.clearRect(0, 0, canvas2D.width, canvas2D.height);
        
        // Draw connection lines
        ctx2D.strokeStyle = 'rgba(0, 240, 255, 0.05)';
        ctx2D.lineWidth = 1;
        
        const maxDist = 120;
        
        for (let i = 0; i < particles2D.length; i++) {
            const p1 = particles2D[i];
            
            // Move particles
            p1.x += p1.vx;
            p1.y += p1.vy;
            
            // Boundary checks
            if (p1.x < 0 || p1.x > canvas2D.width) p1.vx *= -1;
            if (p1.y < 0 || p1.y > canvas2D.height) p1.vy *= -1;
            
            // Mouse interaction (push away)
            const dxMouse = mouse.x - p1.x;
            const dyMouse = mouse.y - p1.y;
            const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
            if (distMouse < 150) {
                p1.x -= dxMouse * 0.02;
                p1.y -= dyMouse * 0.02;
            }
            
            // Draw particle glow
            ctx2D.fillStyle = 'rgba(138, 43, 226, 0.45)';
            ctx2D.beginPath();
            ctx2D.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
            ctx2D.fill();
            
            // Draw lines
            for (let j = i + 1; j < particles2D.length; j++) {
                const p2 = particles2D[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < maxDist) {
                    const alpha = (1 - dist / maxDist) * 0.15;
                    ctx2D.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
                    ctx2D.beginPath();
                    ctx2D.moveTo(p1.x, p1.y);
                    ctx2D.lineTo(p2.x, p2.y);
                    ctx2D.stroke();
                }
            }
        }
        
        animationFrame2D = requestAnimationFrame(animate2D);
    }
    
    function destroy2D() {
        if (animationFrame2D) cancelAnimationFrame(animationFrame2D);
        window.removeEventListener('resize', resize2DCanvas);
        
        const canvas = document.getElementById('design-bg-canvas-2d');
        if (canvas) canvas.remove();
        
        canvas2D = null;
        ctx2D = null;
        particles2D = [];
    }

    // --- 2. 3D WebGL Three.js Wave Engine ---
    async function init3DBackground() {
        // Destroy 2D canvas first
        destroy2D();
        
        // Load Three.js if needed
        if (!threeScriptLoaded) {
            try {
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
                threeScriptLoaded = true;
            } catch (err) {
                console.error("Three.js failed to load, falling back to 2D:", err);
                transitionToMode('2d');
                return;
            }
        }
        
        let container = document.getElementById('design-bg-canvas-3d');
        if (!container) {
            container = document.createElement('div');
            container.id = 'design-bg-canvas-3d';
            container.className = 'design-bg-canvas';
            document.body.appendChild(container);
        }
        container.style.opacity = '1';
        
        // Setup Scene, Camera, WebGLRenderer
        scene3D = new THREE.Scene();
        scene3D.fog = new THREE.FogExp2(0x060608, 0.0007);
        
        camera3D = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 3000);
        camera3D.position.z = 1000;
        camera3D.position.y = 150;
        
        // Terrain particle grid variables
        const numParticles = waveCountX * waveCountY;
        const positions = new Float32Array(numParticles * 3);
        const colors = new Float32Array(numParticles * 3);
        
        const color1 = new THREE.Color(0x00f0ff); // Neon Cyan
        const color2 = new THREE.Color(0x8a2be2); // Purple
        
        let i = 0;
        for (let ix = 0; ix < waveCountX; ix++) {
            for (let iy = 0; iy < waveCountY; iy++) {
                // Horizontal Coordinates
                positions[i] = ix * waveSpacing - ((waveCountX * waveSpacing) / 2);
                positions[i + 1] = 0;
                positions[i + 2] = iy * waveSpacing - ((waveCountY * waveSpacing) / 2);
                
                // Colors
                const ratio = (ix + iy) / (waveCountX + waveCountY);
                const mixedColor = color1.clone().lerp(color2, ratio);
                colors[i] = mixedColor.r;
                colors[i + 1] = mixedColor.g;
                colors[i + 2] = mixedColor.b;
                
                i += 3;
            }
        }
        
        waveGeometry = new THREE.BufferGeometry();
        waveGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        waveGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        // Circular soft texture
        const pTexture = createCircleTexture();
        const material = new THREE.PointsMaterial({
            size: 3,
            vertexColors: true,
            map: pTexture,
            transparent: true,
            opacity: 0.65,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        wavePoints = new THREE.Points(waveGeometry, material);
        scene3D.add(wavePoints);
        
        renderer3D = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer3D.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer3D.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer3D.domElement);
        
        window.addEventListener('resize', on3DWindowResize);
        
        // Active 3D tilt cards
        initTiltOnCards();
        
        animate3D();
    }
    
    function createCircleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(8, 8, 8, 0, Math.PI * 2);
        ctx.fill();
        return new THREE.CanvasTexture(canvas);
    }
    
    function on3DWindowResize() {
        if (camera3D && renderer3D) {
            windowHalfX = window.innerWidth / 2;
            windowHalfY = window.innerHeight / 2;
            camera3D.aspect = window.innerWidth / window.innerHeight;
            camera3D.updateProjectionMatrix();
            renderer3D.setSize(window.innerWidth, window.innerHeight);
        }
    }
    
    let time = 0;
    function animate3D() {
        if (!renderer3D) return;
        
        time += 0.025;
        
        const positions = waveGeometry.attributes.position.array;
        
        let i = 0;
        for (let ix = 0; ix < waveCountX; ix++) {
            for (let iy = 0; iy < waveCountY; iy++) {
                // Flowing math landscape
                positions[i + 1] = 
                    (Math.sin((ix + time) * 0.25) * 35) + 
                    (Math.cos((iy + time) * 0.4) * 35);
                i += 3;
            }
        }
        
        waveGeometry.attributes.position.needsUpdate = true;
        
        // Damping movement on mouse coordinates
        mouse.targetX += (mouse.x - mouse.targetX) * 0.05;
        mouse.targetY += (mouse.y - mouse.targetY) * 0.05;
        
        camera3D.position.x += (mouse.targetX * 0.5 - camera3D.position.x) * 0.05;
        camera3D.position.y += (-mouse.targetY * 0.25 + 180 - camera3D.position.y) * 0.05;
        camera3D.lookAt(new THREE.Vector3(0, 0, 0));
        
        wavePoints.rotation.y = time * 0.015;
        
        renderer3D.render(scene3D, camera3D);
        
        animationFrame3D = requestAnimationFrame(animate3D);
    }
    
    function destroy3D() {
        if (animationFrame3D) cancelAnimationFrame(animationFrame3D);
        window.removeEventListener('resize', on3DWindowResize);
        
        const container = document.getElementById('design-bg-canvas-3d');
        if (container) container.remove();
        
        if (renderer3D) {
            renderer3D.dispose();
            renderer3D = null;
        }
        scene3D = null;
        camera3D = null;
        wavePoints = null;
        waveGeometry = null;
        
        destroyTiltOnCards();
    }

    // --- 3. Cards Parallax 3D Tilt ---
    async function initTiltOnCards() {
        if (currentMode !== '3d') return;
        
        if (!tiltScriptLoaded) {
            try {
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/vanilla-tilt/1.8.0/vanilla-tilt.min.js');
                tiltScriptLoaded = true;
            } catch (err) {
                console.error("Vanilla-Tilt failed to load:", err);
                return;
            }
        }
        
        const cards = document.querySelectorAll('.glass-panel');
        cards.forEach(card => {
            VanillaTilt.init(card, {
                max: 10,
                speed: 400,
                glare: true,
                "max-glare": 0.15,
                gyroscope: true,
                scale: 1.02
            });
        });
    }
    
    function destroyTiltOnCards() {
        const cards = document.querySelectorAll('.glass-panel');
        cards.forEach(card => {
            if (card.vanillaTilt) {
                card.vanillaTilt.destroy();
            }
        });
    }

    // --- 4. Custom Follow Cursor and Delegations ---
    function initCustomCursor() {
        // Prevent injecting cursors on touch screens
        if (window.matchMedia('(pointer: coarse)').matches) return;
        
        const dot = document.createElement('div');
        dot.className = 'cursor-glow-inner';
        const ring = document.createElement('div');
        ring.className = 'cursor-glow-outer';
        
        document.body.appendChild(dot);
        document.body.appendChild(ring);
        
        let cursorX = 0, cursorY = 0;
        let ringX = 0, ringY = 0;
        let isVisible = false;
        
        document.addEventListener('mousemove', (e) => {
            cursorX = e.clientX;
            cursorY = e.clientY;
            
            if (!isVisible) {
                dot.style.opacity = '1';
                ring.style.opacity = '1';
                isVisible = true;
            }
            
            // Adjust global mouse calculations relative to screen half width
            mouse.x = e.clientX - windowHalfX;
            mouse.y = e.clientY - windowHalfY;
        });
        
        document.addEventListener('mouseleave', () => {
            dot.style.opacity = '0';
            ring.style.opacity = '0';
            isVisible = false;
        });
        
        function updateCursor() {
            // Lerping for smooth follow lag
            ringX += (cursorX - ringX) * 0.16;
            ringY += (cursorY - ringY) * 0.16;
            
            dot.style.left = `${cursorX}px`;
            dot.style.top = `${cursorY}px`;
            
            ring.style.left = `${ringX}px`;
            ring.style.top = `${ringY}px`;
            
            requestAnimationFrame(updateCursor);
        }
        updateCursor();
        
        // Delegate cursor hover events
        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('a, button, .btn-modern, .design-switcher-btn, .navbar-toggler, .navbar-brand');
            if (target) {
                document.body.classList.add('cursor-hover');
            } else {
                document.body.classList.remove('cursor-hover');
            }
        });
    }

    // --- 5. Card Radial Spotlight Glare ---
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

    // --- 6. Visual Design Switcher Interface & Transitions ---
    function createTransitionOverlay() {
        let overlay = document.getElementById('mode-transition-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'mode-transition-overlay';
            overlay.className = 'mode-transition-overlay';
            
            const scanner = document.createElement('div');
            scanner.className = 'mode-transition-scanner';
            overlay.appendChild(scanner);
            
            document.body.appendChild(overlay);
        }
        return overlay;
    }
    
    function playTransition(callback) {
        const overlay = createTransitionOverlay();
        overlay.classList.add('active');
        
        // Mid-glitch: swap visuals
        setTimeout(() => {
            if (callback) callback();
        }, 400);
        
        // Finish transition overlay
        setTimeout(() => {
            overlay.classList.remove('active');
        }, 800);
    }
    
    function transitionToMode(mode) {
        currentMode = mode;
        localStorage.setItem('portfolio_design_mode', mode);
        
        document.body.classList.remove('mode-2d', 'mode-3d');
        document.body.classList.add(`mode-${mode}`);
        
        // Trigger specific engine init
        if (mode === '3d') {
            init3DBackground();
        } else {
            init2DBackground();
        }
        
        // Re-inject card spotlights (just in case new panels loaded)
        injectCardSpotlights();
    }
    
    function injectSwitcherWidget() {
        let widget = document.querySelector('.design-switcher-widget');
        if (widget) return;
        
        widget = document.createElement('div');
        widget.className = 'design-switcher-widget';
        
        const btn2D = document.createElement('button');
        btn2D.className = `design-switcher-btn ${currentMode === '2d' ? 'active' : ''}`;
        btn2D.innerHTML = '<i class="fa fa-television"></i> 2D Sleek';
        btn2D.dataset.mode = '2d';
        
        const btn3D = document.createElement('button');
        btn3D.className = `design-switcher-btn ${currentMode === '3d' ? 'active' : ''}`;
        btn3D.innerHTML = '<i class="fa fa-cube"></i> 3D Immersive';
        btn3D.dataset.mode = '3d';
        
        widget.appendChild(btn2D);
        widget.appendChild(btn3D);
        document.body.appendChild(widget);
        
        [btn2D, btn3D].forEach(btn => {
            btn.addEventListener('click', () => {
                const targetMode = btn.dataset.mode;
                if (targetMode === currentMode) return;
                
                playTransition(() => {
                    transitionToMode(targetMode);
                    
                    // Update state classes
                    btn2D.classList.toggle('active', targetMode === '2d');
                    btn3D.classList.toggle('active', targetMode === '3d');
                });
            });
        });
    }

    // --- 7. DOM Loader Orchestration ---
    document.addEventListener('DOMContentLoaded', () => {
        
        // --- Navbar Scroll Effect ---
        const nav = document.querySelector('.nav-modern'); 
        if(nav) {
            window.addEventListener('scroll', () => {
                if(window.scrollY > 50) {
                    nav.classList.add('scrolled');
                } else {
                    nav.classList.remove('scrolled');
                }
            });
        }

        // --- Intersection Observer for Scroll Reveals ---
        const revealElements = document.querySelectorAll('.reveal-up');
        const revealOptions = {
            threshold: 0.15,
            rootMargin: "0px 0px -50px 0px"
        };

        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if(!entry.isIntersecting) return;
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            });
        }, revealOptions);

        revealElements.forEach(el => revealObserver.observe(el));

        // --- Design Init ---
        injectCardSpotlights();
        initCardSpotlights();
        initCustomCursor();
        injectSwitcherWidget();
        
        // Activate current layout preference
        transitionToMode(currentMode);
    });
})();
