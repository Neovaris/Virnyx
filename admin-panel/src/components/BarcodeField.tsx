"use client";

/**
 * BarcodeField — Production-grade barcode input component
 *
 * Supports:
 * - Manual typing
 * - Hardware USB scanner (keypress → Enter auto-submits into input)
 * - Mobile camera scanning (BarcodeDetector API)
 * - Barcode generation (VRX-XXXXXXXX via backend)
 * - Real-time uniqueness validation
 * - Code128 SVG barcode preview
 * - Print barcode label
 *
 * Future: bulk printing, thermal printer, offline lookup
 */

import { useCallback, useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BarcodeValidationState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available" }
  | { status: "conflict"; productName: string }
  | { status: "error"; message: string };

interface BarcodeFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Product id to exclude from uniqueness check (for edit mode) */
  excludeId?: string;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isValidCode128(value: string): boolean {
  // Code128 supports ASCII 0x20–0x7E; reject empty or out-of-range chars
  if (!value) return false;
  return /^[\x20-\x7E]+$/.test(value);
}

// ---------------------------------------------------------------------------
// Barcode SVG Preview
// ---------------------------------------------------------------------------

function BarcodePreview({ value }: { value: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        lineColor: "#e2e8f0",
        background: "transparent",
        width: 2,
        height: 56,
        displayValue: true,
        fontOptions: "",
        font: "monospace",
        textAlign: "center",
        textPosition: "bottom",
        fontSize: 11,
        margin: 8,
        valid: (valid) => setError(!valid),
      });
    } catch {
      setError(true);
    }
  }, [value]);

  if (!value || error) return null;

  return (
    <div className="flex flex-col items-center rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 mt-2">
      <svg ref={svgRef} className="max-w-full" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Camera Scanner Modal
// ---------------------------------------------------------------------------

type ScannerModalProps = {
  onDetected: (value: string) => void;
  onClose: () => void;
};

function CameraScannerModal({ onDetected, onClose }: ScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [status, setStatus] = useState<"starting" | "scanning" | "error">("starting");
  const [errorMsg, setErrorMsg] = useState("");

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        if (!("BarcodeDetector" in window)) {
          setStatus("error");
          setErrorMsg(
            "Camera barcode scanning is not supported in this browser. Use a USB scanner or type manually.",
          );
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setStatus("scanning");

        // @ts-expect-error — BarcodeDetector is not yet in TypeScript lib
        const detector = new window.BarcodeDetector({ formats: ["code_128", "ean_13", "ean_8", "upc_a", "upc_e", "qr_code"] });

        const scan = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              stopCamera();
              onDetected(barcodes[0].rawValue);
              return;
            }
          } catch {
            // ignore frame errors
          }
          rafRef.current = requestAnimationFrame(scan);
        };

        rafRef.current = requestAnimationFrame(scan);
      } catch (err: any) {
        if (!cancelled) {
          setStatus("error");
          setErrorMsg(
            err?.name === "NotAllowedError"
              ? "Camera permission denied. Allow camera access and try again."
              : err?.message || "Failed to access camera.",
          );
        }
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [onDetected, stopCamera]);

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-950 p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-100">Scan Barcode</p>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-800 bg-slate-900/40 px-2 py-1 text-xs hover:bg-slate-900/60"
          >
            Cancel
          </button>
        </div>

        {status === "starting" && (
          <div className="flex h-48 items-center justify-center text-sm text-slate-400">
            Starting camera…
          </div>
        )}

        {status === "error" && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm text-red-200">
            {errorMsg}
          </div>
        )}

        {status === "scanning" && (
          <>
            <div className="relative overflow-hidden rounded-xl border border-slate-700">
              <video ref={videoRef} muted playsInline className="w-full rounded-xl" />
              {/* scan line animation */}
              <div className="pointer-events-none absolute inset-x-0 top-0 animate-[scanline_2s_linear_infinite] h-0.5 bg-indigo-400/60" />
            </div>
            <p className="mt-2 text-center text-xs text-slate-400">
              Point the camera at a barcode to scan
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Print barcode label (opens print window with barcode SVG)
// ---------------------------------------------------------------------------

export function printBarcodeLabel(barcode: string, productName?: string) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("id", "__vrx_print_svg");
  document.body.appendChild(svg);

  try {
    JsBarcode(svg, barcode, {
      format: "CODE128",
      lineColor: "#000000",
      background: "#ffffff",
      width: 2,
      height: 80,
      displayValue: true,
      fontOptions: "",
      font: "monospace",
      textAlign: "center",
      textPosition: "bottom",
      fontSize: 13,
      margin: 10,
    });

    const svgHtml = svg.outerHTML;
    const win = window.open("", "_blank", "width=400,height=300");
    if (!win) {
      alert("Allow pop-ups to print the barcode label.");
      return;
    }

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Barcode Label${productName ? ` – ${productName}` : ""}</title>
  <style>
    body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: monospace; background: #fff; }
    .label { display: flex; flex-direction: column; align-items: center; border: 1px solid #ccc; padding: 16px 24px; border-radius: 8px; }
    .product-name { font-size: 13px; color: #333; margin-bottom: 8px; text-align: center; max-width: 260px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="label">
    ${productName ? `<div class="product-name">${productName.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!)}</div>` : ""}
    ${svgHtml}
  </div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`);
    win.document.close();
  } finally {
    document.body.removeChild(svg);
  }
}

// ---------------------------------------------------------------------------
// Main BarcodeField component
// ---------------------------------------------------------------------------

export default function BarcodeField({
  value,
  onChange,
  excludeId,
  disabled = false,
}: BarcodeFieldProps) {
  const [validation, setValidation] = useState<BarcodeValidationState>({ status: "idle" });
  const [showScanner, setShowScanner] = useState(false);
  const [generating, setGenerating] = useState(false);
  const validationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Real-time validation (debounced 500ms) ──────────────────────────────
  const scheduleValidation = useCallback(
    (barcode: string) => {
      if (validationTimer.current) clearTimeout(validationTimer.current);

      if (!barcode) {
        setValidation({ status: "idle" });
        return;
      }

      setValidation({ status: "checking" });

      validationTimer.current = setTimeout(async () => {
        try {
          const params = new URLSearchParams({ barcode });
          if (excludeId) params.set("excludeId", excludeId);
          const res = await fetch(`/api/products/barcode-check?${params.toString()}`, {
            cache: "no-store",
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setValidation({ status: "error", message: data?.message || "Validation failed" });
            return;
          }
          if (data.available) {
            setValidation({ status: "available" });
          } else {
            setValidation({ status: "conflict", productName: data.conflict?.name ?? "another product" });
          }
        } catch {
          setValidation({ status: "error", message: "Could not validate barcode" });
        }
      }, 500);
    },
    [excludeId],
  );

  useEffect(() => {
    return () => {
      if (validationTimer.current) clearTimeout(validationTimer.current);
    };
  }, []);

  // ─── USB scanner: hardware scanners type fast then press Enter ────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Trigger validation immediately
      if (validationTimer.current) clearTimeout(validationTimer.current);
      scheduleValidation(value);
    }
  };

  const handleChange = (raw: string) => {
    onChange(raw);
    scheduleValidation(raw);
  };

  // ─── Camera scan detected ─────────────────────────────────────────────────
  const handleScanDetected = (scanned: string) => {
    setShowScanner(false);
    onChange(scanned);
    scheduleValidation(scanned);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // ─── Generate barcode via backend ─────────────────────────────────────────
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/products/barcode-generate", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.barcode) {
        setValidation({ status: "error", message: data?.message || "Failed to generate barcode" });
        return;
      }
      onChange(data.barcode);
      setValidation({ status: "available" });
    } catch {
      setValidation({ status: "error", message: "Could not reach server" });
    } finally {
      setGenerating(false);
    }
  };

  // ─── Derived UI state ─────────────────────────────────────────────────────
  const isConflict = validation.status === "conflict";
  const isAvailable = validation.status === "available";
  const isChecking = validation.status === "checking";

  const inputBorderClass = isConflict
    ? "border-red-500/60 focus:ring-red-500/30"
    : isAvailable
      ? "border-emerald-500/50 focus:ring-emerald-500/30"
      : "border-slate-800 focus:ring-indigo-500/40";

  return (
    <div className="space-y-2">
      {/* Row: input + Scan + Generate */}
      <div className="flex items-stretch gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            aria-label="Product barcode"
            placeholder="Scan, enter, or generate…"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            spellCheck={false}
            autoComplete="off"
            className={[
              "w-full rounded-xl border bg-slate-900/40 px-3 py-2 pr-8 text-sm text-slate-100 outline-none transition-colors focus:ring-2 disabled:opacity-50",
              inputBorderClass,
            ].join(" ")}
          />
          {/* inline status indicator */}
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs">
            {isChecking && <span className="text-slate-500">⋯</span>}
            {isAvailable && <span className="text-emerald-400">✓</span>}
            {isConflict && <span className="text-red-400">✕</span>}
          </span>
        </div>

        <button
          type="button"
          title="Scan barcode with camera"
          aria-label="Scan barcode"
          disabled={disabled}
          onClick={() => setShowScanner(true)}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800/60 disabled:opacity-50 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9V5a2 2 0 0 1 2-2h4" /><path d="M15 3h4a2 2 0 0 1 2 2v4" />
            <path d="M21 15v4a2 2 0 0 1-2 2h-4" /><path d="M9 21H5a2 2 0 0 1-2-2v-4" />
            <line x1="7" y1="12" x2="7" y2="12.01" strokeWidth="3" /><line x1="12" y1="7" x2="12" y2="17" /><line x1="17" y1="12" x2="17" y2="12.01" strokeWidth="3" />
          </svg>
          Scan
        </button>

        <button
          type="button"
          title="Generate a unique barcode"
          aria-label="Generate barcode"
          disabled={disabled || generating}
          onClick={handleGenerate}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800/60 disabled:opacity-50 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {generating ? "…" : "Generate"}
        </button>
      </div>

      {/* Validation feedback */}
      {validation.status === "conflict" && (
        <p className="text-xs text-red-400" role="alert">
          Barcode already assigned to <span className="font-semibold">{validation.productName}</span>
        </p>
      )}
      {validation.status === "error" && (
        <p className="text-xs text-amber-400" role="alert">
          {validation.message}
        </p>
      )}
      {validation.status === "available" && value && (
        <p className="text-xs text-emerald-400">Barcode is available</p>
      )}

      {/* Code128 barcode preview */}
      {isValidCode128(value) && !isConflict && (
        <BarcodePreview value={value} />
      )}

      {/* Camera scanner modal */}
      {showScanner && (
        <CameraScannerModal
          onDetected={handleScanDetected}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
