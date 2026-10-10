import React, { useRef, useEffect, useCallback } from 'react';
import {
  FlyingFruit,
  FruitKind,
  FruitSlashSettings,
  HandTrackResult,
  SlashParticle,
  SpecialItemKind,
} from './types';
import { soundService } from '../../services/soundService';

interface FruitSlashArenaProps {
  settings: FruitSlashSettings;
  videoStream: MediaStream | null;
  team1Hand: HandTrackResult;
  team2Hand: HandTrackResult;
  team1Score: number;
  team2Score: number;
  team1FruitsSliced: number;
  team2FruitsSliced: number;
  isRoundActive: boolean;
  roundWinnerTeam: 'team1' | 'team2' | null;
  roundNotification: string | null;
  countdownValue?: number | string | null;
  isCountdownActive?: boolean;
  onFruitSliced: (fruit: FlyingFruit, team: 'team1' | 'team2', timestamp: number) => void;
  onBoomHit: (fruit: FlyingFruit, team: 'team1' | 'team2') => void;
  onSpecialItemSliced: (fruit: FlyingFruit, team: 'team1' | 'team2') => void;
  onManualSlash?: (team: 'team1' | 'team2', from: { x: number; y: number }, to: { x: number; y: number }) => void;
}

const FRUIT_PALETTE: Record<FruitKind, { primary: string; secondary: string; emoji: string }> = {
  apple: { primary: '#EF4444', secondary: '#FCA5A5', emoji: '🍎' },
  orange: { primary: '#F97316', secondary: '#FDBA74', emoji: '🍊' },
  banana: { primary: '#EAB308', secondary: '#FEF08A', emoji: '🍌' },
  watermelon: { primary: '#10B981', secondary: '#F43F5E', emoji: '🍉' },
  strawberry: { primary: '#E11D48', secondary: '#FDA4AF', emoji: '🍓' },
  grape: { primary: '#8B5CF6', secondary: '#C4B5FD', emoji: '🍇' },
  pineapple: { primary: '#F59E0B', secondary: '#FDE68A', emoji: '🍍' },
  kiwi: { primary: '#84CC16', secondary: '#D9F99D', emoji: '🥝' },
};

