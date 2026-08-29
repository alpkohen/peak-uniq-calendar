"use client";

import { useMemo, useState } from "react";
import type { ClientWithPricing, TrainerFeeMode } from "@/lib/types";
import { formatTry, trainerFeeLabel } from "@/lib/pricing";
import { formatDecimalTr, parseDecimalTr } from "@/lib/number-format";

type Props = {
  initialClients: ClientWithPricing[];
  suggestedNames: string[];
  trainersByLabel: Record<string, string>;
};

type RowState = {
  clientId?: string;
  name: string;
  salePricePerDay: string;
  trainerFeeMode: TrainerFeeMode;
  trainerFeeValue: string;
  saving: boolean;
  saved: boolean;
  error: string | null;
};

function formatMoneyField(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return "";
  return formatDecimalTr(value);
}

function toRow(client: ClientWithPricing): RowState {
  const mode = client.pricing?.trainer_fee_mode ?? "percent";
  const feeValue = client.pricing?.trainer_fee_value;
  return {
    clientId: client.id,
    name: client.name,
    salePricePerDay: formatMoneyField(client.pricing?.sale_price_per_day),
    trainerFeeMode: mode,
    trainerFeeValue:
      feeValue === null || feeValue === undefined
        ? ""
        : mode === "percent"
          ? String(feeValue)
          : formatDecimalTr(feeValue),
    saving: false,
    saved: false,
    error: null,
  };
}

function formatFeeOnBlur(mode: TrainerFeeMode, value: string): string {
  if (!value.trim()) return "";
  if (mode === "percent") return String(parseDecimalTr(value));
  return formatDecimalTr(parseDecimalTr(value));
}

