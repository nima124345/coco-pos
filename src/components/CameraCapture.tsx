"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

/** Convert a data URL (e.g. canvas.toDataURL) into a File synchronously. */
function dataURLtoFile(dataurl: string, filename: string): File {
  const [head, b64] = dataurl.split(",");
  const mime = head.match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(b64);
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while (n--) u8[n] = bstr.charCodeAt(n);
  return new File([u8], filename, { type: mime });
}

/**
 * In-page camera capture overlay. Opens the device camera with a live preview,
 * lets the user snap a still, review it, then confirm. Falls back to a file
 * picker (with `capture`) when the camera can't be opened.
 */
export default function CameraCapture({
  title,
  confirmLabel,
  accent = "green",
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  confirmLabel: string;
  accent?: "green" | "red";
  busy?: boolean;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [camError, setCamError] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setCamError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch {
      setCamError(true);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopStream();
  }, [startCamera, stopStream]);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const maxW = 640;
    const scale = Math.min(1, maxW / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    fileRef.current = dataURLtoFile(dataUrl, `attendance-${Date.now()}.jpg`);
    setPreview(dataUrl);
    stopStream();
  };

  const retake = () => {
    fileRef.current = null;
    setPreview(null);
    startCamera();
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    fileRef.current = f;
    setPreview(URL.createObjectURL(f));
    stopStream();
  };

  const confirm = () => {
    if (fileRef.current) onConfirm(fileRef.current);
  };

  const accentBtn =
    accent === "red"
      ? "bg-red-500 hover:bg-red-600"
      : "bg-green-500 hover:bg-green-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={busy ? undefined : onCancel}
      />
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 shrink-0">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            ถ่ายรูปเพื่อยืนยันตัวตน
          </p>
        </div>

        <div className="p-5 space-y-4 flex-1 overflow-y-auto min-h-0 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-slate-900 shrink-0">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="รูปที่ถ่าย"
                className="h-full w-full object-cover"
              />
            ) : camError ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-5 text-center">
                <span className="text-3xl">📷</span>
                <p className="text-sm text-slate-300">
                  เปิดกล้องไม่ได้ — กรุณาเลือกรูปจากเครื่อง
                </p>
                <label className="cursor-pointer rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20">
                  เลือกรูป
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={onPickFile}
                  />
                </label>
              </div>
            ) : (
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full object-cover"
              />
            )}
          </div>

          {!preview ? (
            !camError && (
              <Button
                onClick={takePhoto}
                size="lg"
                className={`w-full h-12 text-white ${accentBtn}`}
              >
                📸 ถ่ายรูป
              </Button>
            )
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={retake}
                variant="outline"
                className="flex-1 h-12"
                disabled={busy}
              >
                ถ่ายใหม่
              </Button>
              <Button
                onClick={confirm}
                disabled={busy}
                className={`flex-1 h-12 text-white ${accentBtn}`}
              >
                {busy ? "กำลังบันทึก…" : confirmLabel}
              </Button>
            </div>
          )}

          <button
            onClick={onCancel}
            disabled={busy}
            className="w-full text-sm text-slate-500 hover:text-slate-800 py-1 cursor-pointer disabled:opacity-50"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}
