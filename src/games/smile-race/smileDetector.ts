/**
 * SMILE RACE - Pure Computer Vision Gesture Detector
 * 
 * Compliant with requirements:
 * - Local browser processing ONLY.
 * - DOES NOT infer emotions or psychological states.
 * - Detects facial/mouth geometry gestures (mouth width, aspect ratio, corner curvature, baseline expansion) to serve gameplay.
 * - Does NOT perform face recognition, does NOT store images, video, biometric templates, or embeddings.
 */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TeamZone {
  teamId: string;
  teamCode: string;
  teamName: string;
  color: string;
  markerColor?: string;
  // Normalized coordinates in mirrored user-facing display (0.0 to 1.0)
  normX: number;
  normY: number;
  normWidth: number;
  normHeight: number;
}

export interface TeamZoneAnalysis {
  teamId: string;
  teamCode: string;
  teamName: string;
  color: string;
  zone: TeamZone;
  metrics: SmileGestureMetrics;
  isSmiling: boolean;
  smileScore: number;
  markerConfidence: number;
}

/**
 * Compute screen-split zones for 2, 3, or 4 teams.
 * In mirrored view (webcam mirror), normX: 0 is on the left of the screen, 1.0 is on the right.
 */
export function computeTeamZones(
  teams: { id: string; teamCode: string; name: string; color: string; markerColor?: string }[]
): TeamZone[] {
  const count = teams.length;
  if (count <= 2) {
    return teams.map((team, idx) => ({
      teamId: team.id,
      teamCode: team.teamCode,
      teamName: team.name,
      color: team.color,
      markerColor: team.markerColor,
      normX: idx === 0 ? 0 : 0.5,
      normY: 0,
      normWidth: 0.5,
      normHeight: 1.0,
    }));
  }

  if (count === 3) {
    const colWidth = 1 / 3;
    return teams.map((team, idx) => ({
      teamId: team.id,
      teamCode: team.teamCode,
      teamName: team.name,
      color: team.color,
      markerColor: team.markerColor,
      normX: idx * colWidth,
      normY: 0,
      normWidth: colWidth,
      normHeight: 1.0,
    }));
  }

  // 4 Teams: 2x2 grid layout
  return teams.map((team, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    return {
      teamId: team.id,
      teamCode: team.teamCode,
      teamName: team.name,
      color: team.color,
      markerColor: team.markerColor,
      normX: col * 0.5,
      normY: row * 0.5,
      normWidth: 0.5,
      normHeight: 0.5,
    };
  });
}

export interface SmileGestureMetrics {
  faceDetected: boolean;
  faceBox: BoundingBox | null;
  mouthBox: BoundingBox | null;
  mouthWidth: number;
  mouthHeight: number;
  mouthWidthRatio: number; // mouthWidth / faceWidth
  mouthAspectRatio: number; // mouthWidth / mouthHeight
  lipCornerElevation: number; // upward curvature factor
  teethBrightness: number;
  baselineDelta: number; // percentage expansion over neutral baseline
  smileGestureScore: number; // 0.00 .. 1.00
  detectionMethod: 'NATIVE_LANDMARKS' | 'CANVAS_GEOMETRY';
}

export interface NeutralBaseline {
  mouthWidthRatio: number;
  mouthAspectRatio: number;
  lipCornerElevation: number;
  sampleCount: number;
}

export interface TeamMarkerResult {
  teamCode: string;
  teamId?: string;
  teamName?: string;
  confidence: number; // 0.00 .. 1.00
  pixelCount: number;
  markerBounds?: BoundingBox;
}

export interface CandidateValidation {
  faceDetected: boolean;
  smileScore: number;
  markerConfidence: number;
  teamCode: string;
  teamId: string;
  stableFrames: number;
  timestamp: number;
  reactionTimeMs: number;
  isQualified: boolean;
}

// Convert RGB to HSV
export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6;
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2;
    } else {
      h = (rNorm - gNorm) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : Math.round((delta / max) * 100);
  const v = Math.round(max * 100);

  return { h, s, v };
}