export const FruitSlashArena: React.FC<FruitSlashArenaProps> = ({
  settings,
  videoStream,
  team1Hand,
  team2Hand,
  team1Score,
  team2Score,
  team1FruitsSliced,
  team2FruitsSliced,
  isRoundActive,
  roundWinnerTeam,
  roundNotification,
  countdownValue,
  isCountdownActive,
  onFruitSliced,
  onBoomHit,
  onSpecialItemSliced,
  onManualSlash,
}) => {
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fruitsRef = useRef<FlyingFruit[]>([]);
  const particlesRef = useRef<SlashParticle[]>([]);
  const lastSpawnTimeRef = useRef<number>(0);
  const shakeRef = useRef<number>(0); // screen shake magnitude

  // Drag / mouse slash simulation for testing
  const isMouseDownRef = useRef(false);
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);

  // Sync video stream to the display video element
  useEffect(() => {
    if (videoElRef.current && videoStream) {
      if (videoElRef.current.srcObject !== videoStream) {
        videoElRef.current.srcObject = videoStream;
        videoElRef.current.play().catch(() => {});
      }
    }
  }, [videoStream]);

  // Difficulty parameters
  const getDifficultyConfig = useCallback(() => {
    switch (settings.difficulty) {
      case 'EASY':
        return {
          baseRadius: 40,
          speedMult: 0.8,
          gravity: 0.17,
          spawnInterval: 1300,
          boomChance: settings.enableBoom ? 0.12 : 0,
        };
      case 'HARD':
        return {
          baseRadius: 28,
          speedMult: 1.35,
          gravity: 0.28,
          spawnInterval: 750,
          boomChance: settings.enableBoom ? 0.35 : 0,
        };
      case 'MEDIUM':
      default:
        return {
          baseRadius: 34,
          speedMult: 1.05,
          gravity: 0.22,
          spawnInterval: 950,
          boomChance: settings.enableBoom ? 0.22 : 0,
        };
    }
  }, [settings.difficulty, settings.enableBoom]);

  // Create a single fruit instance with specified target zone
  const createFruitInstance = useCallback(
    (
      width: number,
      height: number,
      targetZone: 'team1' | 'team2' | 'cross_left_to_right' | 'cross_right_to_left' | 'top_down'
    ) => {
      const config = getDifficultyConfig();
      const kinds: FruitKind[] = [
        'apple',
        'orange',
        'banana',
        'watermelon',
        'strawberry',
        'grape',
        'pineapple',
        'kiwi',
      ];

      const isBoom = Math.random() < config.boomChance;
      let isSpecial = false;
      let specialType: SpecialItemKind | undefined = undefined;

      if (!isBoom && settings.enableSpecialItems && Math.random() < 0.18) {
        isSpecial = true;
        const specials: SpecialItemKind[] = ['golden_fruit', 'clock', 'shield', 'freeze'];
        specialType = specials[Math.floor(Math.random() * specials.length)];
      }

      const randomKind = kinds[Math.floor(Math.random() * kinds.length)];
      const kind = isBoom ? 'boom' : isSpecial && specialType ? specialType : randomKind;

      let x = width * 0.5;
      let y = height + 40;
      let vx = 0;
      let vy = -12 * config.speedMult;
      let gravity = config.gravity;

      if (targetZone === 'team1') {
        // Spawn directly inside Team 1's camera frame (left half: 10% to 42%)
        x = width * (0.10 + Math.random() * 0.32);
        y = height + 40;
        vx = (Math.random() - 0.45) * 4.5 * config.speedMult;
        vy = -(11 + Math.random() * 4) * config.speedMult;
      } else if (targetZone === 'team2') {
        // Spawn directly inside Team 2's camera frame (right half: 58% to 90%)
        x = width * (0.58 + Math.random() * 0.32);
        y = height + 40;
        vx = (Math.random() - 0.55) * 4.5 * config.speedMult;
        vy = -(11 + Math.random() * 4) * config.speedMult;
      } else if (targetZone === 'cross_left_to_right') {
        // Fly from far left into Team 1 and arching into Team 2
        x = width * 0.05;
        y = height * (0.5 + Math.random() * 0.4);
        vx = (5 + Math.random() * 4) * config.speedMult;
        vy = -(8 + Math.random() * 4) * config.speedMult;
      } else if (targetZone === 'cross_right_to_left') {
        // Fly from far right into Team 2 and arching into Team 1
        x = width * 0.95;
        y = height * (0.5 + Math.random() * 0.4);
        vx = -(5 + Math.random() * 4) * config.speedMult;
        vy = -(8 + Math.random() * 4) * config.speedMult;
      } else {
        // Fall from top inside one of the frames
        const side = Math.random() < 0.5 ? 'team1' : 'team2';
        x = side === 'team1' ? width * (0.15 + Math.random() * 0.25) : width * (0.60 + Math.random() * 0.25);
        y = -40;
        vx = (Math.random() - 0.5) * 3 * config.speedMult;
        vy = (3 + Math.random() * 3) * config.speedMult;
        gravity = config.gravity * 0.6;
      }

      return {
        id: `fruit_${Date.now()}_${Math.random()}`,
        kind,
        isBoom,
        isSpecial,
        specialType,
        x,
        y,
        vx,
        vy,
        gravity,
        radius: isBoom ? config.baseRadius * 0.95 : config.baseRadius,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.12,
        sliced: false,
      } as FlyingFruit;
    },
    [getDifficultyConfig, settings.enableSpecialItems]
  );

  // Spawn fruits into the arena (ensuring both teams get fruits in their camera frames!)
  const spawnFruitWave = useCallback(
    (width: number, height: number) => {
      const mode = Math.random();

      if (mode < 0.45) {
        // DUAL SPAWN: 1 fruit in Team 1's camera frame AND 1 fruit in Team 2's camera frame simultaneously!
        fruitsRef.current.push(createFruitInstance(width, height, 'team1'));
        fruitsRef.current.push(createFruitInstance(width, height, 'team2'));
      } else if (mode < 0.70) {
        // Single spawn alternating inside one team's camera frame
        const zone = Math.random() < 0.5 ? 'team1' : 'team2';
        fruitsRef.current.push(createFruitInstance(width, height, zone));
      } else if (mode < 0.85) {
        // Diagonal cross-screen fruit arching between both teams
        const cross = Math.random() < 0.5 ? 'cross_left_to_right' : 'cross_right_to_left';
        fruitsRef.current.push(createFruitInstance(width, height, cross));
      } else {
        // Falling fruit from top
        fruitsRef.current.push(createFruitInstance(width, height, 'top_down'));
      }
    },
    [createFruitInstance]
  );

  // Spawn juice particles on slice
  const createJuiceParticles = (
    x: number,
    y: number,
    color: string,
    count: number = 22,
    type: 'juice' | 'spark' | 'smoke' | 'golden' | 'ice' = 'juice'
  ) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 3 + Math.random() * 6,
        life: 1,
        maxLife: 0.6 + Math.random() * 0.4,
        type,
      });
    }
  };

  // Check collision between a slash segment and active fruits
  const checkSlashCollision = useCallback(
    (
      from: { x: number; y: number },
      to: { x: number; y: number },
      team: 'team1' | 'team2',
      canvasW: number,
      canvasH: number,
      timestamp: number
    ) => {
      // Convert normalized percent (0..100) to pixel coordinates
      const p1 = { x: (from.x / 100) * canvasW, y: (from.y / 100) * canvasH };
      const p2 = { x: (to.x / 100) * canvasW, y: (to.y / 100) * canvasH };

      const slashLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (slashLen < 8) return; // Ignore microscopic jitter

      const slashAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

      fruitsRef.current.forEach((fruit) => {
        if (fruit.sliced) return;

        // Distance from point (fruit.x, fruit.y) to segment (p1, p2)
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const l2 = dx * dx + dy * dy;
        let t = ((fruit.x - p1.x) * dx + (fruit.y - p1.y) * dy) / l2;
        t = Math.max(0, Math.min(1, t));
        const nearestX = p1.x + t * dx;
        const nearestY = p1.y + t * dy;
        const dist = Math.hypot(fruit.x - nearestX, fruit.y - nearestY);

        if (dist <= fruit.radius * 1.35) {
          // HIT!
          fruit.sliced = true;
          fruit.sliceAngle = slashAngle;
          fruit.slicedBy = team;
          fruit.sliceTimestamp = timestamp;
          fruit.sliceProgress = 0;

          // Split half velocity
          const perpAngle = slashAngle + Math.PI / 2;
          const splitSpeed = 5 + Math.random() * 4;
          fruit.sliceHalf1Offset = {
            x: Math.cos(perpAngle) * splitSpeed,
            y: Math.sin(perpAngle) * splitSpeed,
            r: (Math.random() - 0.5) * 0.25,
          };
          fruit.sliceHalf2Offset = {
            x: -Math.cos(perpAngle) * splitSpeed,
            y: -Math.sin(perpAngle) * splitSpeed,
            r: (Math.random() - 0.5) * 0.25,
          };

          if (fruit.isBoom) {
            // Boom hit!
            shakeRef.current = 28; // Screen shake
            createJuiceParticles(fruit.x, fruit.y, '#EF4444', 40, 'spark');
            createJuiceParticles(fruit.x, fruit.y, '#71717A', 30, 'smoke');
            soundService.playBoomExplosion();
            onBoomHit(fruit, team);
          } else if (fruit.isSpecial) {
            // Special item hit!
            const color =
              fruit.specialType === 'golden_fruit'
                ? '#FBBF24'
                : fruit.specialType === 'freeze'
                ? '#38BDF8'
                : fruit.specialType === 'shield'
                ? '#60A5FA'
                : '#34D399';
            createJuiceParticles(fruit.x, fruit.y, color, 35, 'golden');
            soundService.playFruitSlice();
            soundService.playBonusItem();
            onSpecialItemSliced(fruit, team);
          } else {
            // Normal Fruit sliced!
            const pal = FRUIT_PALETTE[fruit.kind as FruitKind] || {
              primary: '#EF4444',
              secondary: '#FEF08A',
            };
            createJuiceParticles(fruit.x, fruit.y, pal.primary, 26, 'juice');
            createJuiceParticles(fruit.x, fruit.y, pal.secondary, 16, 'juice');
            soundService.playFruitSlice();
            onFruitSliced(fruit, team, timestamp);
          }
        }
      });
    },
    [onFruitSliced, onBoomHit, onSpecialItemSliced]
  );

  // Monitor hand slash events from detector
  useEffect(() => {
    if (!isRoundActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const now = performance.now();

    // Check Team 1 slash
    if (team1Hand.isSlashing && team1Hand.trail.length >= 2) {
      const p1 = team1Hand.trail[team1Hand.trail.length - 2];
      const p2 = team1Hand.trail[team1Hand.trail.length - 1];
      checkSlashCollision(p1, p2, 'team1', canvas.width, canvas.height, now);
    }

    // Check Team 2 slash
    if (team2Hand.isSlashing && team2Hand.trail.length >= 2) {
      const p1 = team2Hand.trail[team2Hand.trail.length - 2];
      const p2 = team2Hand.trail[team2Hand.trail.length - 1];
      checkSlashCollision(p1, p2, 'team2', canvas.width, canvas.height, now);
    }
  }, [team1Hand, team2Hand, isRoundActive, checkSlashCollision]);

  // Main game physics & rendering animation loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Responsive canvas resizing
    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width && rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    const render = (time: number) => {
      const w = canvas.width;
      const h = canvas.height;

      // Handle screen shake
      let shakeOffsetX = 0;
      let shakeOffsetY = 0;
      if (shakeRef.current > 0.5) {
        shakeOffsetX = (Math.random() - 0.5) * shakeRef.current;
        shakeOffsetY = (Math.random() - 0.5) * shakeRef.current;
        shakeRef.current *= 0.88; // decay
      }

      ctx.save();
      ctx.translate(shakeOffsetX, shakeOffsetY);
      ctx.clearRect(-20, -20, w + 40, h + 40);

      // 1. Spawning fruits into camera frames
      if (isRoundActive) {
        const config = getDifficultyConfig();
        if (time - lastSpawnTimeRef.current >= config.spawnInterval) {
          spawnFruitWave(w, h);
          lastSpawnTimeRef.current = time;
        }
      }

      // 2. Update & Draw Particles
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // particle gravity
        p.life -= 0.024;
      });
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);

      particlesRef.current.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 3. Update & Draw Flying Fruits
      fruitsRef.current.forEach((fruit) => {
        if (!fruit.sliced) {
          fruit.x += fruit.vx;
          fruit.y += fruit.vy;
          fruit.vy += fruit.gravity;
          fruit.rotation += fruit.rotationSpeed;
        } else {
          // Sliced animation update
          fruit.sliceProgress = (fruit.sliceProgress || 0) + 0.05;
        }
      });

      // Filter out off-screen fruits
      fruitsRef.current = fruitsRef.current.filter((fruit) => {
        if (fruit.sliced) {
          return (fruit.sliceProgress || 0) < 1.0;
        }
        return fruit.y < h + 120 && fruit.x > -150 && fruit.x < w + 150;
      });

      // Draw each fruit
      fruitsRef.current.forEach((fruit) => {
        drawFruit(ctx, fruit);
      });

      // 4. Draw Hand Slashes / Trails directly over player's camera view
      if (team1Hand.trail.length > 1) {
        drawSlashRibbon(ctx, team1Hand.trail, '#38BDF8', '#0284C7', w, h);
      }
      if (team2Hand.trail.length > 1) {
        drawSlashRibbon(ctx, team2Hand.trail, '#FB923C', '#EA580C', w, h);
      }

      // 5. Draw Hand Reticles on screen
      if (team1Hand.detected) {
        drawHandReticle(ctx, team1Hand.x, team1Hand.y, '#38BDF8', settings.team1Name, w, h, team1Hand.isSlashing);
      }
      if (team2Hand.detected) {
        drawHandReticle(ctx, team2Hand.x, team2Hand.y, '#FB923C', settings.team2Name, w, h, team2Hand.isSlashing);
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [isRoundActive, spawnFruitWave, getDifficultyConfig, team1Hand, team2Hand, settings.team1Name, settings.team2Name]);

  // Mouse / Touch swipe simulation for testing or teacher fallback
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    isMouseDownRef.current = true;
    lastMousePosRef.current = { x, y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMouseDownRef.current || !lastMousePosRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Determine team based on screen half
    const team: 'team1' | 'team2' = x < 50 ? 'team1' : 'team2';
    const from = lastMousePosRef.current;
    const to = { x, y };

    checkSlashCollision(from, to, team, canvas.width, canvas.height, performance.now());
    if (onManualSlash) {
      onManualSlash(team, from, to);
    }

    lastMousePosRef.current = to;
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
    lastMousePosRef.current = null;
  };

  return (
    <div className="relative w-full h-full min-h-[520px] flex-1 select-none overflow-hidden rounded-3xl border-3 border-slate-800 shadow-2xl bg-black">
      {/* 1. EXPANDED LIVE WEBCAM VIDEO (BACKGROUND FOR ENTIRE ARENA) */}
      <video
        ref={videoElRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover -scale-x-100 opacity-90"
      />

      {/* Ambient Contrast Tint */}
      <div className="absolute inset-0 bg-slate-950/25 pointer-events-none" />

      {/* 2. TWO EXPANDED CAMERA FRAMES: BÊN TRÁI (ĐỘI 1) & BÊN PHẢI (ĐỘI 2) */}
      <div className="absolute inset-0 grid grid-cols-2 pointer-events-none z-10">
        {/* TEAM 1 CAMERA FRAME (LEFT HALF 50%) */}
        <div
          className={`relative h-full transition-all duration-300 p-4 md:p-6 flex flex-col justify-between border-r-2 ${
            roundWinnerTeam === 'team1'
              ? 'border-sky-400 bg-sky-500/20 shadow-[inset_0_0_60px_rgba(56,189,248,0.5)]'
              : 'border-cyan-500/30'
          }`}
        >
          {/* Team 1 Header Overlay */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="px-3.5 py-1.5 md:px-4 md:py-2 rounded-2xl bg-sky-500/90 text-white font-black text-sm md:text-base shadow-xl shadow-sky-500/30 flex items-center gap-1.5 backdrop-blur-md border border-sky-300/40">
                <span>⚔️</span>
                <span>{settings.team1Name}</span>
              </div>
              <span
                className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-md ${
                  team1Hand.detected
                    ? 'bg-emerald-500/90 text-white border border-emerald-300/40'
                    : 'bg-slate-900/85 text-slate-400 border border-slate-700'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    team1Hand.detected ? 'bg-white animate-pulse' : 'bg-slate-500'
                  }`}
                />
                <span className="hidden sm:inline">
                  {team1Hand.detected ? 'Đã nhận diện tay' : 'Chưa nhận diện tay'}
                </span>
                <span className="sm:hidden">{team1Hand.detected ? '✋ Tay OK' : '✋ Chưa có tay'}</span>
              </span>
            </div>

            {/* Team 1 Score */}
            <div className="px-4 py-1.5 md:py-2 rounded-2xl bg-slate-900/90 border-2 border-sky-400/60 text-white font-black text-xl md:text-3xl font-mono shadow-xl backdrop-blur-md flex items-center gap-1.5">
              <span>{team1Score}</span>
              <span className="text-[11px] font-sans text-sky-400 font-bold uppercase">Điểm</span>
            </div>
          </div>

          {/* Winner Celebration Overlay if Team 1 won slash */}
          {roundWinnerTeam === 'team1' && (
            <div className="absolute inset-0 flex items-center justify-center bg-sky-500/25 backdrop-blur-xs animate-pulse">
              <div className="px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white font-black text-base md:text-xl shadow-2xl border-2 border-white flex items-center gap-2">
                <span>👑</span>
                <span>{settings.team1Name} GIÀNH QUYỀN TRẢ LỜI!</span>
              </div>
            </div>
          )}

          {/* Team 1 Bottom Status Bar */}
          <div className="flex items-center justify-between text-xs text-sky-200 backdrop-blur-md px-3.5 py-1.5 rounded-xl bg-slate-950/70 border border-sky-500/30 max-w-fit">
            <span>🍎 Chém trúng: <strong>{team1FruitsSliced}</strong></span>
          </div>
        </div>

        {/* TEAM 2 CAMERA FRAME (RIGHT HALF 50%) */}
        <div
          className={`relative h-full transition-all duration-300 p-4 md:p-6 flex flex-col justify-between ${
            roundWinnerTeam === 'team2'
              ? 'border-amber-400 bg-amber-500/20 shadow-[inset_0_0_60px_rgba(251,191,36,0.5)]'
              : ''
          }`}
        >
          {/* Team 2 Header Overlay */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="px-3.5 py-1.5 md:px-4 md:py-2 rounded-2xl bg-amber-500/90 text-slate-950 font-black text-sm md:text-base shadow-xl shadow-amber-500/30 flex items-center gap-1.5 backdrop-blur-md border border-amber-300/40">
                <span>🔥</span>
                <span>{settings.team2Name}</span>
              </div>
              <span
                className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-md ${
                  team2Hand.detected
                    ? 'bg-emerald-500/90 text-white border border-emerald-300/40'
                    : 'bg-slate-900/85 text-slate-400 border border-slate-700'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    team2Hand.detected ? 'bg-white animate-pulse' : 'bg-slate-500'
                  }`}
                />
                <span className="hidden sm:inline">
                  {team2Hand.detected ? 'Đã nhận diện tay' : 'Chưa nhận diện tay'}
                </span>
                <span className="sm:hidden">{team2Hand.detected ? '✋ Tay OK' : '✋ Chưa có tay'}</span>
              </span>
            </div>

            {/* Team 2 Score */}
            <div className="px-4 py-1.5 md:py-2 rounded-2xl bg-slate-900/90 border-2 border-amber-400/60 text-white font-black text-xl md:text-3xl font-mono shadow-xl backdrop-blur-md flex items-center gap-1.5">
              <span>{team2Score}</span>
              <span className="text-[11px] font-sans text-amber-400 font-bold uppercase">Điểm</span>
            </div>
          </div>

          {/* Winner Celebration Overlay if Team 2 won slash */}
          {roundWinnerTeam === 'team2' && (
            <div className="absolute inset-0 flex items-center justify-center bg-amber-500/25 backdrop-blur-xs animate-pulse">
              <div className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-slate-950 font-black text-base md:text-xl shadow-2xl border-2 border-white flex items-center gap-2">
                <span>👑</span>
                <span>{settings.team2Name} GIÀNH QUYỀN TRẢ LỜI!</span>
              </div>
            </div>
          )}

          {/* Team 2 Bottom Status Bar */}
          <div className="flex items-center justify-between text-xs text-amber-200 backdrop-blur-md px-3.5 py-1.5 rounded-xl bg-slate-950/70 border border-amber-500/30 max-w-fit ml-auto">
            <span>🍎 Chém trúng: <strong>{team2FruitsSliced}</strong></span>
          </div>
        </div>
      </div>

      {/* 3. CENTER NEON LASER DIVIDING LINE */}
      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-gradient-to-b from-cyan-400 via-white to-amber-400 shadow-[0_0_20px_rgba(255,255,255,0.9)] pointer-events-none z-15" />

      {/* 4. INTERACTIVE CANVAS (LAID DIRECTLY ON TOP OF WEBCAM) */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="absolute inset-0 w-full h-full block cursor-crosshair touch-none z-20"
      />

      {/* 5. COUNTDOWN OVERLAY IN ARENA (3 -> 2 -> 1 -> GO!) */}
      {isCountdownActive && countdownValue !== undefined && countdownValue !== null && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none bg-black/40 backdrop-blur-xs">
          <div className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-500 to-pink-500 font-mono drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)] animate-pulse">
            {countdownValue}
          </div>
          <p className="text-sm md:text-base font-black text-white mt-4 uppercase tracking-widest px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-700">
            {countdownValue === 'GO!' ? 'CHÉM TRÁI CÂY NGAY!' : 'Chuẩn bị vung tay...'}
          </p>
        </div>
      )}

      {/* 6. FLOATING TOP CENTER BANNER */}
      {roundNotification && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full bg-slate-900/95 border-2 border-amber-400 text-white text-xs md:text-sm font-black shadow-2xl backdrop-blur-md text-center max-w-md pointer-events-none z-30">
          {roundNotification}
        </div>
      )}
    </div>
  );
};

