// High-performance canvas confetti & cleaning bubble effects
class ConfettiManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.animationFrame = null;
        this.resizeQueued = false;
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.resize();
        // Coalesce resize bursts (mobile URL bar show/hide) into one per frame
        window.addEventListener('resize', () => {
            if (this.resizeQueued) return;
            this.resizeQueued = true;
            requestAnimationFrame(() => {
                this.resizeQueued = false;
                this.resize();
            });
        });
    }

    resize() {
        if (!this.canvas) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        // Resizing clears the bitmap and reallocates it, so skip no-op resizes
        if (this.canvas.width === w && this.canvas.height === h) return;
        this.canvas.width = w;
        this.canvas.height = h;
    }

    // Scale particle counts to screen area so small/low-end phones stay at 60fps
    scaleCount(n) {
        const area = window.innerWidth * window.innerHeight;
        let factor = Math.min(1, Math.max(0.4, area / (1280 * 800)));
        if (this.reducedMotion) factor *= 0.3;
        return Math.max(8, Math.round(n * factor));
    }

    fire(options = {}) {
        const count = this.scaleCount(options.count || 120);
        // Spread relative to screen so small screens aren't overshot
        const speedScale = Math.min(1, Math.max(0.6, window.innerWidth / 900));
        // Same flat palette as the wheel
        const colors = options.colors || ['#e4572e', '#f3b33d', '#2e6b5e', '#1f3a5f', '#f1e6d2'];

        const cx = options.x !== undefined ? options.x : window.innerWidth / 2;
        const cy = options.y !== undefined ? options.y : window.innerHeight * 0.45;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = (8 + Math.random() * 16) * speedScale;
            const shape = Math.random() > 0.35 ? 'rect' : 'strip';

            this.particles.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity - (options.upwardBoost ? 6 : 2),
                size: 6 + Math.random() * 8,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 12,
                shape: shape,
                gravity: 0.28,
                friction: 0.96,
                opacity: 1,
                decay: 0.008 + Math.random() * 0.009
            });
        }

        if (!this.animationFrame) {
            this.loop();
        }
    }

    loop() {
        if (!this.ctx) return;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.vx *= p.friction;
            p.vy = p.vy * p.friction + p.gravity;
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += p.rotationSpeed;
            p.opacity -= p.decay;

            if (p.opacity <= 0 || p.y > this.canvas.height + 50 || p.x < -50 || p.x > this.canvas.width + 50) {
                this.particles.splice(i, 1);
                continue;
            }

            // setTransform is cheaper than save/translate/rotate/restore per particle
            const rad = (p.rotation * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            this.ctx.setTransform(cos, sin, -sin, cos, p.x, p.y);
            this.ctx.globalAlpha = Math.max(0, p.opacity);

            this.ctx.fillStyle = p.color;
            if (p.shape === 'strip') {
                this.ctx.fillRect(-p.size / 2, -p.size * 0.12, p.size, p.size * 0.24);
            } else {
                this.ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
            }
        }
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.globalAlpha = 1;

        if (this.particles.length > 0) {
            this.animationFrame = requestAnimationFrame(() => this.loop());
        } else {
            this.animationFrame = null;
        }
    }

    clear() {
        this.particles = [];
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
}

window.ConfettiManager = ConfettiManager;