// Skin pixel detector for face localization
export function isSkinTone(r: number, g: number, b: number): boolean {
  if (r > 60 && g > 35 && b > 20) {
    if (r > g && g >= b) {
      const diff = r - Math.max(g, b);
      if (diff > 12) {
        const hsv = rgbToHsv(r, g, b);
        if (hsv.s >= 15 && hsv.s <= 68 && (hsv.h <= 45 || hsv.h >= 340)) {
          return true;
        }
      }
    }
  }
  return false;
}

export class SmileDetector {
  private processingCanvas: HTMLCanvasElement;
  private processingCtx: CanvasRenderingContext2D | null;
  private nativeFaceDetector: any = null;
  private isNativeDetectorAvailable: boolean = false;
  private neutralBaseline: NeutralBaseline | null = null;
  private baselineSamples: { widthRatio: number; aspectRatio: number; elevation: number }[] = [];

  constructor() {
    this.processingCanvas = document.createElement('canvas');
    this.processingCanvas.width = 320;
    this.processingCanvas.height = 240;
    this.processingCtx = this.processingCanvas.getContext('2d', { willReadFrequently: true });

    // Check if Chromium experimental Shape Detection API is present
    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        const FD = (window as any).FaceDetector;
        this.nativeFaceDetector = new FD({ fastMode: true, maxDetectedFaces: 2 });
        this.isNativeDetectorAvailable = true;
      } catch {
        this.isNativeDetectorAvailable = false;
      }
    }
  }

  /**
   * Capture neutral baseline during READY / COUNTDOWN
   * Temporarily kept in memory only and reset after each question round.
   */
  public addBaselineSample(metrics: SmileGestureMetrics) {
    if (!metrics.faceDetected || metrics.mouthWidthRatio <= 0.1) return;
    this.baselineSamples.push({
      widthRatio: metrics.mouthWidthRatio,
      aspectRatio: metrics.mouthAspectRatio,
      elevation: metrics.lipCornerElevation,
    });

    // Compute running average
    const count = this.baselineSamples.length;
    const avgWidth = this.baselineSamples.reduce((sum, s) => sum + s.widthRatio, 0) / count;
    const avgAspect = this.baselineSamples.reduce((sum, s) => sum + s.aspectRatio, 0) / count;
    const avgElev = this.baselineSamples.reduce((sum, s) => sum + s.elevation, 0) / count;

    this.neutralBaseline = {
      mouthWidthRatio: avgWidth,
      mouthAspectRatio: avgAspect,
      lipCornerElevation: avgElev,
      sampleCount: count,
    };
  }

  public getBaseline(): NeutralBaseline | null {
    return this.neutralBaseline;
  }

  public resetBaseline() {
    this.neutralBaseline = null;
    this.baselineSamples = [];
  }

  /**
   * Analyze webcam video frame to extract face & mouth geometry
   */
  public async analyzeFrame(video: HTMLVideoElement): Promise<SmileGestureMetrics> {
    if (!video || video.readyState < 2 || !this.processingCtx) {
      return this.createEmptyMetrics();
    }

    const width = this.processingCanvas.width;
    const height = this.processingCanvas.height;

    // Draw current video frame to processing canvas
    this.processingCtx.drawImage(video, 0, 0, width, height);
    const imageData = this.processingCtx.getImageData(0, 0, width, height);

    // Try native Chromium Shape Detection first if available
    if (this.isNativeDetectorAvailable && this.nativeFaceDetector) {
      try {
        const faces = await this.nativeFaceDetector.detect(this.processingCanvas);
        if (faces && faces.length > 0) {
          const face = faces[0];
          return this.processNativeFace(face, width, height, imageData);
        }
      } catch {
        // Fallback to pure canvas geometry
      }
    }

    // Pure Canvas Computer Vision Face & Mouth Geometry
    return this.processCanvasFace(imageData, width, height);
  }

  /**
   * Process face using Chromium Native Landmarks
   */
  private processNativeFace(face: any, canvasW: number, canvasH: number, imageData: ImageData): SmileGestureMetrics {
    const box = face.boundingBox;
    const faceBox: BoundingBox = {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    };

    // Find landmarks if provided
    let mouthPoints: { x: number; y: number }[] = [];
    if (face.landmarks && Array.isArray(face.landmarks)) {
      for (const lm of face.landmarks) {
        if (lm.type === 'mouth' && lm.locations && Array.isArray(lm.locations)) {
          mouthPoints = lm.locations;
        }
      }
    }

    // Derive mouth bounding box (from landmarks or lower 35% of face)
    let mouthBox: BoundingBox;
    if (mouthPoints.length >= 2) {
      const xs = mouthPoints.map((p) => p.x);
      const ys = mouthPoints.map((p) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      mouthBox = {
        x: minX,
        y: minY,
        width: Math.max(10, maxX - minX),
        height: Math.max(6, maxY - minY),
      };
    } else {
      mouthBox = {
        x: faceBox.x + faceBox.width * 0.22,
        y: faceBox.y + faceBox.height * 0.64,
        width: faceBox.width * 0.56,
        height: faceBox.height * 0.30,
      };
    }

    // Refine mouth geometry using pixel data in the mouth ROI
    return this.calculateMetricsFromMouthROI(faceBox, mouthBox, imageData, canvasW, canvasH, 'NATIVE_LANDMARKS');
  }

  /**
   * Pure Canvas Computer Vision: Skin Locus + Face & Lip Chromaticity Segmentation
   */
  private processCanvasFace(imageData: ImageData, width: number, height: number): SmileGestureMetrics {
    const data = imageData.data;

    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    let skinPixelCount = 0;

    // Scan skin pixels with 4px stride for real-time high-speed processing
    const step = 4;
    for (let y = 10; y < height - 10; y += step) {
      for (let x = 10; x < width - 10; x += step) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        if (isSkinTone(r, g, b)) {
          skinPixelCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const minRequiredSkin = 80; // Enough skin pixels to indicate a real face
    if (skinPixelCount < minRequiredSkin || maxX - minX < 35 || maxY - minY < 45) {
      return this.createEmptyMetrics();
    }

    // Refine Face Bounding Box
    const faceW = maxX - minX;
    const faceH = maxY - minY;
    const faceBox: BoundingBox = {
      x: minX,
      y: minY,
      width: faceW,
      height: faceH,
    };

    // Mouth ROI is located in the lower-central region of the face
    const mouthX = Math.round(faceBox.x + faceBox.width * 0.22);
    const mouthY = Math.round(faceBox.y + faceBox.height * 0.64);
    const mouthW = Math.round(faceBox.width * 0.56);
    const mouthH = Math.round(faceBox.height * 0.30);

    const mouthBox: BoundingBox = {
      x: Math.max(0, mouthX),
      y: Math.max(0, mouthY),
      width: Math.min(width - mouthX, mouthW),
      height: Math.min(height - mouthY, mouthH),
    };

    return this.calculateMetricsFromMouthROI(faceBox, mouthBox, imageData, width, height, 'CANVAS_GEOMETRY');
  }

  /**
   * Deep Geometric Analysis of Mouth ROI:
   * 1. Horizontal span (mouth width relative to face)
   * 2. Vertical aspect ratio (width vs height)
   * 3. Lip corner upward curvature
   * 4. Inner mouth contrast (teeth brightness / oral cavity opening)
   * 5. Delta compared to neutral baseline
   */
  private calculateMetricsFromMouthROI(
    faceBox: BoundingBox,
    mouthBox: BoundingBox,
    imageData: ImageData,
    canvasW: number,
    canvasH: number,
    method: 'NATIVE_LANDMARKS' | 'CANVAS_GEOMETRY'
  ): SmileGestureMetrics {
    const data = imageData.data;

    let leftLipX = mouthBox.x + mouthBox.width;
    let rightLipX = mouthBox.x;
    let leftLipY = mouthBox.y;
    let rightLipY = mouthBox.y;
    let centerLipY = mouthBox.y;
    let lipPixels = 0;
    let brightTeethPixels = 0;

    const startX = Math.max(0, mouthBox.x);
    const endX = Math.min(canvasW, mouthBox.x + mouthBox.width);
    const startY = Math.max(0, mouthBox.y);
    const endY = Math.min(canvasH, mouthBox.y + mouthBox.height);

    for (let y = startY; y < endY; y += 2) {
      for (let x = startX; x < endX; x += 2) {
        const idx = (y * canvasW + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Lip chromaticity index: lips exhibit higher red dominance and lower green/blue
        const lipIntensity = (2 * r - g - b) / (r + g + 1);
        const brightness = (r + g + b) / 3;

        // Bright pixel in mouth ROI (indicating visible teeth during smile)
        if (brightness > 140 && Math.abs(r - g) < 25 && Math.abs(r - b) < 35) {
          brightTeethPixels++;
        }

        // Lip contour pixel
        if (lipIntensity > 0.28 && r > 65) {
          lipPixels++;
          if (x < leftLipX) {
            leftLipX = x;
            leftLipY = y;
          }
          if (x > rightLipX) {
            rightLipX = x;
            rightLipY = y;
          }
          // Near center column
          const midX = mouthBox.x + mouthBox.width / 2;
          if (Math.abs(x - midX) < 8) {
            centerLipY = y;
          }
        }
      }
    }

    // Compute geometric spans
    const detectedMouthW = rightLipX > leftLipX ? rightLipX - leftLipX : mouthBox.width * 0.7;
    const detectedMouthH = Math.max(8, mouthBox.height * 0.6);

    const mouthWidthRatio = Math.min(1, Math.max(0.1, detectedMouthW / Math.max(1, faceBox.width)));
    const mouthAspectRatio = detectedMouthW / Math.max(1, detectedMouthH);

    // Corner elevation: during a smile gesture, the left and right mouth corners move upward relative to the center
    const cornersAvgY = (leftLipY + rightLipY) / 2;
    // Positive when corners are higher (smaller Y in screen coords) than center
    const cornerElevation = (centerLipY - cornersAvgY) / Math.max(1, detectedMouthH);

    const teethRatio = brightTeethPixels / Math.max(1, (mouthBox.width * mouthBox.height) / 4);

    // Baseline Delta
    let baselineDelta = 0;
    if (this.neutralBaseline && this.neutralBaseline.mouthWidthRatio > 0) {
      baselineDelta = (mouthWidthRatio - this.neutralBaseline.mouthWidthRatio) / this.neutralBaseline.mouthWidthRatio;
    }

    // Calculate normalized Smile Gesture Score (0.00 .. 1.00)
    // Smile gesture is characterized by:
    // 1) Widened mouth relative to face (neutral is ~0.35-0.42; smile expands to ~0.48-0.65)
    // 2) Corner elevation upward
    // 3) Mouth aspect ratio widening
    // 4) Relative expansion compared to baseline
    // 5) Teeth/cavity brightness presence

    // Faster response curve: mouth width expansion triggers earlier (0.35 vs 0.38)
    const widthFactor = Math.min(1, Math.max(0, (mouthWidthRatio - 0.35) / 0.16));
    const aspectFactor = Math.min(1, Math.max(0, (mouthAspectRatio - 1.9) / 2.2));
    const cornerFactor = Math.min(1, Math.max(0, (cornerElevation + 0.02) / 0.22));
    const teethFactor = Math.min(1, teethRatio * 8);
    const baselineFactor = baselineDelta > 0 ? Math.min(1, baselineDelta * 3.5) : 0;

    // Weighted composite gesture score - responsive and instantaneous
    let score: number;
    if (this.neutralBaseline && this.neutralBaseline.sampleCount >= 3) {
      // With neutral baseline: emphasize relative expansion
      score = widthFactor * 0.35 + baselineFactor * 0.35 + cornerFactor * 0.15 + teethFactor * 0.15;
    } else {
      // Without baseline: use absolute geometric landmarks
      score = widthFactor * 0.50 + aspectFactor * 0.20 + cornerFactor * 0.15 + teethFactor * 0.15;
    }

    const smileGestureScore = Math.round(Math.min(1, Math.max(0, score)) * 100) / 100;

    return {
      faceDetected: true,
      faceBox,
      mouthBox,
      mouthWidth: Math.round(detectedMouthW),
      mouthHeight: Math.round(detectedMouthH),
      mouthWidthRatio: Math.round(mouthWidthRatio * 100) / 100,
      mouthAspectRatio: Math.round(mouthAspectRatio * 100) / 100,
      lipCornerElevation: Math.round(cornerElevation * 100) / 100,
      teethBrightness: Math.round(teethRatio * 100) / 100,
      baselineDelta: Math.round(baselineDelta * 100) / 100,
      smileGestureScore,
      detectionMethod: method,
    };
  }

  /**
   * Fast Multi-Zone Computer Vision:
   * Splits the webcam feed into individual zones per team and analyzes each team independently in real-time.
   * Enables instant response time (<50ms) and clear attribution without waiting for card markers.
   */
  public async analyzeTeamZones(
    video: HTMLVideoElement,
    teams: { id: string; teamCode: string; name: string; color: string; markerColor?: string }[],
    smileThreshold: number = 0.55
  ): Promise<TeamZoneAnalysis[]> {
    const zones = computeTeamZones(teams);

    if (!video || video.readyState < 2 || !this.processingCtx) {
      return zones.map((zone) => ({
        teamId: zone.teamId,
        teamCode: zone.teamCode,
        teamName: zone.teamName,
        color: zone.color,
        zone,
        metrics: this.createEmptyMetrics(),
        isSmiling: false,
        smileScore: 0,
        markerConfidence: 0,
      }));
    }

    const width = this.processingCanvas.width; // 320
    const height = this.processingCanvas.height; // 240

    // Draw frame flipped horizontally so screen left corresponds to canvas left (x: 0)
    this.processingCtx.save();
    this.processingCtx.translate(width, 0);
    this.processingCtx.scale(-1, 1);
    this.processingCtx.drawImage(video, 0, 0, width, height);
    this.processingCtx.restore();

    const imageData = this.processingCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    return zones.map((zone) => {
      const startX = Math.max(0, Math.floor(zone.normX * width));
      const endX = Math.min(width, Math.ceil((zone.normX + zone.normWidth) * width));
      const startY = Math.max(0, Math.floor(zone.normY * height));
      const endY = Math.min(height, Math.ceil((zone.normY + zone.normHeight) * height));

      let minX = endX;
      let maxX = startX;
      let minY = endY;
      let maxY = startY;
      let skinPixelCount = 0;
      let markerPixelCount = 0;

      // Stride 3 for rapid scanning (<1ms per zone)
      const step = 3;
      for (let y = startY + 4; y < endY - 4; y += step) {
        for (let x = startX + 4; x < endX - 4; x += step) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          if (isSkinTone(r, g, b)) {
            skinPixelCount++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          } else {
            const hsv = rgbToHsv(r, g, b);
            if (this.matchesTeamMarker(zone.teamCode, zone.markerColor, r, g, b, hsv)) {
              markerPixelCount++;
            }
          }
        }
      }

      const minRequiredSkin = 35;
      const faceW = maxX - minX;
      const faceH = maxY - minY;

      if (skinPixelCount < minRequiredSkin || faceW < 22 || faceH < 28) {
        return {
          teamId: zone.teamId,
          teamCode: zone.teamCode,
          teamName: zone.teamName,
          color: zone.color,
          zone,
          metrics: this.createEmptyMetrics(),
          isSmiling: false,
          smileScore: 0,
          markerConfidence: Math.min(1, markerPixelCount / 18),
        };
      }

      // Zone-relative face box
      const faceBox: BoundingBox = {
        x: minX,
        y: minY,
        width: faceW,
        height: faceH,
      };

      // Mouth ROI in lower face region
      const mouthX = Math.round(faceBox.x + faceBox.width * 0.20);
      const mouthY = Math.round(faceBox.y + faceBox.height * 0.62);
      const mouthW = Math.round(faceBox.width * 0.60);
      const mouthH = Math.round(faceBox.height * 0.32);

      const mouthBox: BoundingBox = {
        x: Math.max(startX, mouthX),
        y: Math.max(startY, mouthY),
        width: Math.min(endX - mouthX, mouthW),
        height: Math.min(endY - mouthY, mouthH),
      };

      const metrics = this.calculateMetricsFromMouthROI(
        faceBox,
        mouthBox,
        imageData,
        width,
        height,
        'CANVAS_GEOMETRY'
      );

      const isSmiling = metrics.faceDetected && metrics.smileGestureScore >= smileThreshold;

      return {
        teamId: zone.teamId,
        teamCode: zone.teamCode,
        teamName: zone.teamName,
        color: zone.color,
        zone,
        metrics,
        isSmiling,
        smileScore: metrics.smileGestureScore,
        markerConfidence: Math.min(1, markerPixelCount / 18),
      };
    });
  }

  private matchesTeamMarker(
    teamCode: string,
    markerColor: string | undefined,
    r: number,
    g: number,
    b: number,
    hsv: { h: number; s: number; v: number }
  ): boolean {
    if (teamCode === 'TEAM1' || markerColor === 'blue') {
      return hsv.h >= 180 && hsv.h <= 245 && hsv.s >= 35 && hsv.v >= 25 && b > r * 1.2;
    }
    if (teamCode === 'TEAM2' || markerColor === 'orange') {
      return hsv.h >= 15 && hsv.h <= 45 && hsv.s >= 40 && hsv.v >= 40 && r > b * 1.3;
    }
    if (teamCode === 'TEAM3' || markerColor === 'green') {
      return hsv.h >= 85 && hsv.h <= 155 && hsv.s >= 35 && hsv.v >= 25 && g > r * 1.15;
    }
    if (teamCode === 'TEAM4' || markerColor === 'purple') {
      return hsv.h >= 270 && hsv.h <= 335 && hsv.s >= 35 && hsv.v >= 25 && r > g * 1.1 && b > g * 1.1;
    }
    return false;
  }

  /**
   * Detect Team Color Marker in the frame
   * Generic teams: TEAM1, TEAM2, TEAM3, TEAM4
   */
  public detectTeamMarker(
    video: HTMLVideoElement,
    teams: { id: string; teamCode: string; name: string; color: string; markerColor?: string }[],
    faceBox: BoundingBox | null
  ): TeamMarkerResult[] {
    if (!video || video.readyState < 2 || !this.processingCtx) {
      return [];
    }

    const width = this.processingCanvas.width;
    const height = this.processingCanvas.height;
    const imageData = this.processingCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // We count matching pixels for each team's signature marker color
    const counts: Record<string, { count: number; minX: number; maxX: number; minY: number; maxY: number }> = {
      TEAM1: { count: 0, minX: width, maxX: 0, minY: height, maxY: 0 }, // Blue / Cyan
      TEAM2: { count: 0, minX: width, maxX: 0, minY: height, maxY: 0 }, // Orange / Amber
      TEAM3: { count: 0, minX: width, maxX: 0, minY: height, maxY: 0 }, // Green / Emerald
      TEAM4: { count: 0, minX: width, maxX: 0, minY: height, maxY: 0 }, // Purple / Rose
    };

    const step = 4;
    for (let y = 5; y < height - 5; y += step) {
      for (let x = 5; x < width - 5; x += step) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Skip human skin to avoid confusion with orange/rose
        if (isSkinTone(r, g, b)) continue;

        const hsv = rgbToHsv(r, g, b);

        // TEAM 1: Blue / Cyan (H: 180° - 245°, S >= 35%, V >= 25%, RGB Blue dominance)
        if (hsv.h >= 180 && hsv.h <= 245 && hsv.s >= 35 && hsv.v >= 25 && b > r * 1.25) {
          const c = counts.TEAM1;
          c.count++;
          if (x < c.minX) c.minX = x;
          if (x > c.maxX) c.maxX = x;
          if (y < c.minY) c.minY = y;
          if (y > c.maxY) c.maxY = y;
        }

        // TEAM 2: Orange / Amber (H: 12° - 42° or 355° - 360°, S >= 45%, V >= 35%, R > G * 1.15 && G > B)
        else if (
          ((hsv.h >= 12 && hsv.h <= 42) || (hsv.h >= 355 && hsv.h <= 360)) &&
          hsv.s >= 45 &&
          hsv.v >= 35 &&
          r > g * 1.15 &&
          g > b
        ) {
          const c = counts.TEAM2;
          c.count++;
          if (x < c.minX) c.minX = x;
          if (x > c.maxX) c.maxX = x;
          if (y < c.minY) c.minY = y;
          if (y > c.maxY) c.maxY = y;
        }

        // TEAM 3: Green / Emerald (H: 85° - 155°, S >= 35%, V >= 25%, G > r * 1.15 && G > b)
        else if (hsv.h >= 85 && hsv.h <= 155 && hsv.s >= 35 && hsv.v >= 25 && g > r * 1.15) {
          const c = counts.TEAM3;
          c.count++;
          if (x < c.minX) c.minX = x;
          if (x > c.maxX) c.maxX = x;
          if (y < c.minY) c.minY = y;
          if (y > c.maxY) c.maxY = y;
        }

        // TEAM 4: Purple / Rose (H: 270° - 335°, S >= 35%, V >= 25%, R and B dominant over G)
        else if (hsv.h >= 270 && hsv.h <= 335 && hsv.s >= 35 && hsv.v >= 25 && r > g * 1.1 && b > g * 1.1) {
          const c = counts.TEAM4;
          c.count++;
          if (x < c.minX) c.minX = x;
          if (x > c.maxX) c.maxX = x;
          if (y < c.minY) c.minY = y;
          if (y > c.maxY) c.maxY = y;
        }
      }
    }

    // Spatial affinity: bonus if marker is held near the candidate face
    return teams.map((team, index) => {
      const code = team.teamCode || `TEAM${index + 1}`;
      const stat = counts[code] || { count: 0, minX: 0, maxX: 0, minY: 0, maxY: 0 };

      // Normalization: 30 pixels sampled (~480 real frame pixels) = strong confidence 1.0
      let rawConfidence = Math.min(1, stat.count / 28);

      // Check proximity to face box if face is detected
      if (faceBox && stat.count > 5) {
        const markerCenterX = (stat.minX + stat.maxX) / 2;
        const markerCenterY = (stat.minY + stat.maxY) / 2;
        const faceCenterX = faceBox.x + faceBox.width / 2;
        const dist = Math.hypot(markerCenterX - faceCenterX, markerCenterY - (faceBox.y + faceBox.height));
        if (dist < 120) {
          rawConfidence = Math.min(1, rawConfidence * 1.25);
        }
      }

      const confidence = Math.round(rawConfidence * 100) / 100;

      let markerBounds: BoundingBox | undefined;
      if (stat.maxX > stat.minX && stat.maxY > stat.minY) {
        markerBounds = {
          x: stat.minX,
          y: stat.minY,
          width: stat.maxX - stat.minX,
          height: stat.maxY - stat.minY,
        };
      }

      return {
        teamCode: code,
        teamId: team.id,
        teamName: team.name,
        confidence,
        pixelCount: stat.count,
        markerBounds,
      };
    });
  }

  private createEmptyMetrics(): SmileGestureMetrics {
    return {
      faceDetected: false,
      faceBox: null,
      mouthBox: null,
      mouthWidth: 0,
      mouthHeight: 0,
      mouthWidthRatio: 0,
      mouthAspectRatio: 0,
      lipCornerElevation: 0,
      teethBrightness: 0,
      baselineDelta: 0,
      smileGestureScore: 0,
      detectionMethod: 'CANVAS_GEOMETRY',
    };
  }
}
