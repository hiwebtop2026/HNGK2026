import { useRef, useEffect, useCallback } from 'react';

interface CaptchaProps {
  onChange?: (code: string) => void;
  width?: number;
  height?: number;
  length?: number;
}

const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCaptchaCode(length: number): string {
  let result = '';
  const charactersLength = CAPTCHA_CHARS.length;
  const array = new Uint32Array(length);
  window.crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += CAPTCHA_CHARS.charAt(array[i] % charactersLength);
  }
  return result;
}

function randomColor(min: number, max: number): string {
  const r = Math.floor(Math.random() * (max - min) + min);
  const g = Math.floor(Math.random() * (max - min) + min);
  const b = Math.floor(Math.random() * (max - min) + min);
  return `rgb(${r},${g},${b})`;
}

export default function Captcha({ onChange, width = 120, height = 40, length = 4 }: CaptchaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const codeRef = useRef<string>('');

  const drawCaptcha = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const code = generateCaptchaCode(length);
    codeRef.current = code;
    onChange?.(code);

    ctx.fillStyle = randomColor(230, 250);
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = randomColor(100, 200);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
      ctx.stroke();
    }

    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = randomColor(100, 200);
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, 1, 0, 2 * Math.PI);
      ctx.fill();
    }

    const fontSize = Math.floor(height * 0.6);
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textBaseline = 'middle';

    const charWidth = width / (length + 1);
    for (let i = 0; i < code.length; i++) {
      const x = charWidth * (i + 0.5) + (Math.random() - 0.5) * 10;
      const y = height / 2 + (Math.random() - 0.5) * 8;
      const angle = (Math.random() - 0.5) * 0.4;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = randomColor(20, 100);
      ctx.fillText(code[i], -fontSize / 4, 0);
      ctx.restore();
    }
  }, [width, height, length, onChange]);

  useEffect(() => {
    drawCaptcha();
  }, [drawCaptcha]);

  const handleClick = () => {
    drawCaptcha();
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleClick}
      title="点击刷新验证码"
      style={{
        cursor: 'pointer',
        borderRadius: '6px',
        border: '1px solid #e5e7eb',
        userSelect: 'none',
      }}
    />
  );
}
