/**
 * SMILE RACE - Pure Computer Vision Gesture Detector
 * 
 * Compliant with requirements:
 * - Local browser processing ONLY.
 * - DOES NOT infer emotions or psychological states.
 * - Detects facial/mouth geometry gestures (mouth width, aspect ratio, corner curvature, teeth presence) to serve gameplay.
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

/**
 * Robust Skin pixel detector for face localization.
 * Checks normalized chromaticity and HSV color space to reject:
 * - White/grey ceiling lights and painted walls (r ~ g ~ b)
 * - Deep dark shadows (low intensity)
 * - Pure saturated non-skin surfaces
 */
export function isSkinTone(r: number, g: number, b: number): boolean {
  // Reject neutral white / grey / ceiling light panels (r ~ g ~ b)
  if (Math.abs(r - g) < 9 && Math.abs(g - b) < 9) {
    return false;
  }
  // Reject dark shadows and oversaturated ceiling lights
  if (r < 55 || g < 35 || b < 25 || (r > 245 && g > 235 && b > 220)) {
    return false;
  }
  // Human skin: Red must be clearly dominant over Green, and Green >= Blue
  if (r > g + 7 && r > b + 10) {
    const total = r + g + b;
    const rNorm = r / total;
    const gNorm = g / total;
    // Normalized color coordinates for human skin across diverse complexions
    if (rNorm >= 0.35 && rNorm <= 0.62 && gNorm >= 0.24 && gNorm <= 0.39) {
      const hsv = rgbToHsv(r, g, b);
      if (hsv.s >= 14 && hsv.s <= 78 && (hsv.h <= 45 || hsv.h >= 340)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Facial Structure & Anatomy Contrast Verifier:
 * Validates that candidate bounding box actually contains facial anatomy
 * (dark eye sockets relative to forehead/cheeks, lighter nose bridge between them),
 * rather than a flat wooden desk, chair, door, or wall.
 */
function verifyFaceFeatures(
  faceBox: BoundingBox,
  data: Uint8ClampedArray,
  canvasW: number,
  canvasH: number
): boolean {
  const { x, y, width: w, height: h } = faceBox;

  // Aspect ratio check: Human head is roughly 0.95 to 1.70 times taller than wide
  const aspectRatio = h / Math.max(1, w);
  if (aspectRatio < 0.90 || aspectRatio > 1.75) {
    return false;
  }

  // Helper to compute average luminance in a sub-rectangle of the face
  const getSubRegionLum = (relX: number, relY: number, relW: number, relH: number): number => {
    const startX = Math.max(0, Math.floor(x + w * relX));
    const endX = Math.min(canvasW, Math.ceil(x + w * (relX + relW)));
    const startY = Math.max(0, Math.floor(y + h * relY));
    const endY = Math.min(canvasH, Math.ceil(y + h * (relY + relH)));

    let sum = 0;
    let count = 0;
    for (let py = startY; py < endY; py += 2) {
      for (let px = startX; px < endX; px += 2) {
        const idx = (py * canvasW + px) * 4;
        sum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        count++;
      }
    }
    return count > 0 ? sum / count : 128;
  };

  // 1. Forehead region (upper 14%-26% of face, center 50% width)
  const foreheadLum = getSubRegionLum(0.25, 0.14, 0.50, 0.12);

  // 2. Left eye region (32%-46% height, 18%-42% width)
  const leftEyeLum = getSubRegionLum(0.18, 0.32, 0.24, 0.14);

  // 3. Right eye region (32%-46% height, 58%-82% width)
  const rightEyeLum = getSubRegionLum(0.58, 0.32, 0.24, 0.14);

  // 4. Nose bridge between eyes (32%-46% height, 43%-57% width)
  const noseBridgeLum = getSubRegionLum(0.43, 0.32, 0.14, 0.14);

  // 5. Cheeks (48%-62% height, 22%-78% width)
  const cheeksLum = getSubRegionLum(0.22, 0.50, 0.56, 0.12);

  // Eye sockets & brows make eye regions darker than forehead or cheeks
  const leftEyeContrast = Math.max(foreheadLum - leftEyeLum, cheeksLum - leftEyeLum);
  const rightEyeContrast = Math.max(foreheadLum - rightEyeLum, cheeksLum - rightEyeLum);
  const avgEyeContrast = (leftEyeContrast + rightEyeContrast) / 2;

  // Nose bridge between the eyes is elevated and brighter than the two eye sockets
  const bridgeRise = noseBridgeLum - (leftEyeLum + rightEyeLum) / 2;

  // Internal feature variance test across face zones
  const lums = [foreheadLum, leftEyeLum, rightEyeLum, noseBridgeLum, cheeksLum];
  const avgLum = lums.reduce((s, v) => s + v, 0) / lums.length;
  const variance = lums.reduce((s, v) => s + Math.abs(v - avgLum), 0) / lums.length;

  // On a flat wooden table, blank door, or painted wall:
  // forehead, eye regions, and cheeks have virtually identical luminance (contrast < 4, variance < 3).
  // A real human face exhibits clear contrast valley (avgEyeContrast >= 5, or bridgeRise >= 2, or variance >= 5.5).
  if (avgEyeContrast < 4.5 && bridgeRise < 2.0 && variance < 4.5) {
    return false;
  }

  return true;
}

/**
 * Scan a specific region of the image for a connected face cluster.
 * Rejects empty space, scattered lights, furniture, and walls.
 */
function findFaceClusterInRegion(
  startX: number,
  endX: number,
  startY: number,
  endY: number,
  data: Uint8ClampedArray,
  canvasW: number,
  canvasH: number
): BoundingBox | null {
  const zoneW = endX - startX;
  const zoneH = endY - startY;
  const cellW = 8;
  const cellH = 8;
  const cols = Math.floor(zoneW / cellW);
  const rows = Math.floor(zoneH / cellH);
  if (cols < 3 || rows < 3) return null;

  const grid = new Int16Array(cols * rows);

  // Scan zone pixels with step 2
  for (let y = startY + 2; y < endY - 2; y += 2) {
    const rIdx = Math.floor((y - startY) / cellH);
    if (rIdx < 0 || rIdx >= rows) continue;
    for (let x = startX + 2; x < endX - 2; x += 2) {
      const cIdx = Math.floor((x - startX) / cellW);
      if (cIdx < 0 || cIdx >= cols) continue;
      const idx = (y * canvasW + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      if (isSkinTone(r, g, b)) {
        grid[rIdx * cols + cIdx]++;
      }
    }
  }

  // Find cell with maximum skin density (peak)
  let maxCellCount = 0;
  let peakR = -1;
  let peakC = -1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cnt = grid[r * cols + c];
      if (cnt > maxCellCount) {
        maxCellCount = cnt;
        peakR = r;
        peakC = c;
      }
    }
  }

  // If even the densest cell has fewer than 4 skin pixels (out of 16 sampled per cell),
  // there is no face here at all!
  if (maxCellCount < 4 || peakR === -1) {
    return null;
  }

  // Flood fill / expand from the peak cell to find the connected face cluster
  const visited = new Uint8Array(cols * rows);
  const queue: [number, number][] = [[peakR, peakC]];
  visited[peakR * cols + peakC] = 1;

  let minC = peakC, maxC = peakC;
  let minR = peakR, maxR = peakR;
  let clusterSkinPixels = 0;
  let clusterCellCount = 0;

  while (queue.length > 0) {
    const [cr, cc] = queue.shift()!;
    const cnt = grid[cr * cols + cc];
    clusterSkinPixels += cnt;
    clusterCellCount++;

    if (cc < minC) minC = cc;
    if (cc > maxC) maxC = cc;
    if (cr < minR) minR = cr;
    if (cr > maxR) maxR = cr;

    // 4-neighborhood
    const neighbors: [number, number][] = [
      [cr - 1, cc],
      [cr + 1, cc],
      [cr, cc - 1],
      [cr, cc + 1],
    ];

    for (const [nr, nc] of neighbors) {
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        const nIdx = nr * cols + nc;
        if (!visited[nIdx] && grid[nIdx] >= 3) {
          visited[nIdx] = 1;
          queue.push([nr, nc]);
        }
      }
    }
  }

  // A genuine face requires a solid compact cluster:
  // At least 9 active cells and 100 skin pixels
  if (clusterCellCount < 9 || clusterSkinPixels < 100) {
    return null;
  }

  const rawW = (maxC - minC + 1) * cellW;
  const rawH = (maxR - minR + 1) * cellH;

  // Minimum physical face dimensions (at least 30x36 pixels)
  if (rawW < 30 || rawH < 36) {
    return null;
  }

  // Truncate neck/chest if connected:
  // Human face height is roughly 1.15 to 1.35 * width
  const faceW = rawW;
  const faceH = Math.min(rawH, Math.round(faceW * 1.30));

  const faceBox: BoundingBox = {
    x: startX + minC * cellW,
    y: startY + minR * cellH,
    width: faceW,
    height: faceH,
  };

  // Perform Viola-Jones facial structure verification (rejects wood, walls, tables)
  if (!verifyFaceFeatures(faceBox, data, canvasW, canvasH)) {
    return null;
  }

  return faceBox;
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
        this.nativeFaceDetector = new FD({ fastMode: true, maxDetectedFaces: 4 });
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
   * Analyze webcam video frame for single calibration modal.
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
    const faceBox = findFaceClusterInRegion(0, width, 0, height, imageData.data, width, height);
    if (!faceBox) {
      return this.createEmptyMetrics();
    }

    return this.calculateMetricsFromMouthROI(faceBox, imageData, width, height, 'CANVAS_GEOMETRY');
  }

  /**
   * Process face using Chromium Native Landmarks if available.
   */
  private processNativeFace(face: any, canvasW: number, canvasH: number, imageData: ImageData): SmileGestureMetrics {
    const box = face.boundingBox;
    const faceBox: BoundingBox = {
      x: Math.max(0, box.x),
      y: Math.max(0, box.y),
      width: Math.min(canvasW - box.x, box.width),
      height: Math.min(canvasH - box.y, box.height),
    };

    return this.calculateMetricsFromMouthROI(faceBox, imageData, canvasW, canvasH, 'NATIVE_LANDMARKS');
  }

  /**
   * High-Precision Mouth Geometry & Smile Analysis:
   * 1. Teeth brightness & exposure (hallmark of open smile in competition!)
   * 2. Horizontal mouth width span (mouth stretches from ~0.38 to ~0.55+ of face width)
   * 3. Vertical mouth opening / cavity (expansion during smile/laughter)
   * 4. Upward elevation of lip corners relative to lower lip center
   */
  private calculateMetricsFromMouthROI(
    faceBox: BoundingBox,
    imageData: ImageData,
    canvasW: number,
    canvasH: number,
    method: 'NATIVE_LANDMARKS' | 'CANVAS_GEOMETRY'
  ): SmileGestureMetrics {
    const data = imageData.data;

    // Anatomically positioned mouth ROI (lower 60% to 86% of face)
    const mouthW = Math.round(faceBox.width * 0.58);
    const mouthH = Math.round(faceBox.height * 0.28);
    const mouthX = Math.round(faceBox.x + (faceBox.width - mouthW) / 2);
    const mouthY = Math.round(faceBox.y + faceBox.height * 0.62);

    const mouthBox: BoundingBox = {
      x: Math.max(0, mouthX),
      y: Math.max(0, mouthY),
      width: Math.min(canvasW - mouthX, mouthW),
      height: Math.min(canvasH - mouthY, mouthH),
    };

    let teethPixels = 0;
    let lipPixels = 0;
    let cavityPixels = 0;

    let minFeatureX = canvasW;
    let maxFeatureX = 0;
    let minFeatureY = canvasH;
    let maxFeatureY = 0;

    // Corner tracking
    let leftCornerYSum = 0;
    let leftCornerCount = 0;
    let rightCornerYSum = 0;
    let rightCornerCount = 0;
    let bottomCenterY = mouthBox.y + mouthBox.height / 2;

    const startX = mouthBox.x;
    const endX = mouthBox.x + mouthBox.width;
    const startY = mouthBox.y;
    const endY = mouthBox.y + mouthBox.height;

    const leftBoundaryX = mouthBox.x + mouthBox.width * 0.28;
    const rightBoundaryX = mouthBox.x + mouthBox.width * 0.72;
    const centerMidX = mouthBox.x + mouthBox.width * 0.50;

    for (let y = startY; y < endY; y += 2) {
      for (let x = startX; x < endX; x += 2) {
        const idx = (y * canvasW + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];

        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        const lipIntensity = (2 * r - g - b) / (r + g + 1);

        // 1. Bright teeth pixels (hallmark of smile!)
        const isTeeth = lum >= 115 && sat <= 42 && r >= 90 && g >= 85 && b >= 70;
        if (isTeeth) {
          teethPixels++;
        }

        // 2. Open oral cavity (shadow inside mouth during wide smile / laughter)
        const isCavity = lum <= 65 && r <= 80;
        if (isCavity) {
          cavityPixels++;
        }

        // 3. Natural lips contour
        const isLip = (lipIntensity >= 0.11 || (r > g + 14 && r > b + 16)) && r >= 55;
        if (isLip) {
          lipPixels++;
        }

        // Active mouth feature
        if (isTeeth || isCavity || isLip) {
          if (x < minFeatureX) minFeatureX = x;
          if (x > maxFeatureX) maxFeatureX = x;
          if (y < minFeatureY) minFeatureY = y;
          if (y > maxFeatureY) maxFeatureY = y;

          // Track left corner vs right corner
          if (x <= leftBoundaryX) {
            leftCornerYSum += y;
            leftCornerCount++;
          } else if (x >= rightBoundaryX) {
            rightCornerYSum += y;
            rightCornerCount++;
          }

          // Center lower lip
          if (Math.abs(x - centerMidX) < 10 && y > bottomCenterY) {
            bottomCenterY = y;
          }
        }
      }
    }

    // Compute detected mouth dimensions
    const detectedMouthW = (maxFeatureX > minFeatureX)
      ? (maxFeatureX - minFeatureX)
      : Math.round(mouthBox.width * 0.65);
    const detectedMouthH = (maxFeatureY > minFeatureY)
      ? (maxFeatureY - minFeatureY)
      : Math.round(mouthBox.height * 0.45);

    const mouthWidthRatio = Math.min(1, Math.max(0.15, detectedMouthW / Math.max(1, faceBox.width)));
    const mouthHeightRatio = Math.min(1, Math.max(0.05, detectedMouthH / Math.max(1, faceBox.height)));
    const mouthAspectRatio = detectedMouthW / Math.max(1, detectedMouthH);

    // Corner elevation: Lip corners elevate upward (smaller Y) during smile
    const leftCornerY = leftCornerCount > 0 ? leftCornerYSum / leftCornerCount : mouthBox.y + mouthBox.height * 0.5;
    const rightCornerY = rightCornerCount > 0 ? rightCornerYSum / rightCornerCount : mouthBox.y + mouthBox.height * 0.5;
    const avgCornersY = (leftCornerY + rightCornerY) / 2;
    const cornerElevation = Math.max(-0.2, (bottomCenterY - avgCornersY) / Math.max(1, detectedMouthH));

    // Teeth Ratio
    const roiSampleArea = (mouthBox.width * mouthBox.height) / 4;
    const teethRatio = teethPixels / Math.max(1, roiSampleArea);

    // Baseline delta comparison if available
    let baselineDelta = 0;
    if (this.neutralBaseline && this.neutralBaseline.mouthWidthRatio > 0) {
      baselineDelta = (mouthWidthRatio - this.neutralBaseline.mouthWidthRatio) / this.neutralBaseline.mouthWidthRatio;
    }

    // Factors:
    // 1. Teeth factor: strong positive signal (0.0 to 1.0)
    const teethFactor = Math.min(1, teethRatio * 3.8);

    // 2. Width factor: resting is ~0.38-0.42, smiling stretches to 0.48-0.65
    const widthFactor = Math.min(1, Math.max(0, (mouthWidthRatio - 0.40) / 0.16));

    // 3. Opening/height factor: open smile is 0.14-0.25 of face height
    const heightFactor = Math.min(1, Math.max(0, (mouthHeightRatio - 0.08) / 0.14));

    // 4. Corner elevation factor: corners curve upward
    const cornerFactor = Math.min(1, Math.max(0, (cornerElevation - 0.08) / 0.22));

    // 5. Baseline factor:
    const baselineFactor = baselineDelta > 0 ? Math.min(1, baselineDelta * 3.2) : 0;

    let score = 0;
    if (teethFactor >= 0.20) {
      // Open smile with visible teeth: primary classroom gesture!
      score = teethFactor * 0.46 + widthFactor * 0.32 + heightFactor * 0.14 + cornerFactor * 0.08;
    } else {
      // Broad closed-mouth smile: wide stretch + upward corners
      score = widthFactor * 0.52 + cornerFactor * 0.36 + heightFactor * 0.12;
    }

    if (this.neutralBaseline && this.neutralBaseline.sampleCount >= 2) {
      score = score * 0.70 + baselineFactor * 0.30;
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
   * Analyzes each team room's zone independently in real-time.
   * Completely rejects empty rooms and locks mouth directly on lips.
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

    // Check Native Chromium Face Detector if available
    let nativeFaces: any[] = [];
    if (this.isNativeDetectorAvailable && this.nativeFaceDetector) {
      try {
        nativeFaces = await this.nativeFaceDetector.detect(this.processingCanvas);
      } catch {
        nativeFaces = [];
      }
    }

    return zones.map((zone) => {
      const startX = Math.max(0, Math.floor(zone.normX * width));
      const endX = Math.min(width, Math.ceil((zone.normX + zone.normWidth) * width));
      const startY = Math.max(0, Math.floor(zone.normY * height));
      const endY = Math.min(height, Math.ceil((zone.normY + zone.normHeight) * height));

      // 1. If native face detector found a face inside this zone
      if (nativeFaces && nativeFaces.length > 0) {
        const zoneFace = nativeFaces.find((f: any) => {
          const cx = f.boundingBox.x + f.boundingBox.width / 2;
          const cy = f.boundingBox.y + f.boundingBox.height / 2;
          return cx >= startX && cx <= endX && cy >= startY && cy <= endY;
        });

        if (zoneFace) {
          const metrics = this.processNativeFace(zoneFace, width, height, imageData);
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
            markerConfidence: 1.0,
          };
        }
      }

      // 2. Pure Canvas Face Cluster Detection & Anatomical Verification
      const faceBox = findFaceClusterInRegion(startX, endX, startY, endY, data, width, height);

      // If no valid face is present in this room:
      if (!faceBox) {
        return {
          teamId: zone.teamId,
          teamCode: zone.teamCode,
          teamName: zone.teamName,
          color: zone.color,
          zone,
          metrics: this.createEmptyMetrics(),
          isSmiling: false,
          smileScore: 0,
          markerConfidence: 0,
        };
      }

      // Real face is confirmed! Analyze mouth and smile:
      const metrics = this.calculateMetricsFromMouthROI(faceBox, imageData, width, height, 'CANVAS_GEOMETRY');
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
        markerConfidence: 1.0,
      };
    });
  }

  /**
   * Render a specific team's camera booth/room onto their dedicated canvas.
   * Mirrors the video horizontally so participants see their own motion naturally.
   */
  public renderZoneToCanvas(
    video: HTMLVideoElement,
    zone: TeamZone,
    targetCanvas: HTMLCanvasElement,
    analysis?: TeamZoneAnalysis,
    isWinner?: boolean,
    isLocked?: boolean
  ): void {
    if (!video || video.readyState < 2 || !targetCanvas) return;
    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    const cw = targetCanvas.width;
    const ch = targetCanvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, cw, ch);

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;

    // Mirrored coordinates mapping:
    const sx = Math.max(0, (1 - zone.normX - zone.normWidth) * vw);
    const sy = Math.max(0, zone.normY * vh);
    const sw = Math.min(vw - sx, zone.normWidth * vw);
    const sh = Math.min(vh - sy, zone.normHeight * vh);

    ctx.save();
    // Mirror horizontally so the participant feels like they are in a mirror
    ctx.translate(cw, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
    ctx.restore();

    // Draw Face and Mouth HUD ONLY if a real face is verified in this room!
    if (analysis && analysis.metrics.faceDetected && analysis.metrics.faceBox) {
      const fb = analysis.metrics.faceBox;
      const zonePixelW = zone.normWidth * this.processingCanvas.width;
      const zonePixelH = zone.normHeight * this.processingCanvas.height;
      const zonePixelX = zone.normX * this.processingCanvas.width;
      const zonePixelY = zone.normY * this.processingCanvas.height;

      const relX = Math.max(0, (fb.x - zonePixelX) / zonePixelW);
      const relY = Math.max(0, (fb.y - zonePixelY) / zonePixelH);
      const relW = Math.max(0.1, Math.min(1, fb.width / zonePixelW));
      const relH = Math.max(0.1, Math.min(1, fb.height / zonePixelH));

      const boxX = relX * cw;
      const boxY = relY * ch;
      const boxW = relW * cw;
      const boxH = relH * ch;

      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = analysis.isSmiling ? '#fbbf24' : (zone.color || '#38bdf8');
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // Mouth indicator
      if (analysis.metrics.mouthBox) {
        const mb = analysis.metrics.mouthBox;
        const mRelX = Math.max(0, (mb.x - zonePixelX) / zonePixelW);
        const mRelY = Math.max(0, (mb.y - zonePixelY) / zonePixelH);
        const mRelW = mb.width / zonePixelW;
        const mRelH = mb.height / zonePixelH;

        ctx.strokeStyle = analysis.isSmiling ? '#f59e0b' : '#ec4899';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(mRelX * cw, mRelY * ch, mRelW * cw, mRelH * ch);
      }
      ctx.restore();
    }

    // Winner effect or Locked overlay
    if (isWinner) {
      ctx.save();
      ctx.fillStyle = 'rgba(251, 191, 36, 0.22)';
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();
    } else if (isLocked) {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.60)';
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();
    }
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

    return teams.map((team, index) => {
      const code = team.teamCode || `TEAM${index + 1}`;
      const stat = counts[code] || { count: 0, minX: 0, maxX: 0, minY: 0, maxY: 0 };

      let rawConfidence = Math.min(1, stat.count / 28);

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