export function ClientPricingView({
  initialClients,
  suggestedNames,
  trainersByLabel,
}: Props) {
  const existingNames = new Set(
    initialClients.map((c) => c.name.toLocaleLowerCase("tr-TR")),
  );
  const extras = suggestedNames.filter(
    (name) => !existingNames.has(name.toLocaleLowerCase("tr-TR")),
  );

  const [rows, setRows] = useState<RowState[]>(() => [
    ...initialClients.map(toRow),
    ...extras.map((name) => ({
      name,
      salePricePerDay: "",
      trainerFeeMode: "percent" as TrainerFeeMode,
      trainerFeeValue: "",
      saving: false,
      saved: false,
      error: null,
    })),
  ]);
  const [newName, setNewName] = useState("");

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => a.name.localeCompare(b.name, "tr-TR")),
    [rows],
  );

  function updateRow(index: number, patch: Partial<RowState>) {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function rowIndex(name: string): number {
    return rows.findIndex((row) => row.name === name);
  }

  async function saveRow(name: string) {
    const index = rowIndex(name);
    if (index === -1) return;

    const row = rows[index];
    updateRow(index, { saving: true, saved: false, error: null });

    const salePrice = parseDecimalTr(row.salePricePerDay);
    const feeValue = parseDecimalTr(row.trainerFeeValue);

    try {
      const response = await fetch("/api/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: row.clientId,
          name: row.name,
          salePricePerDay: salePrice,
          trainerFeeMode: row.trainerFeeMode,
          trainerFeeValue: feeValue,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Kayıt başarısız");

      const saved = data.client as ClientWithPricing;
      updateRow(index, {
        ...toRow(saved),
        saving: false,
        saved: true,
        error: null,
      });
    } catch (error) {
      updateRow(index, {
        saving: false,
        error: error instanceof Error ? error.message : "Kayıt başarısız",
      });
    }
  }

  function addClient() {
    const name = newName.trim();
    if (!name) return;
    if (
      rows.some(
        (row) =>
          row.name.toLocaleLowerCase("tr-TR") === name.toLocaleLowerCase("tr-TR"),
      )
    ) {
      return;
    }
    setRows((current) => [
      ...current,
      {
        name,
        salePricePerDay: "",
        trainerFeeMode: "percent",
        trainerFeeValue: "",
        saving: false,
        saved: false,
        error: null,
      },
    ]);
    setNewName("");
  }

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Yeni müşteri
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addClient()}
            placeholder="Müşteri adı"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={addClient}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Ekle
        </button>
      </div>

      <p className="text-sm text-slate-500">
        Günlük satış fiyatı ve eğitmen hakedişi müşteri bazında girilir. Hakediş
        yüzde (satışın %) veya sabit TL/gün olabilir. Rakamlar 100.000 gibi
        gösterilir.
      </p>

      <div className="card overflow-x-auto">
        <table className="data-table min-w-[880px]">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left">Müşteri</th>
              <th className="px-4 py-3 text-left">Eğitmen</th>
              <th className="px-4 py-3 text-left">Günlük satış (₺)</th>
              <th className="px-4 py-3 text-left">Hakediş türü</th>
              <th className="px-4 py-3 text-left">Hakediş</th>
              <th className="px-4 py-3 text-left" />
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Henüz müşteri yok. Yukarıdan ekleyin veya takvim verisi geldikçe
                  öneriler görünür.
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => {
                const index = rowIndex(row.name);
                const salePrice = parseDecimalTr(row.salePricePerDay);
                const feeValue = parseDecimalTr(row.trainerFeeValue);
                const preview =
                  salePrice > 0 && feeValue > 0
                    ? row.trainerFeeMode === "percent"
                      ? `${formatTry((salePrice * feeValue) / 100)} / gün`
                      : `${formatTry(feeValue)} / gün`
                    : "—";

                return (
                  <tr key={`${row.clientId ?? "new"}-${row.name}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {row.name}
                      {!row.clientId && (
                        <span className="ml-2 text-xs text-amber-600">yeni</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {trainersByLabel[row.name] ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={row.salePricePerDay}
                        onChange={(e) =>
                          updateRow(index, {
                            salePricePerDay: e.target.value,
                            saved: false,
                          })
                        }
                        onBlur={() =>
                          updateRow(index, {
                            salePricePerDay: formatDecimalTr(
                              parseDecimalTr(row.salePricePerDay),
                            ),
                          })
                        }
                        placeholder="0"
                        className="w-32 rounded border border-slate-200 px-2 py-1.5 text-sm tabular-nums"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={row.trainerFeeMode}
                        onChange={(e) => {
                          const mode = e.target.value as TrainerFeeMode;
                          updateRow(index, {
                            trainerFeeMode: mode,
                            trainerFeeValue: formatFeeOnBlur(
                              mode,
                              row.trainerFeeValue,
                            ),
                            saved: false,
                          });
                        }}
                        className="rounded border border-slate-200 px-2 py-1.5 text-sm"
                      >
                        <option value="percent">% (satışın yüzdesi)</option>
                        <option value="fixed">₺ / gün (sabit)</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.trainerFeeValue}
                          onChange={(e) =>
                            updateRow(index, {
                              trainerFeeValue: e.target.value,
                              saved: false,
                            })
                          }
                          onBlur={() =>
                            updateRow(index, {
                              trainerFeeValue: formatFeeOnBlur(
                                row.trainerFeeMode,
                                row.trainerFeeValue,
                              ),
                            })
                          }
                          placeholder={row.trainerFeeMode === "percent" ? "0" : "0"}
                          className="w-28 rounded border border-slate-200 px-2 py-1.5 text-sm tabular-nums"
                        />
                        <span className="text-xs text-slate-500">{preview}</span>
                      </div>
                      {salePrice > 0 && feeValue > 0 ? (
                        <p className="mt-1 text-[11px] text-slate-400">
                          Örnek:{" "}
                          {trainerFeeLabel(row.trainerFeeMode, feeValue)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={row.saving}
                        onClick={() => saveRow(row.name)}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        {row.saving ? "Kaydediliyor…" : "Kaydet"}
                      </button>
                      {row.saved ? (
                        <p className="mt-1 text-xs text-emerald-600">Kaydedildi</p>
                      ) : null}
                      {row.error ? (
                        <p className="mt-1 max-w-[200px] text-xs text-red-600">
                          {row.error}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
