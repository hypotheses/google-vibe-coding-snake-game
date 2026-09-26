import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../services/audioEngine';
import { MusicTrack } from '../types/music';

interface AudioVisualizerProps {
  currentTrack: MusicTrack;
  isPlaying: boolean;
  barCount?: number;
  height?: number;
  mode?: 'bars' | 'wave';
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  currentTrack,
  isPlaying,
  barCount = 28,
  height = 48,
  mode = 'bars'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let peakBars: number[] = new Array(barCount).fill(0);

    const render = () => {
      const width = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, width, h);

      const analyser = audioEngine.getAnalyser();

      if (isPlaying && analyser) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        if (mode === 'bars') {
          const barWidth = Math.max(2, (width / barCount) - 3);
          const step = Math.floor(bufferLength / barCount);

          for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.min(i * step, bufferLength - 1);
            // Boost higher frequencies slightly for a balanced look
            const boost = 1 + (i / barCount) * 0.8;
            const rawVal = (dataArray[dataIndex] / 255) * boost;
            const barHeight = Math.min(h, Math.max(3, rawVal * h));

            // Glitch Art RGB split bars (Cyan on base, Magenta on offset)
            const x = i * (barWidth + 3) + 1;
            const y = h - barHeight;

            // Decay peak bars
            if (barHeight > peakBars[i]) {
              peakBars[i] = barHeight;
            } else {
              peakBars[i] = Math.max(0, peakBars[i] - 1.2);
            }

            // Draw Magenta chromatic glitch shadow
            ctx.fillStyle = '#ff007f';
            ctx.fillRect(x + 1.5, y, barWidth, barHeight);

            // Draw Cyan primary bar
            ctx.fillStyle = '#00f0ff';
            ctx.fillRect(x, y, barWidth, barHeight);

            // Draw Peak glitch pixel
            if (peakBars[i] > 3) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(x, h - peakBars[i], barWidth, 2);
            }
          }
        } else {
          // Wave mode
          const timeData = new Uint8Array(bufferLength);
          analyser.getByteTimeDomainData(timeData);

          // Magenta split wave
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#ff007f';
          ctx.beginPath();
          const sliceWidth = width / bufferLength;
          let x = 0;
          for (let i = 0; i < bufferLength; i++) {
            const v = timeData[i] / 128.0;
            const y = (v * h) / 2 + 1;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth;
          }
          ctx.stroke();

          // Cyan primary wave
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#00f0ff';
          ctx.beginPath();
          x = 0;
          for (let i = 0; i < bufferLength; i++) {
            const v = timeData[i] / 128.0;
            const y = (v * h) / 2 - 1;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth;
          }
          ctx.stroke();
        }
      } else {
        // Idle glitch static pattern
        const time = Date.now() * 0.003;
        const barWidth = Math.max(2, (width / barCount) - 3);

        for (let i = 0; i < barCount; i++) {
          const noise = (Math.sin(time * 3 + i * 0.7) * Math.cos(time + i)) * 0.5 + 0.5;
          const barHeight = 2 + noise * 6;
          const x = i * (barWidth + 3) + 1;
          const y = h - barHeight;

          ctx.fillStyle = i % 2 === 0 ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255, 0, 127, 0.3)';
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentTrack, barCount, height, mode]);

  return (
    <div className="relative w-full overflow-hidden rounded">
      <canvas
        ref={canvasRef}
        width={280}
        height={height}
        className="w-full block"
        style={{ height: `${height}px` }}
      />
    </div>
  );
};
