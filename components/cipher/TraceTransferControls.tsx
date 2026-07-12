"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { CipherDirection, CipherResult } from "../../lib/cipher/types";
import {
  createCipherTrace,
  getTraceFilename,
  parseCipherTraceJson,
  type CipherTraceFile,
} from "../../lib/utils/cipherTrace";

interface TraceTransferControlsProps {
  cipherId: string;
  direction: CipherDirection;
  input: string;
  cipherKey: string;
  options: Record<string, unknown>;
  result: CipherResult | null;
  onImport: (trace: CipherTraceFile) => void;
}

function downloadJson(trace: CipherTraceFile) {
  const blob = new Blob([JSON.stringify(trace, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = getTraceFilename(trace);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function TraceTransferControls({
  cipherId,
  direction,
  input,
  cipherKey,
  options,
  result,
  onImport,
}: TraceTransferControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleExport = () => {
    if (!result) return;

    const trace = createCipherTrace({
      cipherId,
      direction,
      input,
      key: cipherKey,
      options,
      result,
    });

    downloadJson(trace);
    setIsError(false);
    setMessage("Trace exported successfully.");
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (
      file.type &&
      file.type !== "application/json" &&
      !file.name.toLowerCase().endsWith(".json")
    ) {
      setIsError(true);
      setMessage("Choose a JSON trace file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setIsError(true);
      setMessage("Trace files must be smaller than 5 MB.");
      return;
    }

    try {
      const parsed = parseCipherTraceJson(await file.text());

      if (!parsed.success) {
        setIsError(true);
        setMessage(parsed.error);
        return;
      }

      if (parsed.trace.cipherId !== cipherId) {
        setIsError(true);
        setMessage(
          `This trace belongs to “${parsed.trace.cipherId}”. Open that cipher before importing it.`,
        );
        return;
      }

      onImport(parsed.trace);
      setIsError(false);
      setMessage("Trace imported. It was loaded without executing the cipher.");
    } catch {
      setIsError(true);
      setMessage("The trace file could not be read.");
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExport}
          disabled={!result}
          className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-400"
        >
          Export Trace
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Import Trace
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={handleImport}
          aria-label="Import cipher visualization trace"
        />
      </div>

      <p className="text-2xs text-zinc-500 dark:text-zinc-400">
        Imported traces are validated and replayed locally. They never run a
        cipher operation automatically.
      </p>

      {message && (
        <p
          role={isError ? "alert" : "status"}
          className={`text-xs ${
            isError
              ? "text-red-600 dark:text-red-400"
              : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
