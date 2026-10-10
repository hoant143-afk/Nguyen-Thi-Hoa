import { HandPoint, HandTrackResult } from './types';

/**
 * FRUIT SLASH QUIZ - Dual-Team Hand & Motion Slash Detector
 *
 * High-performance, robust, 100% in-browser Computer Vision:
 * - Zone 1: Left half (Team 1, 0% to 50%)
 * - Zone 2: Right half (Team 2, 50% to 100%)
 *
 * Detection Engine:
 * - Dual-layer detection: Dynamic Optical Motion + Continuous Skin / Upper-Body Segmentation.
 * - Even when standing still or moving slowly, hand/body presence keeps 'detected: true'.
 * - When slashing (fast arm/hand swing exceeding velocity threshold), triggers SlashEvent.
 * - Enforces cooldown (280ms) to ensure one arm swing triggers only one valid slash.
 * - Completely local, zero external network downloads, zero WASM out-of-memory or fetch crashes.
 */

export interface SlashEvent {
  team: 'team1' | 'team2';
  from: { x: number; y: number };
  to: { x: number; y: number };
  velocity: number;
  timestamp: number;
}

export class FruitSlashDetector {
  private videoEl: HTMLVideoElement | null = null;
  private canvasEl: HTMLCanvasElement;
  private canvasCtx: CanvasRenderingContext2D | null;

  // Previous frame buffer for motion difference
  private prevFrameData: Uint8ClampedArray | null = null;
  private lastAnalysisTime: number = 0;

  // Smoothed hand positions (in arena %, 0 to 100)
  private team1Pos = { x: 25, y: 50 };
  private team2Pos = { x: 75, y: 50 };

  // Detection hold timer to prevent blinking
  private team1LastDetectedTime = 0;
  private team2LastDetectedTime = 0;
  private readonly HOLD_DURATION_MS = 600; // Keep detected true for 600ms after last confirmed tracking

  // Hand history trails for neon blade ribbon rendering
  private team1Trail: HandPoint[] = [];
  private team2Trail: HandPoint[] = [];

  // Slash cooldown tracking
  private lastSlashTimeTeam1: number = 0;
  private lastSlashTimeTeam2: number = 0;
  private readonly SLASH_COOLDOWN_MS = 280;
  private readonly MIN_SLASH_VELOCITY = 110; // % distance per second

  constructor() {
    this.canvasEl = document.createElement('canvas');
    this.canvasEl.width = 160;
    this.canvasEl.height = 120;
    this.canvasCtx = this.canvasEl.getContext('2d', { willReadFrequently: true });
  }

  public setVideoElement(video: HTMLVideoElement | null) {
    this.videoEl = video;
  }

  public resetTracking() {
    this.prevFrameData = null;
    this.team1Pos = { x: 25, y: 50 };
    this.team2Pos = { x: 75, y: 50 };
    this.team1LastDetectedTime = 0;
    this.team2LastDetectedTime = 0;
    this.team1Trail = [];
    this.team2Trail = [];
    this.lastSlashTimeTeam1 = 0;
    this.lastSlashTimeTeam2 = 0;
  }

  /**
   * Process video frame and return hand status for both teams
   */
  public processFrame(now: number): {
    team1: HandTrackResult;
    team2: HandTrackResult;
    slashEvents: SlashEvent[];
  } {
    const slashEvents: SlashEvent[] = [];

    // Ensure video element exists, is playing and has frames ready
    if (
      !this.videoEl ||
      this.videoEl.readyState < 2 ||
      this.videoEl.videoWidth === 0 ||
      this.videoEl.videoHeight === 0 ||
      !this.canvasCtx
    ) {
      return {
        team1: this.getEmptyResult('team1', now),
        team2: this.getEmptyResult('team2', now),
        slashEvents,
      };
    }

    const dt = Math.min(0.1, Math.max(0.012, (now - this.lastAnalysisTime) / 1000));
    this.lastAnalysisTime = now;

    // High-speed Optical Motion & Hand / Gesture tracking
    this.handleVisionTracking(now, dt, slashEvents);

    // Prune trails older than 260ms
    const trailCutoff = now - 260;
    this.team1Trail = this.team1Trail.filter((p) => p.time >= trailCutoff);
    this.team2Trail = this.team2Trail.filter((p) => p.time >= trailCutoff);

    const team1Result = this.buildResult('team1', now);
    const team2Result = this.buildResult('team2', now);

    return {
      team1: team1Result,
      team2: team2Result,
      slashEvents,
    };
  }