// Helper: Render fruit or sliced fruit halves
function drawFruit(ctx: CanvasRenderingContext2D, fruit: FlyingFruit) {
  ctx.save();
  ctx.translate(fruit.x, fruit.y);

  if (fruit.sliced && fruit.sliceHalf1Offset && fruit.sliceHalf2Offset && fruit.sliceProgress !== undefined) {
    // Sliced animation: draw two halves flying apart
    const p = fruit.sliceProgress;

    // Half 1
    ctx.save();
    ctx.translate(fruit.sliceHalf1Offset.x * p * 10, fruit.sliceHalf1Offset.y * p * 10);
    ctx.rotate(fruit.rotation + fruit.sliceHalf1Offset.r * p * 5);
    drawSingleFruitShape(ctx, fruit, true, 1);
    ctx.restore();

    // Half 2
    ctx.save();
    ctx.translate(fruit.sliceHalf2Offset.x * p * 10, fruit.sliceHalf2Offset.y * p * 10);
    ctx.rotate(fruit.rotation + fruit.sliceHalf2Offset.r * p * 5);
    drawSingleFruitShape(ctx, fruit, true, 2);
    ctx.restore();
  } else {
    // Whole fruit intact
    ctx.rotate(fruit.rotation);
    drawSingleFruitShape(ctx, fruit, false);
  }

  ctx.restore();
}

