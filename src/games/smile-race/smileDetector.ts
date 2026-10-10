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
 * Biological Human Skin Detector in YCbCr & Normalized RGB space.
 * Human blood circulation gives skin a distinct hemoglobin/melanin chromaticity.
 * Rejects:
 * - Wooden desks, tables, doors, flooring, corkboards (which lack human Cr flush or have high yellow/Cb)
 * - White/gray ceiling panels, walls, and fluorescent glare
 * - Deep dark shadows, cloth garments
 */
export function isSkinTone(r: number, g: number, b: number): boolean {
  // Reject extreme highlights and deep shadows
  if (r < 55 || g < 38 || b < 22 || (r > 248 && g > 248 && b > 238)) {
    return false;
  }
  // Reject neutral gray / black / white (r ~ g ~ b)
  if (Math.abs(r - g) < 8 && Math.abs(g - b) < 8) {
    return false;
  }

  // Red component must be distinctly dominant over Green, and Green >= Blue
  if (r <= g + 9 || r <= b + 15) {
    return false;
  }

  // Standard ITU-R BT.601 YCbCr representation
  const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

  // Genuine human skin cluster in YCbCr:
  // Cr is elevated (134 to 175) due to capillary hemoglobin
  // Cb is tightly bounded (80 to 127)
  // Cr - Cb >= 10
  if (Cr >= 134 && Cr <= 175 && Cb >= 78 && Cb <= 127 && (Cr - Cb) >= 12) {
    const total = r + g + b;
    const rNorm = r / total;
    const gNorm = g / total;
    if (rNorm >= 0.36 && rNorm <= 0.60 && gNorm >= 0.25 && gNorm <= 0.38) {
      const hsv = rgbToHsv(r, g, b);
      if (hsv.s >= 16 && hsv.s <= 76 && (hsv.h <= 42 || hsv.h >= 342)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Strict Facial Anatomy & Viola-Jones Invariant Verifier.
 * Every human face has a definitive anatomical geometry:
 * - Two bilateral dark eye cavities & eyebrows (Left & Right eyes)
 * - A central elevated nose bridge between the eyes that is significantly brighter than the eye cavities
 * - A lighter forehead above and cheeks below
 * - Bilateral symmetry between left and right eyes
 * 
 * Empty rooms, wooden tables, chairs, painted walls, books, or doors
 * COMPLETELY FAIL this test because they do NOT possess a pair of dark eye depressions
 * separated by a bright central nasal ridge.
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
  if (aspectRatio < 0.92 || aspectRatio > 1.75) {
    return false;
  }

  // Helper to compute average luminance in a relative sub-rectangle of the face
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

  // 1. Forehead region (upper 12%-25% of face, center 50% width)
  const foreheadLum = getSubRegionLum(0.25, 0.12, 0.50, 0.13);

  // 2. Left eye socket region (30%-46% height, 18%-40% width)
  const leftEyeLum = getSubRegionLum(0.18, 0.30, 0.22, 0.16);

  // 3. Right eye socket region (30%-46% height, 60%-82% width)
  const rightEyeLum = getSubRegionLum(0.60, 0.30, 0.22, 0.16);

  // 4. Central nose bridge between the two eyes (30%-46% height, 42%-58% width)
  const noseBridgeLum = getSubRegionLum(0.42, 0.30, 0.16, 0.16);

  // 5. Upper cheeks region (50%-64% height, 22%-78% width)
  const cheeksLum = getSubRegionLum(0.22, 0.50, 0.56, 0.14);

  // Anatomical requirement 1: Eye sockets are darker than forehead OR cheeks
  const leftEyeDark = Math.max(foreheadLum - leftEyeLum, cheeksLum - leftEyeLum);
  const rightEyeDark = Math.max(foreheadLum - rightEyeLum, cheeksLum - rightEyeLum);

  // Anatomical requirement 2: The nose bridge between the eyes is elevated and brighter than the two eyes
  const avgEyeLum = (leftEyeLum + rightEyeLum) / 2;
  const bridgeElevation = noseBridgeLum - avgEyeLum;

  // Anatomical requirement 3: Bilateral eye balance (eyes are roughly symmetric, unlike diagonal room shadows)
  const eyeImbalance = Math.abs(leftEyeLum - rightEyeLum);

  // A genuine face MUST satisfy eye contrast and bridge elevation!
  // On a flat desk, wall, or wooden surface, eyes and nose bridge have flat contrast (leftEyeDark < 4, bridgeElevation < 2.5).
  if (leftEyeDark < 4.0 || rightEyeDark < 4.0) {
    return false;
  }

  if (bridgeElevation < 2.5) {
    return false;
  }

  if (eyeImbalance > 38) {
    // Massive asymmetric shadow, not a clear face
    return false;
  }

  return true;
}

/**
 * Scan a specific region of the image for a connected face cluster.
 * Rejects empty space, scattered lights, furniture, desks, and walls.
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
  const cellW = 6;
  const cellH = 6;
  const cols = Math.floor(zoneW / cellW);
  const rows = Math.floor(zoneH / cellH);
  if (cols < 4 || rows < 4) return null;

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

  // If even the densest cell has fewer than 4 skin pixels (out of 9 sampled per cell),
  // there is no face in this room!
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
  // At least 10 active cells and 80 skin pixels
  if (clusterCellCount < 10 || clusterSkinPixels < 80) {
    return null;
  }

  const rawW = (maxC - minC + 1) * cellW;
  const rawH = (maxR - minR + 1) * cellH;

  // Minimum physical face dimensions (at least 28x32 pixels in webcam frame)
  if (rawW < 28 || rawH < 32) {
    return null;
  }

  // Rejection of massive background wall or table:
  // If the cluster spans > 88% of the zone width and touches both borders, it is a desk or wall!
  if (rawW > zoneW * 0.88 && minC === 0 && maxC >= cols - 1) {
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

    // Draw frame flipped horizontally so screen left corresponds to canvas left (x: 0)
    this.processingCtx.save();
    this.processingCtx.translate(width, 0);
    this.processingCtx.scale(-1, 1);
    this.processingCtx.drawImage(video, 0, 0, width, height);
    this.processingCtx.restore();

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
   * High-Precision Mouth Geometry & Adaptive Smile Analysis:
   * 1. Horizontal mouth width span (expands significantly during smile from ~0.38 to ~0.52+ of face width)
   * 2. Upward elevation of lip corners relative to center (zygomaticus pull)
   * 3. Visible teeth brightness and oral cavity contrast
   * 4. Vertical opening / height ratio
   * 5. Relative delta vs neutral baseline (if available)
   */
  private calculateMetricsFromMouthROI(
    faceBox: BoundingBox,
    imageData: ImageData,
    canvasW: number,
    canvasH: number,
    method: 'NATIVE_LANDMARKS' | 'CANVAS_GEOMETRY'
  ): SmileGestureMetrics {
    const data = imageData.data;

    // Anatomically positioned mouth search region (lower 60% to 88% of face)
    const mouthROIWidth = Math.round(faceBox.width * 0.62);
    const mouthROIHeight = Math.round(faceBox.height * 0.28);
    const mouthROIX = Math.round(faceBox.x + (faceBox.width - mouthROIWidth) / 2);
    const mouthROIY = Math.round(faceBox.y + faceBox.height * 0.62);

    const mouthBox: BoundingBox = {
      x: Math.max(0, Math.min(canvasW - 20, mouthROIX)),
      y: Math.max(0, Math.min(canvasH - 20, mouthROIY)),
      width: Math.max(16, Math.min(canvasW - mouthROIX, mouthROIWidth)),
      height: Math.max(12, Math.min(canvasH - mouthROIY, mouthROIHeight)),
    };

    const startX = mouthBox.x;
    const endX = mouthBox.x + mouthBox.width;
    const startY = mouthBox.y;
    const endY = mouthBox.y + mouthBox.height;

    // 1. Sample upper cheek skin luminance (for adaptive lip & teeth thresholding)
    let cheekLumSum = 0;
    let cheekCount = 0;
    const cheekY = Math.max(0, Math.floor(faceBox.y + faceBox.height * 0.48));
    for (
      let cx = Math.max(0, Math.floor(faceBox.x + faceBox.width * 0.22));
      cx < Math.min(canvasW, Math.floor(faceBox.x + faceBox.width * 0.78));
      cx += 3
    ) {
      const idx = (cheekY * canvasW + cx) * 4;
      cheekLumSum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      cheekCount++;
    }
    const avgCheekLum = cheekCount > 0 ? cheekLumSum / cheekCount : 120;

    // Track mouth features:
    // Count feature pixels per horizontal column to prevent isolated chin/neck pixels from falsely stretching width
    const colFeatureCounts = new Uint16Array(endX - startX + 1);

    let teethPixels = 0;
    let cavityPixels = 0;
    let lipPixels = 0;

    // Lip corner tracking
    let leftCornerYSum = 0;
    let leftCornerCount = 0;
    let rightCornerYSum = 0;
    let rightCornerCount = 0;
    let mouthCenterYSum = 0;
    let mouthCenterCount = 0;

    const leftBoundaryX = startX + mouthBox.width * 0.28;
    const rightBoundaryX = startX + mouthBox.width * 0.72;
    const centerMidX = startX + mouthBox.width * 0.50;

    for (let y = startY; y < endY; y += 2) {
      for (let x = startX; x < endX; x += 2) {
        const idx = (y * canvasW + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const sat = Math.max(r, g, b) - Math.min(r, g, b);

        // A. Teeth pixels: Lighter than lips/cheeks, low color saturation (white/ivory)
        const isTeeth =
          (lum >= 112 && sat <= 34 && lum >= avgCheekLum * 0.92) ||
          (lum >= 135 && sat <= 40);

        // B. Open oral cavity (interior mouth opening during laugh/wide smile)
        const isCavity = lum <= 54 && lum <= avgCheekLum * 0.54;

        // C. Lip vermilion contour:
        // Must show distinct redness over green/blue AND be slightly darker than upper cheek flush
        const isLip =
          (r >= g + 22 && r >= b + 24 && r >= 65 && lum <= avgCheekLum * 0.98) ||
          ((r - g) / Math.max(1, r + g) >= 0.22 && lum <= avgCheekLum * 0.95);

        if (isTeeth) teethPixels++;
        if (isCavity) cavityPixels++;
        if (isLip) lipPixels++;

        if (isTeeth || isCavity || isLip) {
          const colIdx = x - startX;
          if (colIdx >= 0 && colIdx < colFeatureCounts.length) {
            colFeatureCounts[colIdx]++;
          }

          // Corner vs Center height tracking
          if (x <= leftBoundaryX) {
            leftCornerYSum += y;
            leftCornerCount++;
          } else if (x >= rightBoundaryX) {
            rightCornerYSum += y;
            rightCornerCount++;
          } else if (Math.abs(x - centerMidX) <= mouthBox.width * 0.18) {
            mouthCenterYSum += y;
            mouthCenterCount++;
          }
        }
      }
    }

    // Measure active mouth span using column density (requires at least 2 pixels per column)
    let minActiveX = -1;
    let maxActiveX = -1;
    for (let c = 0; c < colFeatureCounts.length; c++) {
      if (colFeatureCounts[c] >= 2) {
        if (minActiveX === -1) minActiveX = startX + c;
        maxActiveX = startX + c;
      }
    }

    let detectedMouthW = faceBox.width * 0.36; // Default to neutral resting mouth width
    if (minActiveX !== -1 && maxActiveX > minActiveX && (teethPixels + cavityPixels + lipPixels) >= 8) {
      detectedMouthW = maxActiveX - minActiveX;
    }
    // Clamp to realistic anatomical range: 30% to 62% of face width
    detectedMouthW = Math.min(faceBox.width * 0.62, Math.max(faceBox.width * 0.30, detectedMouthW));
    const detectedMouthH = Math.max(10, mouthBox.height * 0.45);

    const mouthWidthRatio = detectedMouthW / Math.max(1, faceBox.width);
    const mouthHeightRatio = detectedMouthH / Math.max(1, faceBox.height);
    const mouthAspectRatio = detectedMouthW / Math.max(1, detectedMouthH);

    // Corner elevation: When smiling, lip corners are pulled UPWARD (smaller Y in screen space)
    // compared to the mouth center bottom
    const leftCornerY = leftCornerCount > 0 ? leftCornerYSum / leftCornerCount : mouthBox.y + mouthBox.height * 0.52;
    const rightCornerY = rightCornerCount > 0 ? rightCornerYSum / rightCornerCount : mouthBox.y + mouthBox.height * 0.52;
    const avgCornersY = (leftCornerY + rightCornerY) / 2;
    const mouthCenterY = mouthCenterCount > 0 ? mouthCenterYSum / mouthCenterCount : mouthBox.y + mouthBox.height * 0.50;

    // Corner elevation factor: positive ONLY when corners are pulled higher than mouth center
    const cornerElevation = (mouthCenterY - avgCornersY) / Math.max(1, detectedMouthH);

    // Sample area ratio of teeth and open oral cavity
    const totalMouthSamples = Math.max(1, (mouthBox.width * mouthBox.height) / 4);
    const teethRatio = teethPixels / totalMouthSamples;
    const cavityRatio = cavityPixels / totalMouthSamples;
    const teethOrCavityRatio = (teethPixels + cavityPixels) / totalMouthSamples;

    // Baseline delta comparison if available
    let baselineDelta = 0;
    if (this.neutralBaseline && this.neutralBaseline.mouthWidthRatio > 0) {
      baselineDelta = (mouthWidthRatio - this.neutralBaseline.mouthWidthRatio) / this.neutralBaseline.mouthWidthRatio;
    }

    // --- ACCURATE COMPONENT SCORING ---
    // 1. Width score:
    // Resting mouth width ratio is typically 0.34 - 0.40.
    // Smiling mouth stretches to 0.46 - 0.58+.
    const widthScore = Math.min(1, Math.max(0, (mouthWidthRatio - 0.40) / 0.12));

    // 2. Corner lift score:
    // Resting corner elevation is <= 0.02.
    // Genuine smiling corner lift is 0.05 to 0.20+.
    const cornerScore = Math.min(1, Math.max(0, (cornerElevation - 0.04) / 0.11));

    // 3. Teeth / Cavity score:
    // Open smile / laugh with visible teeth:
    const teethScore = Math.min(1, Math.max(0, (teethOrCavityRatio - 0.032) / 0.10));

    // 4. Vertical opening score:
    const heightScore = Math.min(1, Math.max(0, (mouthHeightRatio - 0.09) / 0.12));

    // 5. Baseline dynamic delta bonus:
    const baselineBonus = baselineDelta > 0.08 ? Math.min(1, (baselineDelta - 0.08) / 0.15) : 0;

    let compositeScore = 0;

    // CRITICAL: A human cannot smile without either:
    // (a) Showing teeth or open laughter cavity (teethScore >= 0.20), OR
    // (b) Distinctly lifting the lip corners upward (cornerScore >= 0.25).
    // If BOTH are absent, this is a NEUTRAL/RESTING face -> cap score at <= 0.18!
    if (teethScore < 0.20 && cornerScore < 0.25) {
      // Neutral resting face: strictly low score
      compositeScore = Math.min(0.18, widthScore * 0.15);
    } else if (teethScore >= 0.20) {
      // Open smile with visible teeth / laughter
      compositeScore = teethScore * 0.44 + widthScore * 0.36 + cornerScore * 0.20;
    } else {
      // Closed grin: corners pulled distinctly upward + lateral stretch
      compositeScore = cornerScore * 0.55 + widthScore * 0.45;
    }

    // Incorporate baseline bonus if student broke into smile from calibrated neutral state
    if (baselineBonus > 0 && compositeScore > 0.25) {
      compositeScore = compositeScore * 0.70 + baselineBonus * 0.30;
    }

    const smileGestureScore = Math.round(Math.min(1, Math.max(0, compositeScore)) * 100) / 100;

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
    smileThreshold: number = 0.50
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

      // 2. Pure Canvas Face Cluster Detection & Anatomical Viola-Jones Verification
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

      // Real human face is confirmed! Analyze mouth and smile:
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
  /**
   * Render a specific team's camera booth/room onto their dedicated canvas.
   * STRICTLY PRESERVES 1:1 pixel aspect ratio (no stretching or squashing faces).
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
    if (cw === 0 || ch === 0) return;

    // Clear canvas
    ctx.clearRect(0, 0, cw, ch);

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;

    // Raw video horizontal boundaries corresponding to this zone (mirrored mapping)
    const rawZoneX = Math.max(0, (1 - zone.normX - zone.normWidth) * vw);
    const rawZoneY = Math.max(0, zone.normY * vh);
    const rawZoneW = Math.min(vw - rawZoneX, zone.normWidth * vw);
    const rawZoneH = Math.min(vh - rawZoneY, zone.normHeight * vh);

    if (rawZoneW <= 0 || rawZoneH <= 0) return;

    // Calculate aspect ratios
    const targetAspect = cw / ch;
    const zoneAspect = rawZoneW / rawZoneH;

    // Aspect-ratio preserving crop inside the zone (TRUE object-cover: 100% distortion-free)
    let cropSx = rawZoneX;
    let cropSy = rawZoneY;
    let cropSw = rawZoneW;
    let cropSh = rawZoneH;

    if (zoneAspect < targetAspect) {
      // Zone is taller than target canvas (e.g. 2:3 vertical zone into 4:3 canvas)
      // Fit width, crop excess height with bias towards upper portion (human face area)
      cropSw = rawZoneW;
      cropSh = rawZoneW / targetAspect;
      const excessH = rawZoneH - cropSh;
      cropSy = rawZoneY + Math.max(0, Math.min(excessH, excessH * 0.18));
      cropSx = rawZoneX;
    } else {
      // Zone is wider than target canvas
      // Fit height, crop excess width centered
      cropSh = rawZoneH;
      cropSw = rawZoneH * targetAspect;
      const excessW = rawZoneW - cropSw;
      cropSx = rawZoneX + Math.max(0, excessW / 2);
      cropSy = rawZoneY;
    }

    // Draw the cropped video region onto target canvas (mirrored horizontally)
    ctx.save();
    ctx.translate(cw, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, cropSx, cropSy, cropSw, cropSh, 0, 0, cw, ch);
    ctx.restore();

    // Draw Face and Mouth HUD ONLY if a real human face is verified in this room!
    if (analysis && analysis.metrics.faceDetected && analysis.metrics.faceBox) {
      const fb = analysis.metrics.faceBox;
      const pw = this.processingCanvas.width;
      const ph = this.processingCanvas.height;

      // In mirrored coordinate space:
      const cropMirroredX = vw - (cropSx + cropSw);
      const cropNormX = cropMirroredX / vw;
      const cropNormY = cropSy / vh;
      const cropNormW = cropSw / vw;
      const cropNormH = cropSh / vh;

      const normFaceX = fb.x / pw;
      const normFaceY = fb.y / ph;
      const normFaceW = fb.width / pw;
      const normFaceH = fb.height / ph;

      const relX = (normFaceX - cropNormX) / cropNormW;
      const relY = (normFaceY - cropNormY) / cropNormH;
      const relW = normFaceW / cropNormW;
      const relH = normFaceH / cropNormH;

      const boxX = Math.max(4, Math.min(cw - 20, relX * cw));
      const boxY = Math.max(4, Math.min(ch - 20, relY * ch));
      const boxW = Math.max(20, Math.min(cw - boxX - 4, relW * cw));
      const boxH = Math.max(20, Math.min(ch - boxY - 4, relH * ch));

      ctx.save();
      const isSmiling = analysis.isSmiling;

      // Rounded Face Box
      ctx.lineWidth = isSmiling ? 3.5 : 2;
      ctx.strokeStyle = isSmiling ? '#fbbf24' : (zone.color || '#38bdf8');
      if (isSmiling) {
        ctx.shadowColor = 'rgba(251, 191, 36, 0.8)';
        ctx.shadowBlur = 10;
      }
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // HUD corner accents
      const cornerLen = Math.min(16, boxW * 0.25);
      ctx.lineWidth = 4;
      ctx.strokeStyle = isSmiling ? '#f59e0b' : '#38bdf8';
      // Top-left
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + cornerLen);
      ctx.lineTo(boxX, boxY);
      ctx.lineTo(boxX + cornerLen, boxY);
      ctx.stroke();
      // Top-right
      ctx.beginPath();
      ctx.moveTo(boxX + boxW - cornerLen, boxY);
      ctx.lineTo(boxX + boxW, boxY);
      ctx.lineTo(boxX + boxW, boxY + cornerLen);
      ctx.stroke();
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + boxH - cornerLen);
      ctx.lineTo(boxX, boxY + boxH);
      ctx.lineTo(boxX + cornerLen, boxY + boxH);
      ctx.stroke();
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(boxX + boxW - cornerLen, boxY + boxH);
      ctx.lineTo(boxX + boxW, boxY + boxH);
      ctx.lineTo(boxX + boxW, boxY + boxH - cornerLen);
      ctx.stroke();

      // Mouth indicator
      if (analysis.metrics.mouthBox) {
        const mb = analysis.metrics.mouthBox;
        const mNormX = mb.x / pw;
        const mNormY = mb.y / ph;
        const mNormW = mb.width / pw;
        const mNormH = mb.height / ph;

        const mBoxX = Math.max(2, ((mNormX - cropNormX) / cropNormW) * cw);
        const mBoxY = Math.max(2, ((mNormY - cropNormY) / cropNormH) * ch);
        const mBoxW = Math.max(10, (mNormW / cropNormW) * cw);
        const mBoxH = Math.max(6, (mNormH / cropNormH) * ch);

        ctx.shadowBlur = 0;
        ctx.strokeStyle = isSmiling ? '#f59e0b' : '#f43f5e';
        ctx.lineWidth = 2;
        ctx.strokeRect(mBoxX, mBoxY, mBoxW, mBoxH);
      }

      // Small Badge above face
      if (isSmiling) {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        const badgeY = Math.max(16, boxY - 8);
        ctx.roundRect(boxX, badgeY - 14, Math.min(100, boxW), 16, 4);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`😁 CƯỜI ${Math.round(analysis.smileScore * 100)}%`, boxX + 4, badgeY - 2);
      }

      ctx.restore();
    }

    // Winner effect or Locked overlay
    if (isWinner) {
      ctx.save();
      ctx.fillStyle = 'rgba(251, 191, 36, 0.28)';
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();
    } else if (isLocked) {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
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