  /**
   * High-speed Vision Tracking
   */
  private handleVisionTracking(now: number, dt: number, slashEvents: SlashEvent[]) {
    if (!this.videoEl || !this.canvasCtx) return;

    const w = this.canvasEl.width;
    const h = this.canvasEl.height;

    // Draw video flipped horizontally onto small canvas for intuitive mirrored user view
    this.canvasCtx.save();
    this.canvasCtx.translate(w, 0);
    this.canvasCtx.scale(-1, 1);
    this.canvasCtx.drawImage(this.videoEl, 0, 0, w, h);
    this.canvasCtx.restore();

    let imgData: ImageData;
    try {
      imgData = this.canvasCtx.getImageData(0, 0, w, h);
    } catch {
      return;
    }

    const data = imgData.data;
    const prevData = this.prevFrameData;
    const halfW = Math.floor(w / 2);

    // Analyze Team 1 (Left Half: x from 0 to halfW)
    const t1Res = this.analyzeHalfZone(data, prevData, w, h, 0, halfW);
    if (t1Res.detected) {
      this.team1LastDetectedTime = now;
      const normX = (t1Res.avgX / w) * 100;
      const normY = (t1Res.avgY / h) * 100;
      this.updateTeamPos('team1', normX, normY, now, dt, slashEvents, t1Res.isRapidMotion);
    }

    // Analyze Team 2 (Right Half: x from halfW to w)
    const t2Res = this.analyzeHalfZone(data, prevData, w, h, halfW, w);
    if (t2Res.detected) {
      this.team2LastDetectedTime = now;
      const normX = (t2Res.avgX / w) * 100;
      const normY = (t2Res.avgY / h) * 100;
      this.updateTeamPos('team2', normX, normY, now, dt, slashEvents, t2Res.isRapidMotion);
    }

    // Save previous frame buffer for next loop
    this.prevFrameData = new Uint8ClampedArray(data);
  }

  /**
   * Analyzes one half of the webcam frame (team1 or team2).
   * Robust against varying room lighting, clothing colors, skin tones.
   */
  private analyzeHalfZone(
    currentData: Uint8ClampedArray,
    prevData: Uint8ClampedArray | null,
    width: number,
    height: number,
    minX: number,
    maxX: number
  ): { detected: boolean; avgX: number; avgY: number; isRapidMotion: boolean } {
    let motionWeight = 0;
    let motionSumX = 0;
    let motionSumY = 0;

    let presenceWeight = 0;
    let presenceSumX = 0;
    let presenceSumY = 0;

    let activeMotionPixels = 0;

    // Scan with step 3 for high responsiveness and fast 60fps execution
    for (let y = 6; y < height - 6; y += 3) {
      for (let x = minX + 2; x < maxX - 2; x += 3) {
        const idx = (y * width + x) * 4;
        const r = currentData[idx];
        const g = currentData[idx + 1];
        const b = currentData[idx + 2];

        // Frame difference motion
        let diff = 0;
        if (prevData) {
          const pr = prevData[idx];
          const pg = prevData[idx + 1];
          const pb = prevData[idx + 2];
          diff = (Math.abs(r - pr) + Math.abs(g - pg) + Math.abs(b - pb)) / 3;
        }

        // Broad skin/hand chrominance check (handles fair, olive, and darker skin tones under classroom light)
        // YCbCr / RGB bounds for human hands
        const isSkin =
          (r > 45 && g > 25 && b > 15 && r > g && r > b && (r - g) > 6) ||
          (r > 80 && g > 55 && b > 40 && Math.abs(r - g) > 8);

        // General player foreground presence (motion or skin)
        if (diff > 18) {
          activeMotionPixels++;
          const wgt = Math.min(10, Math.floor(diff / 6));
          motionSumX += x * wgt;
          motionSumY += y * wgt;
          motionWeight += wgt;
        }

        if (isSkin) {
          presenceSumX += x;
          presenceSumY += y;
          presenceWeight++;
        }
      }
    }

    const hasActiveMotion = motionWeight > 18;
    const hasSkinPresence = presenceWeight > 22;

    if (!hasActiveMotion && !hasSkinPresence) {
      return {
        detected: false,
        avgX: (minX + maxX) / 2,
        avgY: height / 2,
        isRapidMotion: false,
      };
    }

    // If there is significant motion (e.g. arm swinging), prioritize motion centroid!
    // Otherwise, prioritize hand / skin presence centroid so static hands are still tracked.
    let targetX: number;
    let targetY: number;

    if (hasActiveMotion && activeMotionPixels >= 8) {
      targetX = motionSumX / motionWeight;
      targetY = motionSumY / motionWeight;
    } else {
      targetX = presenceSumX / presenceWeight;
      targetY = presenceSumY / presenceWeight;
    }

    return {
      detected: true,
      avgX: targetX,
      avgY: targetY,
      isRapidMotion: activeMotionPixels > 25,
    };
  }

