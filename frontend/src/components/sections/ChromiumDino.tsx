import React, { useEffect, useRef, useState } from 'react';

const ASSETS = {
    // Polished Space Dino with Helmet and Forward-reaching Arm
    DINO: `data:image/svg+xml;base64,${btoa('<svg viewBox="0 0 44 47" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="18" height="15" fill="#535353"/><rect x="28" y="12" width="12" height="10" fill="#535353"/><rect x="12" y="25" width="10" height="15" fill="#535353"/><rect x="10" y="40" width="5" height="7" fill="#535353"/><rect x="17" y="40" width="5" height="7" fill="#535353"/><rect x="22" y="24" width="14" height="6" fill="#535353" rx="3"/><circle cx="26" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2"/><circle cx="34" cy="14" r="1.5" fill="#000"/></svg>')}`,
    // Polished Space Cactus (Alien Crystalline Version)
    CACTUS: `data:image/svg+xml;base64,${btoa('<svg viewBox="0 0 30 60" xmlns="http://www.w3.org/2000/svg"><path d="M15 5 L23 18 L20 55 L10 55 L7 18 Z" fill="#2a2a2e" stroke="#535353" stroke-width="1"/><path d="M15 8 L19 18 L17 50 L13 50 L11 18 Z" fill="rgba(255,255,255,0.08)"/><circle cx="15" cy="5" r="3.5" fill="#ef4444"/><circle cx="15" cy="5" r="1.5" fill="#fff"/><path d="M10 35 L4 30 L6 25 L11 30 Z" fill="#3d3d42"/><circle cx="5" cy="27" r="1.5" fill="#06b6d4"/><path d="M20 25 L26 20 L24 15 L19 20 Z" fill="#3d3d42"/><circle cx="25" cy="17" r="1.5" fill="#10b981"/></svg>')}`,
    // Space Clouds / Nebulae
    CLOUD: `data:image/svg+xml;base64,${btoa('<svg viewBox="0 0 46 14" xmlns="http://www.w3.org/2000/svg"><ellipse cx="23" cy="7" rx="20" ry="5" fill="rgba(255,255,255,0.1)"/></svg>')}`,
    // Ground segment (Stardust)
    GROUND: `data:image/svg+xml;base64,${btoa('<svg viewBox="0 0 600 12" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="10" width="600" height="1" fill="rgba(83,83,83,0.5)"/><circle cx="100" cy="5" r="1" fill="#fff"/><circle cx="300" cy="8" r="1" fill="#fff"/><circle cx="500" cy="3" r="1" fill="#fff"/></svg>')}`
};

const ChromiumDino: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [gameOver, setGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [score, setScore] = useState(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const images: Record<string, HTMLImageElement> = {};
        let loadedCount = 0;
        const assetKeys = Object.keys(ASSETS);

        assetKeys.forEach(key => {
            const img = new Image();
            img.src = ASSETS[key as keyof typeof ASSETS];
            img.onload = () => {
                loadedCount++;
                if (loadedCount === assetKeys.length) {
                    renderInitialState();
                }
            };
            images[key] = img;
        });

        let animationFrameId: number;
        let gameActive = false;

        // Game state
        const dino = {
            x: 50,
            y: 93,
            vy: 0,
            w: 44,
            h: 47,
            jump() {
                if (this.y >= 93) this.vy = -8.5;
            },
            update() {
                this.y += this.vy;
                this.vy += 0.45;
                if (this.y > 93) {
                    this.y = 93;
                    this.vy = 0;
                }
            }
        };

        const obstacles: any[] = [];
        let obstacleTimer = 0;
        let groundX = 0;
        let currentScore = 0;

        const renderInitialState = () => {
            ctx.clearRect(0, 0, 600, 150);
            if (images.GROUND) ctx.drawImage(images.GROUND, 0, 138, 600, 12);
            if (images.DINO) ctx.drawImage(images.DINO, dino.x, dino.y, dino.w, dino.h);
        };

        const startLoop = () => {
            gameActive = true;
            setGameStarted(true);
            setGameOver(false);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            loop();
        };

        const loop = () => {
            if (!gameActive) return;

            // Update
            dino.update();
            groundX = (groundX - 3.5) % 600;
            obstacleTimer++;

            if (obstacleTimer > (Math.random() * 80 + 100)) {
                obstacles.push({
                    x: 600,
                    w: Math.random() > 0.5 ? 20 : 15,
                    h: Math.random() > 0.5 ? 40 : 30
                });
                obstacleTimer = 0;
            }

            obstacles.forEach((obs, i) => {
                obs.x -= 3.5;
                if (obs.x < dino.x + dino.w - 15 && obs.x + obs.w > dino.x + 10 && dino.y + dino.h > 150 - obs.h - 10) {
                    gameActive = false;
                    setGameOver(true);
                }
                if (obs.x < -100) obstacles.splice(i, 1);
            });

            currentScore += 0.08;
            setScore(Math.floor(currentScore));

            // Draw
            ctx.clearRect(0, 0, 600, 150);

            if (images.GROUND) {
                ctx.drawImage(images.GROUND, groundX, 138, 600, 12);
                ctx.drawImage(images.GROUND, groundX + 600, 138, 600, 12);
            }

            if (images.DINO) {
                ctx.drawImage(images.DINO, dino.x, dino.y, dino.w, dino.h);
            }

            obstacles.forEach(obs => {
                if (images.CACTUS) {
                    ctx.drawImage(images.CACTUS, obs.x, 150 - obs.h - 10, obs.w, obs.h);
                }
            });

            animationFrameId = requestAnimationFrame(loop);
        };

        const handleAction = () => {
            if (!gameActive) {
                currentScore = 0;
                obstacles.length = 0;
                dino.y = 93;
                dino.vy = 0;
                startLoop();
            } else {
                dino.jump();
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                handleAction();
            }
        };

        const handleTouchStart = (e: TouchEvent) => {
            // Only prevent default if within the game container or if game is active
            // for a better UX, we prevent it mainly when playing to avoid scroll jumping.
            if (gameActive) {
                e.preventDefault();
            }
            handleAction();
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('touchstart', handleTouchStart, { passive: false });

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('touchstart', handleTouchStart);
        };
    }, []);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '150px', background: '#202124', position: 'relative', overflow: 'hidden' }}>
            <canvas ref={canvasRef} width={600} height={150} style={{ display: 'block', margin: '0 auto' }} />
            <div style={{ position: 'absolute', top: 10, right: 20, color: '#555', fontFamily: 'monospace', fontSize: '20px' }}>
                {score.toString().padStart(5, '0')}
            </div>
            {!gameStarted && !gameOver && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#555', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#888' }}>SPACE DINO</div>
                    <div style={{ marginTop: '10px' }}>Press Space or Tap to Launch</div>
                </div>
            )}
            {gameOver && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#555', textAlign: 'center', pointerEvents: 'none' }}>
                    <div style={{ fontSize: '30px', fontWeight: 'bold' }}>MISSION FAILED</div>
                    <div style={{ marginTop: '10px' }}>Press Space or Tap to Restart</div>
                </div>
            )}
        </div>
    );
};

export default ChromiumDino;
