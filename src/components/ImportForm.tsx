"use client";

import { useMemo, useState } from "react";
import { IMPORT_TEMPLATE } from "@/lib/import";
import { DEFAULT_TRAINERS } from "@/lib/trainer-names";

type ImportResult = {
  ok: boolean;
  imported?: number;
  csvLines?: number;
  message?: string;
  error?: string;
  errors?: Array<{ line: number; message: string; raw?: string }>;
};

type ImageScanResult = {
  ok: boolean;
  csv?: string;
  message?: string;
  error?: string;
  previewCount?: number;
  errors?: Array<{ line: number; message: string }>;
};

export function ImportForm() {
  const [csv, setCsv] = useState(IMPORT_TEMPLATE);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [scanResult, setScanResult] = useState<ImageScanResult | null>(null);
  const [trainerHint, setTrainerHint] = useState("Sühan");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const lineCount = useMemo(
    () => csv.split(/\r?\n/).filter((line) => line.trim()).length - 1,
    [csv],
  );

  function handleCsvFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCsv(reader.result);
        setResult(null);
        setScanResult(null);
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  async function handleImageScan(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setScanning(true);
    setScanResult(null);
    setResult(null);

    const allCsvLines = new Set<string>();
    allCsvLines.add("egitmen,tarih,donem,tur,baslik");

    let totalExtracted = 0;
    const allErrors: Array<{ line: number; message: string }> = [];

    try {
      for (const file of Array.from(files)) {
        setImagePreview(URL.createObjectURL(file));

        const formData = new FormData();
        formData.append("image", file);
        formData.append("trainer", trainerHint);

        const res = await fetch("/api/import/image", {
          method: "POST",
          body: formData,
        });
        const data = (await res.json()) as ImageScanResult;

        if (!res.ok || !data.ok || !data.csv) {
          throw new Error(data.error ?? "Resim okunamadı");
        }

        const lines = data.csv.split(/\r?\n/).slice(1);
        for (const line of lines) {
          if (line.trim()) allCsvLines.add(line);
        }
        totalExtracted += lines.length;
        if (data.errors) allErrors.push(...data.errors);
      }

      setCsv(Array.from(allCsvLines).join("\n"));
      setScanResult({
        ok: true,
        message: `${files.length} görselden ${totalExtracted} kayıt okundu. Aşağıdan kontrol edip kaydedin.`,
        errors: allErrors,
      });
    } catch (error) {
      setScanResult({
        ok: false,
        error: error instanceof Error ? error.message : "Resim okunamadı",
      });
    } finally {
      setScanning(false);
      event.target.value = "";
    }
  }

  function downloadTemplate() {
    const blob = new Blob([IMPORT_TEMPLATE], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "peak-takvim-import.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = (await res.json()) as ImportResult;
      setResult(data);
      if (data.ok) {
        setTimeout(() => window.location.assign("/"), 1500);
      }
    } catch (error) {
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : "İçe aktarma başarısız",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h3 className="font-semibold">Takvim görseli yükle</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Eğitmenlerin gönderdiği Excel ekran görüntüsü, takvim fotoğrafı veya
          plan görselini yükleyin. Sistem tarihleri otomatik okur.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Eğitmen (ipucu)
            </span>
            <select
              value={trainerHint}
              onChange={(event) => setTrainerHint(event.target.value)}
              className="rounded-md border border-[var(--border)] bg-white px-3 py-2"
            >
              {DEFAULT_TRAINERS.map((trainer) => (
                <option key={trainer.full_name} value={trainer.full_name}>
                  {trainer.full_name}
                </option>
              ))}
            </select>
          </label>

          <label className="cursor-pointer rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            {scanning ? "Okunuyor…" : "Görsel seç (birden fazla olabilir)"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={scanning}
              onChange={handleImageScan}
            />
          </label>
        </div>

        {imagePreview && (
          <img
            src={imagePreview}
            alt="Yüklenen takvim görseli"
            className="mt-4 max-h-64 rounded-lg border border-[var(--border)] object-contain"
          />
        )}

        {scanResult && (
          <div
            className={`mt-4 rounded-lg border p-4 text-sm ${
              scanResult.ok
                ? "border-blue-200 bg-blue-50 text-blue-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
          >
            <p>{scanResult.message ?? scanResult.error}</p>
            {scanResult.errors && scanResult.errors.length > 0 && (
              <ul className="mt-2 space-y-1">
                {scanResult.errors.map((error) => (
                  <li key={`${error.line}-${error.message}`}>
                    Satır {error.line}: {error.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h3 className="font-semibold">CSV ile yükleme (isteğe bağlı)</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Sütunlar:{" "}
          <code className="rounded bg-slate-100 px-1">
            egitmen, tarih, donem, tur, baslik
          </code>
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={downloadTemplate}
            className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Şablon indir
          </button>
          <label className="cursor-pointer rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-slate-50">
            CSV dosyası seç
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleCsvFileChange}
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Önizleme ve düzenleme</h3>
          <span className="text-sm text-[var(--muted)]">{lineCount} satır</span>
        </div>
        <textarea
          value={csv}
          onChange={(event) => {
            setCsv(event.target.value);
            setResult(null);
          }}
          rows={14}
          className="w-full rounded-lg border border-[var(--border)] bg-white p-3 font-mono text-sm"
          spellCheck={false}
        />
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleImport}
            disabled={loading || lineCount <= 0}
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Kaydediliyor…" : "Toplu Kaydet"}
          </button>
        </div>
      </div>

      {result && (
        <div
          className={`rounded-xl border p-5 ${
            result.ok
              ? "border-green-200 bg-green-50 text-green-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          <p className="font-semibold">{result.ok ? "Başarılı" : "Hata"}</p>
          <p className="mt-1 text-sm">{result.message ?? result.error}</p>
          {result.errors && result.errors.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {result.errors.map((error) => (
                <li key={`${error.line}-${error.message}`}>
                  Satır {error.line}: {error.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
