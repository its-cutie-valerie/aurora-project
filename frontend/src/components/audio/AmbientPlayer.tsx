import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import './AmbientPlayer.css';

export const AmbientPlayer: React.FC = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [showFunnyPopup, setShowFunnyPopup] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);
    const gainRef = useRef<GainNode | null>(null);
    const popupTimeoutRef = useRef<number | null>(null);

    const toggleAudio = () => {
        if (isPlaying) {
            stopAudio();
        } else {
            startAudio();
            triggerFunnyPopup();
        }
    };

    const triggerFunnyPopup = () => {
        if (popupTimeoutRef.current) {
            window.clearTimeout(popupTimeoutRef.current);
        }
        setShowFunnyPopup(true);
        popupTimeoutRef.current = window.setTimeout(() => {
            setShowFunnyPopup(false);
        }, 6000);
    };

    const startAudio = async () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        // Create Brown Noise (approximated with filtered white noise)
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            // Simple Brown Noise filter: Integrate white noise
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5; // Compensate for gain loss
        }

        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;

        // Lowpass filter to make it "deep space"
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 120; // Deep rumble

        const gainObj = ctx.createGain();
        gainObj.gain.setValueAtTime(0, ctx.currentTime);
        gainObj.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 2); // Fade in

        noise.connect(filter);
        filter.connect(gainObj);
        gainObj.connect(ctx.destination);

        noise.start();

        sourceRef.current = noise;
        gainRef.current = gainObj;
        setIsPlaying(true);
    };

    const stopAudio = () => {
        if (gainRef.current && audioContextRef.current) {
            // Fade out
            const ctx = audioContextRef.current;
            const gain = gainRef.current.gain;

            // Cancel any previously scheduled checks
            gain.cancelScheduledValues(ctx.currentTime);
            gain.setValueAtTime(gain.value, ctx.currentTime);
            gain.linearRampToValueAtTime(0, ctx.currentTime + 1);

            setTimeout(() => {
                if (sourceRef.current) {
                    try {
                        sourceRef.current.stop();
                        sourceRef.current.disconnect();
                    } catch (e) {
                        // ignore if already stopped
                    }
                    sourceRef.current = null;
                }
                setIsPlaying(false);
            }, 1000);
        } else {
            setIsPlaying(false);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => { });
            }
        };
    }, []);

    return (
        <div className="ambient-player-container">
            {showFunnyPopup && (
                <div className="ambient-player__funny-popup">
                    <p>
                        There's an <em>Interstellar</em> soundtrack playing right now,
                        but you can't hear it because sound waves can't travel through a vacuum. 👨‍🚀
                        <br />
                        <span>Scientifically accurate. Trust me!... pls 🥺👉👈</span>
                    </p>
                </div>
            )}
            <button
                className={`ambient-player glass ${isPlaying ? 'ambient-player--active' : ''}`}
                onClick={toggleAudio}
                aria-label={isPlaying ? "Mute Background Audio" : "Play Background Audio"}
            >
                {isPlaying ? <Volume2 size={20} /> : <VolumeX size={20} />}
                <span className="ambient-player__tooltip">
                    {isPlaying ? "Mute" : "Enable Sound"}
                </span>
            </button>
        </div>
    );
};
