import { GameSettings, DetectionResult, TeamId } from '../types';

export interface HSV {
  h: number; // 0 - 360
  s: number; // 0 - 100
  v: number; // 0 - 100
}

export function rgbToHsv(r: number, g: number, b: number): HSV {
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
 * Strict Human Skin Tone & Room Warmth filter.
 * Skin pixels have lower saturation (S < 38%), moderate blue presence, and balanced warmth.
 */
export function isSkinPixel(r: number, g: number, b: number, hsv: HSV): boolean {
  if (r > 60 && g > 35 && b > 20) {
    // Normal skin tones
    if (r > g && g >= b) {
      if (hsv.s < 38) {
        return true;
      }
      if (b > 45 && r / Math.max(1, b) < 1.9) {
        return true;
      }
    }
  }
  return false;
}

/**
 * High-Precision Blue Card / Marker Detector
 * Physical blue cards (paper, plastic, felt) exhibit strong cyan-blue hue,
 * high saturation, and intense Blue dominance over Red and Green.
 */
export function isBlueMarker(hsv: HSV, r: number, g: number, b: number, settings: GameSettings): boolean {
  // Hue range for Blue (175° - 265°)
  const isHueInRange = hsv.h >= settings.blueHueMin && hsv.h <= settings.blueHueMax;
  
  // Real blue cards have high saturation (>= 35%) and sufficient brightness (>= 25%)
  const hasVividSat = hsv.s >= 35;
  const hasMinVal = hsv.v >= 25 && hsv.v <= 100;

  // Strict RGB Dominance: Blue must clearly exceed Red and Green
  const isRgbBlueDominant = b >= 60 && b > r * 1.35 && b > g * 1.1;

  if (isHueInRange && hasVividSat && hasMinVal && isRgbBlueDominant) {
    return true;
  }

  // Strong saturated blue fallback
  if (isHueInRange && hsv.s >= 50 && hsv.v >= 30 && b > r * 1.4) {
    return true;
  }

  return false;
}

/**
 * High-Precision Orange Card / Marker Detector
 * Physical orange cards/paper exhibit intense Red, medium Green, minimal Blue,
 * and high saturation (S >= 42%). Skin is strictly excluded.
 */
export function isOrangeMarker(hsv: HSV, r: number, g: number, b: number, settings: GameSettings): boolean {
  // 1. Immediately reject human skin
  if (isSkinPixel(r, g, b, hsv)) {
    return false;
  }

  // 2. Hue range for real Orange (10° - 42° or wrap 355° - 360°)
  const isHueInRange =
    (hsv.h >= settings.orangeHueMin && hsv.h <= settings.orangeHueMax) ||
    (hsv.h >= 355 && hsv.h <= 360);

  // High saturation and brightness
  const hasVividSat = hsv.s >= 42;
  const hasMinVal = hsv.v >= 38 && hsv.v <= 100;

  // Strict RGB Dominance: R >> B (at least 2.0x) and R > G
  const isRgbOrangeDominant = r >= 110 && r > b * 2.0 && r >= g * 1.15 && g > b * 1.1;

  if (isHueInRange && hasVividSat && hasMinVal && isRgbOrangeDominant) {
    return true;
  }

  // Fluorescent orange card fallback
  if (isHueInRange && hsv.s >= 58 && hsv.v >= 45 && r > b * 2.4) {
    return true;
  }

  return false;
}

export function analyzeVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  settings: GameSettings,
  prevBlueStable: number,
  prevOrangeStable: number,
  baselines: { blueBaseline: number; orangeBaseline: number } = { blueBaseline: 0, orangeBaseline: 0 }
): {
  result: DetectionResult;
  updatedBlueStable: number;
  updatedOrangeStable: number;
} {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
    return {
      result: {
        hasPerson: false,
        status: 'NO_CARD',
        blueScore: 0,
        orangeScore: 0,
        blueStableFrames: 0,
        orangeStableFrames: 0,
        blueCardDetected: false,
        orangeCardDetected: false,
        timestamp: performance.now(),
        winnerCandidate: null,
      },
      updatedBlueStable: 0,
      updatedOrangeStable: 0,
    };
  }

  // Fast CV resolution (320x240)
  const processWidth = 320;
  const processHeight = 240;
  if (canvas.width !== processWidth || canvas.height !== processHeight) {
    canvas.width = processWidth;
    canvas.height = processHeight;
  }

  // Draw current video frame to processing canvas
  ctx.drawImage(video, 0, 0, processWidth, processHeight);

  // Define ROI (Region Of Interest): Central 90% width, 90% height
  const roiX = Math.floor(processWidth * 0.05);
  const roiY = Math.floor(processHeight * 0.05);
  const roiWidth = Math.floor(processWidth * 0.9);
  const roiHeight = Math.floor(processHeight * 0.9);

  const frameData = ctx.getImageData(roiX, roiY, roiWidth, roiHeight);
  const data = frameData.data;

  let bluePixelCount = 0;
  let orangePixelCount = 0;
  let skinPixelCount = 0;
  let brightPixelCount = 0;
  const totalRoiPixels = roiWidth * roiHeight;

  // Bounding tracking
  let blueMinX = roiWidth,
    blueMaxX = 0,
    blueMinY = roiHeight,
    blueMaxY = 0;
  let blueSumX = 0,
    blueSumY = 0;

  let orangeMinX = roiWidth,
    orangeMaxX = 0,
    orangeMinY = roiHeight,
    orangeMaxY = 0;
  let orangeSumX = 0,
    orangeSumY = 0;

  // Step sampling (step = 2) for 60fps performance
  const step = 2;
  let sampledPixels = 0;

  for (let y = 0; y < roiHeight; y += step) {
    for (let x = 0; x < roiWidth; x += step) {
      const idx = (y * roiWidth + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      sampledPixels++;

      const hsv = rgbToHsv(r, g, b);

      if (hsv.v > 20) brightPixelCount++;
      if (isSkinPixel(r, g, b, hsv)) skinPixelCount++;

      if (isBlueMarker(hsv, r, g, b, settings)) {
        bluePixelCount++;
        blueSumX += x;
        blueSumY += y;
        if (x < blueMinX) blueMinX = x;
        if (x > blueMaxX) blueMaxX = x;
        if (y < blueMinY) blueMinY = y;
        if (y > blueMaxY) blueMaxY = y;
      } else if (isOrangeMarker(hsv, r, g, b, settings)) {
        orangePixelCount++;
        orangeSumX += x;
        orangeSumY += y;
        if (x < orangeMinX) orangeMinX = x;
        if (x > orangeMaxX) orangeMaxX = x;
        if (y < orangeMinY) orangeMinY = y;
        if (y > orangeMaxY) orangeMaxY = y;
      }
    }
  }

  const rawBlueRatio = (bluePixelCount / sampledPixels) * 100;
  const rawOrangeRatio = (orangePixelCount / sampledPixels) * 100;
  const skinRatio = (skinPixelCount / sampledPixels) * 100;
  const hasPerson = skinRatio > 1.2 || brightPixelCount / sampledPixels > 0.3;

  // Minimum pixel cluster requirement for a real physical card held up:
  // At step=2 (approx 15,000 sampled pixels in ROI), a card held in view
  // must cover at least 45 sampled pixels and have a reasonable bounding box size.
  const MIN_CARD_SAMPLED_PIXELS = 45;

  const blueBoxW = blueMaxX >= blueMinX ? blueMaxX - blueMinX : 0;
  const blueBoxH = blueMaxY >= blueMinY ? blueMaxY - blueMinY : 0;
  const isBlueClusterValid =
    bluePixelCount >= MIN_CARD_SAMPLED_PIXELS &&
    blueBoxW >= 14 &&
    blueBoxH >= 14 &&
    blueBoxW <= roiWidth * 0.95 &&
    blueBoxH <= roiHeight * 0.95;

  const orangeBoxW = orangeMaxX >= orangeMinX ? orangeMaxX - orangeMinX : 0;
  const orangeBoxH = orangeMaxY >= orangeMinY ? orangeMaxY - orangeMinY : 0;
  const isOrangeClusterValid =
    orangePixelCount >= MIN_CARD_SAMPLED_PIXELS &&
    orangeBoxW >= 14 &&
    orangeBoxH >= 14 &&
    orangeBoxW <= roiWidth * 0.95 &&
    orangeBoxH <= roiHeight * 0.95;

  // Subtract background ambient noise baseline
  const effectiveBlueRatio = Math.max(0, rawBlueRatio - (baselines.blueBaseline || 0));
  const effectiveOrangeRatio = Math.max(0, rawOrangeRatio - (baselines.orangeBaseline || 0));

  // Target threshold for full card coverage (e.g. 1.8% - 2.5% of ROI)
  const targetCoverage = Math.max(0.8, settings.minColorCoveragePercent || 2.0);

  // Calculate True Card Presence & Confidence Scores
  let blueConfidence = 0;
  let orangeConfidence = 0;

  if (isBlueClusterValid && effectiveBlueRatio >= 0.25) {
    blueConfidence = Math.min(100, Math.round((effectiveBlueRatio / targetCoverage) * 100));
  }

  if (isOrangeClusterValid && effectiveOrangeRatio >= 0.25) {
    orangeConfidence = Math.min(100, Math.round((effectiveOrangeRatio / targetCoverage) * 100));
  }

  const blueCardDetected = isBlueClusterValid && blueConfidence >= 40;
  const orangeCardDetected = isOrangeClusterValid && orangeConfidence >= 40;

  // Threshold trigger flag (must reach at least 70% confidence)
  const isBlueTriggered = blueCardDetected && blueConfidence >= 70;
  const isOrangeTriggered = orangeCardDetected && orangeConfidence >= 70;

  let newBlueStable = isBlueTriggered ? prevBlueStable + 1 : 0;
  let newOrangeStable = isOrangeTriggered ? prevOrangeStable + 1 : 0;

  let winnerCandidate: TeamId | null = null;
  const now = performance.now();

  const minRequiredFrames = Math.max(2, settings.minStableFrames || 3);
  const isBlueValid = newBlueStable >= minRequiredFrames;
  const isOrangeValid = newOrangeStable >= minRequiredFrames;

  let isTie = false;

  if (isBlueValid && isOrangeValid) {
    const scoreDiff = Math.abs(blueConfidence - orangeConfidence);
    if (scoreDiff < 15) {
      isTie = true;
    } else if (blueConfidence > orangeConfidence) {
      winnerCandidate = 'blue';
    } else {
      winnerCandidate = 'orange';
    }
  } else if (isBlueValid) {
    winnerCandidate = 'blue';
  } else if (isOrangeValid) {
    winnerCandidate = 'orange';
  }

  // Explicit Detection State
  let status: DetectionResult['status'] = 'NO_CARD';
  if (winnerCandidate || isTie) {
    status = 'LOCKED';
  } else if (blueCardDetected && orangeCardDetected) {
    status = 'TRACKING_BOTH';
  } else if (blueCardDetected) {
    status = 'TRACKING_BLUE';
  } else if (orangeCardDetected) {
    status = 'TRACKING_ORANGE';
  } else {
    status = 'NO_CARD';
  }

  // Calculate normalized bounds for overlay
  const blueBounds =
    blueCardDetected && bluePixelCount > 10
      ? {
          minX: ((roiX + blueMinX) / processWidth) * 100,
          maxX: ((roiX + blueMaxX) / processWidth) * 100,
          minY: ((roiY + blueMinY) / processHeight) * 100,
          maxY: ((roiY + blueMaxY) / processHeight) * 100,
          centerX: ((roiX + blueSumX / bluePixelCount) / processWidth) * 100,
          centerY: ((roiY + blueSumY / bluePixelCount) / processHeight) * 100,
        }
      : null;

  const orangeBounds =
    orangeCardDetected && orangePixelCount > 10
      ? {
          minX: ((roiX + orangeMinX) / processWidth) * 100,
          maxX: ((roiX + orangeMaxX) / processWidth) * 100,
          minY: ((roiY + orangeMinY) / processHeight) * 100,
          maxY: ((roiY + orangeMaxY) / processHeight) * 100,
          centerX: ((roiX + orangeSumX / orangePixelCount) / processWidth) * 100,
          centerY: ((roiY + orangeSumY / orangePixelCount) / processHeight) * 100,
        }
      : null;

  return {
    result: {
      hasPerson,
      status,
      blueScore: blueConfidence,
      orangeScore: orangeConfidence,
      blueStableFrames: newBlueStable,
      orangeStableFrames: newOrangeStable,
      blueCardDetected,
      orangeCardDetected,
      timestamp: now,
      winnerCandidate,
      isTie,
      blueBounds,
      orangeBounds,
      roiStats: {
        totalPixels: totalRoiPixels,
        bluePixels: bluePixelCount,
        orangePixels: orangePixelCount,
        blueRatio: rawBlueRatio,
        orangeRatio: rawOrangeRatio,
      },
    },
    updatedBlueStable: newBlueStable,
    updatedOrangeStable: newOrangeStable,
  };
}

