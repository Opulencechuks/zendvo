"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.launchCelebrationConfetti = launchCelebrationConfetti;
const canvas_confetti_1 = __importDefault(require("canvas-confetti"));
const CONFETTI_COLORS = [
    "#5F52FF",
    "#00D084",
    "#FFC53D",
    "#FF6B6B",
    "#2EC4B6",
];
function launchCelebrationConfetti() {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return () => undefined;
    }
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "80";
    document.body.appendChild(canvas);
    const fire = canvas_confetti_1.default.create(canvas, {
        resize: true,
        useWorker: true,
    });
    const timeouts = [
        window.setTimeout(() => {
            fire({
                particleCount: 160,
                spread: 110,
                startVelocity: 48,
                scalar: 1.1,
                ticks: 220,
                origin: { x: 0.5, y: 0.45 },
                colors: CONFETTI_COLORS,
                disableForReducedMotion: true,
            });
        }, 0),
        window.setTimeout(() => {
            fire({
                particleCount: 90,
                angle: 60,
                spread: 70,
                startVelocity: 42,
                ticks: 180,
                origin: { x: 0.08, y: 0.6 },
                colors: CONFETTI_COLORS,
                disableForReducedMotion: true,
            });
        }, 140),
        window.setTimeout(() => {
            fire({
                particleCount: 90,
                angle: 120,
                spread: 70,
                startVelocity: 42,
                ticks: 180,
                origin: { x: 0.92, y: 0.6 },
                colors: CONFETTI_COLORS,
                disableForReducedMotion: true,
            });
        }, 220),
    ];
    const cleanup = () => {
        timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
        canvas.remove();
    };
    const cleanupTimeout = window.setTimeout(cleanup, 2000);
    return () => {
        window.clearTimeout(cleanupTimeout);
        cleanup();
    };
}
