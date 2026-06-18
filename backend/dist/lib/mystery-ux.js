"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playMysterySound = exports.triggerHaptic = void 0;
const triggerHaptic = (intensity = "medium") => {
    if (typeof window !== "undefined" && window.navigator.vibrate) {
        const patterns = {
            light: [10],
            medium: [20],
            heavy: [50],
        };
        window.navigator.vibrate(patterns[intensity]);
    }
};
exports.triggerHaptic = triggerHaptic;
const playMysterySound = (type) => {
    if (typeof window === "undefined")
        return;
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        const now = audioCtx.currentTime;
        switch (type) {
            case "unwrap":
                oscillator.type = "sine";
                oscillator.frequency.setValueAtTime(150, now);
                oscillator.frequency.exponentialRampToValueAtTime(40, now + 0.5);
                gainNode.gain.setValueAtTime(0.3, now);
                gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
                oscillator.start(now);
                oscillator.stop(now + 0.5);
                break;
            case "shine":
                oscillator.type = "triangle";
                oscillator.frequency.setValueAtTime(800, now);
                oscillator.frequency.exponentialRampToValueAtTime(1200, now + 1);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.linearRampToValueAtTime(0, now + 1);
                oscillator.start(now);
                oscillator.stop(now + 1);
                break;
            case "reveal":
                const chime = (freq, delay) => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(freq, now + delay);
                    gain.gain.setValueAtTime(0.2, now + delay);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.8);
                    osc.start(now + delay);
                    osc.stop(now + delay + 0.8);
                };
                chime(523.25, 0);
                chime(659.25, 0.1);
                chime(783.99, 0.2);
                chime(1046.5, 0.3);
                break;
            case "scratch":
                oscillator.type = "square";
                oscillator.frequency.setValueAtTime(100, now);
                const filter = audioCtx.createBiquadFilter();
                filter.type = "highpass";
                filter.frequency.value = 1000;
                oscillator.disconnect();
                oscillator.connect(filter);
                filter.connect(gainNode);
                gainNode.gain.setValueAtTime(0.05, now);
                gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
                oscillator.start(now);
                oscillator.stop(now + 0.1);
                break;
        }
    }
    catch (e) {
        console.warn("Audio Context failed", e);
    }
};
exports.playMysterySound = playMysterySound;