  /**
   * Smooths position and evaluates slash gesture
   */
  private updateTeamPos(
    team: 'team1' | 'team2',
    targetX: number,
    targetY: number,
    now: number,
    dt: number,
    slashEvents: SlashEvent[],
    isRapidMotion: boolean
  ) {
    const pos = team === 'team1' ? this.team1Pos : this.team2Pos;
    const trail = team === 'team1' ? this.team1Trail : this.team2Trail;
    const lastSlashTime = team === 'team1' ? this.lastSlashTimeTeam1 : this.lastSlashTimeTeam2;

    const prevX = pos.x;
    const prevY = pos.y;

    // Adaptive smoothing alpha:
    // When swinging fast, respond instantly (alpha = 0.70). When resting, smooth out noise (alpha = 0.35).
    const alpha = isRapidMotion ? 0.70 : 0.40;
    pos.x = pos.x + alpha * (targetX - pos.x);
    pos.y = pos.y + alpha * (targetY - pos.y);

    // Compute velocity (% of screen arena per second)
    const dx = pos.x - prevX;
    const dy = pos.y - prevY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const velocity = dist / dt;

    // Add to trail
    trail.push({ x: pos.x, y: pos.y, time: now });

    // Detect Slash:
    // Velocity must exceed threshold OR rapid motion pixels detected, and cooldown expired
    const timeSinceLastSlash = now - lastSlashTime;
    const isFastEnough = velocity >= this.MIN_SLASH_VELOCITY || (isRapidMotion && velocity >= 85);

    if (isFastEnough && timeSinceLastSlash >= this.SLASH_COOLDOWN_MS) {
      if (team === 'team1') {
        this.lastSlashTimeTeam1 = now;
      } else {
        this.lastSlashTimeTeam2 = now;
      }

      slashEvents.push({
        team,
        from: { x: prevX, y: prevY },
        to: { x: pos.x, y: pos.y },
        velocity,
        timestamp: now,
      });
    }
  }

  /**
   * Manual slash injection (e.g. for mouse hover/click simulation or test mode)
   */
  public triggerManualSlash(
    team: 'team1' | 'team2',
    from: { x: number; y: number },
    to: { x: number; y: number },
    now: number
  ): SlashEvent {
    const pos = team === 'team1' ? this.team1Pos : this.team2Pos;
    pos.x = to.x;
    pos.y = to.y;

    const trail = team === 'team1' ? this.team1Trail : this.team2Trail;
    trail.push({ x: to.x, y: to.y, time: now });

    if (team === 'team1') {
      this.team1LastDetectedTime = now;
      this.lastSlashTimeTeam1 = now;
    } else {
      this.team2LastDetectedTime = now;
      this.lastSlashTimeTeam2 = now;
    }

    return {
      team,
      from,
      to,
      velocity: 300,
      timestamp: now,
    };
  }

  private buildResult(team: 'team1' | 'team2', now: number): HandTrackResult {
    const pos = team === 'team1' ? this.team1Pos : this.team2Pos;
    const trail = team === 'team1' ? this.team1Trail : this.team2Trail;
    const lastDetectedTime = team === 'team1' ? this.team1LastDetectedTime : this.team2LastDetectedTime;
    const lastSlashTime = team === 'team1' ? this.lastSlashTimeTeam1 : this.lastSlashTimeTeam2;

    const detected = now - lastDetectedTime < this.HOLD_DURATION_MS;
    const isSlashing = now - lastSlashTime < 240;

    let slashAngle = 0;
    if (trail.length >= 2) {
      const p1 = trail[trail.length - 2];
      const p2 = trail[trail.length - 1];
      slashAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    }

    return {
      detected,
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      speed: isSlashing ? 200 : 0,
      isSlashing,
      slashAngle,
      trail: [...trail],
      lastSlashTimestamp: lastSlashTime,
    };
  }

  private getEmptyResult(team: 'team1' | 'team2', _now: number): HandTrackResult {
    return {
      detected: false,
      x: team === 'team1' ? 25 : 75,
      y: 50,
      vx: 0,
      vy: 0,
      speed: 0,
      isSlashing: false,
      slashAngle: 0,
      trail: [],
      lastSlashTimestamp: 0,
    };
  }

  public destroy() {
    this.videoEl = null;
    this.canvasCtx = null;
    this.prevFrameData = null;
    this.team1Trail = [];
    this.team2Trail = [];
  }
}