export interface SnapshotMetadata {
  winner?: TeamId | null;
  teamName?: string;
  questionIndex?: number;
  reactionTimeMs?: number | null;
  label?: string;
}

export function captureSnapshot(
  video: HTMLVideoElement,
  metadata?: SnapshotMetadata
): string | null {
  try {
    const snapCanvas = document.createElement('canvas');
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    snapCanvas.width = width;
    snapCanvas.height = height;
    const snapCtx = snapCanvas.getContext('2d');
    if (!snapCtx) return null;

    // Draw video horizontally flipped so snapshot matches what players saw on mirror screen
    snapCtx.save();
    snapCtx.translate(snapCanvas.width, 0);
    snapCtx.scale(-1, 1);
    snapCtx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
    snapCtx.restore();

    // Draw Esports Broadcast Watermark Stamp
    const isBlue = metadata?.winner === 'blue';
    const isOrange = metadata?.winner === 'orange';

    // Top Right Badge
    snapCtx.fillStyle = 'rgba(2, 6, 23, 0.75)';
    snapCtx.beginPath();
    snapCtx.roundRect(width - 190, 12, 178, 28, 6);
    snapCtx.fill();
    snapCtx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
    snapCtx.lineWidth = 1.5;
    snapCtx.stroke();

    snapCtx.fillStyle = '#06B6D4';
    snapCtx.font = 'bold 12px monospace';
    snapCtx.fillText('📸 CAM RACE TIN HỌC 5', width - 180, 30);

    // Bottom Bar Badge
    snapCtx.fillStyle = 'rgba(2, 6, 23, 0.85)';
    snapCtx.beginPath();
    snapCtx.roundRect(12, height - 52, width - 24, 40, 8);
    snapCtx.fill();
    snapCtx.strokeStyle = isBlue ? '#06B6D4' : isOrange ? '#F97316' : '#64748B';
    snapCtx.lineWidth = 2;
    snapCtx.stroke();

    // Winner / Round Info
    snapCtx.fillStyle = isBlue ? '#38BDF8' : isOrange ? '#FB923C' : '#F1F5F9';
    snapCtx.font = 'bold 14px sans-serif';
    const roundText = metadata?.questionIndex !== undefined ? `CÂU ${metadata.questionIndex + 1}: ` : '';
    const labelText = metadata?.teamName
      ? `${roundText}${metadata.teamName.toUpperCase()} GIÀNH QUYỀN`
      : metadata?.label || `${roundText}KHOẢNH KHẮC THI ĐẤU`;
    snapCtx.fillText(labelText, 24, height - 28);

    // Speed / Timestamp
    snapCtx.fillStyle = '#94A3B8';
    snapCtx.font = 'bold 11px monospace';
    let extraText = new Date().toLocaleTimeString('vi-VN');
    if (metadata?.reactionTimeMs) {
      extraText = `⚡ ${(metadata.reactionTimeMs / 1000).toFixed(2)}s  |  ${extraText}`;
    }
    const extraWidth = snapCtx.measureText(extraText).width;
    snapCtx.fillText(extraText, width - extraWidth - 24, height - 28);

    return snapCanvas.toDataURL('image/jpeg', 0.9);
  } catch {
    return null;
  }
}
