import { useState, useEffect, useRef, useCallback, RefObject } from 'react';

export interface CameraHookState {
  stream: MediaStream | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  isStreaming: boolean;
  error: string | null;
  hasPermission: boolean;
  startCamera: (deviceId?: string) => Promise<boolean>;
  stopCamera: () => void;
  switchCamera: (deviceId: string) => Promise<boolean>;
}

export function useCamera(autoStart: boolean = false): CameraHookState {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  const loadDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return;
      }
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (e) {
      console.warn('Could not enumerate devices', e);
    }
  }, [selectedDeviceId]);

  const startCamera = useCallback(
    async (deviceId?: string): Promise<boolean> => {
      setError(null);
      stopCamera();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Trình duyệt không hỗ trợ truy cập Webcam.');
        return false;
      }

      try {
        const targetDeviceId = deviceId || selectedDeviceId;
        let mediaStream: MediaStream | null = null;

        // Try high-resolution first
        try {
          const highResConstraints: MediaStreamConstraints = {
            video: targetDeviceId
              ? { deviceId: { exact: targetDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
              : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            audio: false,
          };
          mediaStream = await navigator.mediaDevices.getUserMedia(highResConstraints);
        } catch (firstErr) {
          console.warn('High-res camera constraints failed, attempting fallback...', firstErr);
          // Fallback to basic video constraint
          const basicConstraints: MediaStreamConstraints = {
            video: targetDeviceId ? { deviceId: targetDeviceId } : true,
            audio: false,
          };
          mediaStream = await navigator.mediaDevices.getUserMedia(basicConstraints);
        }

        if (!mediaStream) {
          throw new Error('Không thể nhận luồng dữ liệu từ camera.');
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);
        setHasPermission(true);
        setIsStreaming(true);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch((e) => console.warn('Video play error:', e));
          };
          await videoRef.current.play().catch(() => {});
        }

        await loadDevices();
        return true;
      } catch (err: unknown) {
        const errMessage =
          err instanceof Error
            ? err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
              ? 'Quyền truy cập Camera bị từ chối. Vui lòng bấm vào biểu tượng ổ khóa/camera trên thanh địa chỉ và chọn "Cho phép" (Allow).'
              : err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError'
              ? 'Không tìm thấy thiết bị Webcam trên máy tính hoặc camera đang bị ứng dụng khác chiếm dụng.'
              : `Lỗi kết nối camera: ${err.message}`
            : 'Không thể khởi động camera';

        setError(errMessage);
        setIsStreaming(false);
        return false;
      }
    },
    [selectedDeviceId, stopCamera, loadDevices]
  );

  const switchCamera = useCallback(
    async (deviceId: string): Promise<boolean> => {
      setSelectedDeviceId(deviceId);
      return await startCamera(deviceId);
    },
    [startCamera]
  );

  useEffect(() => {
    // Attach stream to video ref if stream changes or mounts
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [stream]);

  useEffect(() => {
    if (autoStart) {
      startCamera();
    }
    loadDevices();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [autoStart, startCamera, loadDevices]);

  return {
    stream,
    videoRef,
    devices,
    selectedDeviceId,
    isStreaming,
    error,
    hasPermission,
    startCamera,
    stopCamera,
    switchCamera,
  };
}
