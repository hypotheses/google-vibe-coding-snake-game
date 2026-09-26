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

            const x = i * (barWidth + 3) + 1.5;
            const y = h - barHeight;

            // Decay peak bars
            if (barHeight > peakBars[i]) {
              peakBars[i] = barHeight;
            } else {
              peakBars[i] = Math.max(0, peakBars[i] - 0.8);
            }

            // Draw bar with gradient
            const grad = ctx.createLinearGradient(0, h, 0, 0);
            grad.addColorStop(0, currentTrack.primaryColor + '88');
            grad.addColorStop(0.7, currentTrack.primaryColor);
            grad.addColorStop(1, currentTrack.secondaryColor);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
            ctx.fill();

            // Draw peak dot
            if (peakBars[i] > 4) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(x, h - peakBars[i], barWidth, 2);
            }
          }
        } else {
          // Wave mode
          const timeData = new Uint8Array(bufferLength);
          analyser.getByteTimeDomainData(timeData);

          ctx.lineWidth = 2;
          ctx.strokeStyle = currentTrack.primaryColor;
          ctx.shadowColor = currentTrack.primaryColor;
          ctx.shadowBlur = 8;
          ctx.beginPath();

          const sliceWidth = width / bufferLength;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const v = timeData[i] / 128.0;
            const y = (v * h) / 2;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            x += sliceWidth;
          }

          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      } else {
        // Idle ambient gentle wave
        const time = Date.now() * 0.002;
        const barWidth = Math.max(2, (width / barCount) - 3);

        for (let i = 0; i < barCount; i++) {
          const wave = Math.sin(time + i * 0.3) * 0.5 + 0.5;
          const barHeight = 4 + wave * 8;
          const x = i * (barWidth + 3) + 1.5;
          const y = h - barHeight;

          ctx.fillStyle = 'rgba(100, 116, 139, 0.25)';
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
          ctx.fill();
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