function drawSingleFruitShape(
  ctx: CanvasRenderingContext2D,
  fruit: FlyingFruit,
  isHalf: boolean = false,
  halfNum: number = 1
) {
  const r = fruit.radius;

  // Clip if drawing half
  if (isHalf) {
    ctx.beginPath();
    if (halfNum === 1) {
      ctx.rect(-r - 10, -r - 10, (r + 10) * 2, r + 10);
    } else {
      ctx.rect(-r - 10, 0, (r + 10) * 2, r + 10);
    }
    ctx.clip();
  }

  // BOOM RENDERING
  if (fruit.isBoom) {
    // Bomb body
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#52525B');
    grad.addColorStop(0.7, '#18181B');
    grad.addColorStop(1, '#09090B');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#EF4444';
    ctx.stroke();

    // Bomb cap & burning fuse
    ctx.fillStyle = '#71717A';
    ctx.fillRect(-r * 0.25, -r - 6, r * 0.5, 6);

    // Fuse rope
    ctx.beginPath();
    ctx.moveTo(0, -r - 6);
    ctx.quadraticCurveTo(8, -r - 16, 4, -r - 22);
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Spark on fuse
    const sparkR = 4 + Math.random() * 3;
    ctx.beginPath();
    ctx.arc(4, -r - 22, sparkR, 0, Math.PI * 2);
    ctx.fillStyle = Math.random() > 0.5 ? '#FBBF24' : '#EF4444';
    ctx.fill();

    // Skull or warning icon on bomb
    ctx.fillStyle = '#F87171';
    ctx.font = `bold ${Math.round(r * 0.9)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💣', 0, 2);
    return;
  }

  // SPECIAL ITEMS RENDERING
  if (fruit.isSpecial) {
    if (fruit.specialType === 'golden_fruit') {
      // Golden glowing fruit
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      const goldGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      goldGrad.addColorStop(0, '#FEF08A');
      goldGrad.addColorStop(0.6, '#F59E0B');
      goldGrad.addColorStop(1, '#B45309');
      ctx.fillStyle = goldGrad;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#FDE047';
      ctx.stroke();

      ctx.font = `${Math.round(r * 1.1)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🌟', 0, 0);
      return;
    }

    if (fruit.specialType === 'clock') {
      ctx.font = `${Math.round(r * 1.2)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⏳', 0, 0);
      return;
    }

    if (fruit.specialType === 'shield') {
      ctx.font = `${Math.round(r * 1.2)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🛡️', 0, 0);
      return;
    }

    if (fruit.specialType === 'freeze') {
      ctx.font = `${Math.round(r * 1.2)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('❄️', 0, 0);
      return;
    }
  }

  // STANDARD FRUIT RENDERING
  const pal = FRUIT_PALETTE[fruit.kind as FruitKind] || FRUIT_PALETTE.apple;

  // Base circular shadow
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  grad.addColorStop(0, pal.secondary);
  grad.addColorStop(0.7, pal.primary);
  grad.addColorStop(1, '#000000');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.stroke();

  // Highlight gleam
  ctx.beginPath();
  ctx.arc(-r * 0.3, -r * 0.3, r * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.fill();

  // Center fruit emoji for instant visual recognition
  ctx.font = `${Math.round(r * 1.15)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pal.emoji, 0, 1);
}

// Helper: Draw smooth slash sword ribbons
function drawSlashRibbon(
  ctx: CanvasRenderingContext2D,
  trail: { x: number; y: number; time: number }[],
  headColor: string,
  tailColor: string,
  width: number,
  height: number
) {
  if (trail.length < 2) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 1; i < trail.length; i++) {
    const p1 = trail[i - 1];
    const p2 = trail[i];

    const x1 = (p1.x / 100) * width;
    const y1 = (p1.y / 100) * height;
    const x2 = (p2.x / 100) * width;
    const y2 = (p2.y / 100) * height;

    const progress = i / trail.length; // 0 (tail) -> 1 (head)
    const strokeWidth = 3 + progress * 10;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = progress > 0.6 ? headColor : tailColor;
    ctx.lineWidth = strokeWidth;
    ctx.shadowColor = headColor;
    ctx.shadowBlur = 12 * progress;
    ctx.globalAlpha = progress * 0.95;
    ctx.stroke();
  }

  ctx.restore();
}

// Helper: Draw animated hand reticle
function drawHandReticle(
  ctx: CanvasRenderingContext2D,
  normX: number,
  normY: number,
  color: string,
  label: string,
  width: number,
  height: number,
  isSlashing: boolean
) {
  const x = (normX / 100) * width;
  const y = (normY / 100) * height;

  ctx.save();
  ctx.translate(x, y);

  // Outer ring
  ctx.beginPath();
  ctx.arc(0, 0, isSlashing ? 32 : 22, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = isSlashing ? 4 : 2.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = isSlashing ? 20 : 10;
  ctx.stroke();

  // Center glowing dot
  ctx.beginPath();
  ctx.arc(0, 0, isSlashing ? 8 : 5, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Label tag
  ctx.fillStyle = color;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 0, 36);

  ctx.restore();
}
