"use client";

import { Fragment, useMemo, useState } from "react";
import type { HotAllocation, HotClient, PipelineCategory, Trainer } from "@/lib/types";
import { formatTry } from "@/lib/pricing";
import { formatDecimalTr, parseDecimalTr } from "@/lib/number-format";

type Props = {
  category: PipelineCategory;
  initialClients: HotClient[];
  trainers: Trainer[];
  months: string[];
};

type RowState = {
  id?: string;
  name: string;
  category: PipelineCategory;
  potentialDays: string;
  dailyPrice: string;
  daysByTrainerMonth: Record<string, string>;
  saving: boolean;
  saved: boolean;
  error: string | null;
};

const CATEGORY_LABELS: Record<PipelineCategory, string> = {
  kesin: "Kesin",
  hot: "Hot",
};

function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });
}

function allocKey(trainerId: string, month: string): string {
  return `${trainerId}:${month}`;
}

function toRow(client: HotClient): RowState {
  const daysByTrainerMonth: Record<string, string> = {};
  for (const item of client.allocations) {
    if (item.days > 0) {
      daysByTrainerMonth[allocKey(item.trainerId, item.month)] = String(
        item.days,
      );
    }
  }
  return {
    id: client.id,
    name: client.name,
    category: client.category,
    potentialDays:
      client.potentialDays > 0 ? formatDecimalTr(client.potentialDays) : "",
    dailyPrice:
      client.dailyPrice > 0 ? formatDecimalTr(client.dailyPrice) : "",
    daysByTrainerMonth,
    saving: false,
    saved: false,
    error: null,
  };
}

function allocationsFromRow(row: RowState): HotAllocation[] {
  const items: HotAllocation[] = [];
  for (const [key, value] of Object.entries(row.daysByTrainerMonth)) {
    const days = parseDecimalTr(value);
    if (days <= 0) continue;
    const sep = key.indexOf(":");
    items.push({
      trainerId: key.slice(0, sep),
      month: key.slice(sep + 1),
      days,
    });
  }
  return items;
}

function allocatedSum(row: RowState): number {
  return allocationsFromRow(row).reduce((sum, item) => sum + item.days, 0);
}

export function PipelineSection({
  category,
  initialClients,
  trainers,
  months,
}: Props) {
  const categoryClients = useMemo(
    () => initialClients.filter((c) => c.category === category),
    [initialClients, category],
  );

  const [rows, setRows] = useState<RowState[]>(() =>
    categoryClients.map(toRow),
  );
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.name.localeCompare(b.name, "tr-TR")),
    [rows],
  );

  function rowKey(row: RowState): string {
    return `${category}:${row.id ?? row.name}`;
  }

  function updateRow(index: number, patch: Partial<RowState>) {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function findIndex(row: RowState): number {
    return rows.findIndex(
      (item) =>
        (row.id && item.id === row.id) ||
        (!row.id && !item.id && item.name === row.name),
    );
  }

  function toggle(key: string) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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
        category,
        potentialDays: "",
        dailyPrice: "",
        daysByTrainerMonth: {},
        saving: false,
        saved: false,
        error: null,
      },
    ]);
    setNewName("");
  }

  async function saveRow(row: RowState) {
    const index = findIndex(row);
    if (index === -1) return;

    const name = row.name.trim();
    if (!name) {
      updateRow(index, { error: "Müşteri adı gerekli" });
      return;
    }
    if (
      rows.some(
        (item, i) =>
          i !== index &&
          item.name.toLocaleLowerCase("tr-TR") === name.toLocaleLowerCase("tr-TR"),
      )
    ) {
      updateRow(index, { error: "Bu isimde başka bir müşteri var" });
      return;
    }

    const allocations = allocationsFromRow(row);
    const allocated = allocations.reduce((sum, item) => sum + item.days, 0);
    const potential = parseDecimalTr(row.potentialDays) || allocated;

    updateRow(index, { saving: true, saved: false, error: null, name });

    try {
      const response = await fetch("/api/hot", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          name,
          category: row.category,
          potentialDays: potential,
          dailyPrice: parseDecimalTr(row.dailyPrice),
          allocations,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Kayıt başarısız");

      const saved = data.client as HotClient;
      setRows((current) =>
        current.map((item, i) =>
          i === index ? { ...toRow(saved), saved: true } : item,
        ),
      );
    } catch (error) {
      updateRow(index, {
        saving: false,
        error: error instanceof Error ? error.message : "Kayıt başarısız",
      });
    }
  }

  async function removeRow(row: RowState) {
    const index = findIndex(row);
    if (index === -1) return;
    if (row.id) {
      const response = await fetch(`/api/hot?id=${encodeURIComponent(row.id)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        updateRow(index, { error: data.error ?? "Silinemedi" });
        return;
      }
    }
    setRows((current) => current.filter((_, i) => i !== index));
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900">
          {CATEGORY_LABELS[category]}
        </h2>
        <p className="text-sm text-slate-500">
          {category === "kesin"
            ? "Kesinleşmiş pipeline müşterileri."
            : "Sıcak / bekleyen pipeline müşterileri."}
        </p>
      </div>

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Yeni müşteri ({CATEGORY_LABELS[category]})
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
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Ekle
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table min-w-[720px]">
          <thead>
            <tr>
              <th className="w-[44px] px-2 py-3" />
              <th className="px-4 py-3 text-left">Müşteri</th>
              <th className="px-4 py-3 text-left">Potansiyel iş günü</th>
              <th className="px-4 py-3 text-left">Günlük fiyat</th>
              <th className="px-4 py-3 text-left" />
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Henüz {CATEGORY_LABELS[category].toLowerCase()} müşteri yok.
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => {
                const index = findIndex(row);
                const key = rowKey(row);
                const expanded = openIds.has(key);
                const allocated = allocatedSum(row);

                return (
                  <Fragment key={key}>
                    <tr>
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          onClick={() => toggle(key)}
                          aria-expanded={expanded}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-base font-bold text-slate-700 hover:bg-slate-50"
                        >
                          {expanded ? "−" : "+"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) =>
                            updateRow(index, {
                              name: e.target.value,
                              saved: false,
                              error: null,
                            })
                          }
                          onBlur={() =>
                            updateRow(index, { name: row.name.trim() })
                          }
                          placeholder="Müşteri adı"
                          className="w-full min-w-[160px] rounded border border-slate-200 px-2 py-1.5 text-sm font-medium text-slate-900"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.potentialDays}
                          onChange={(e) =>
                            updateRow(index, {
                              potentialDays: e.target.value,
                              saved: false,
                            })
                          }
                          onBlur={() =>
                            updateRow(index, {
                              potentialDays: row.potentialDays.trim()
                                ? formatDecimalTr(
                                    parseDecimalTr(row.potentialDays),
                                  )
                                : allocated > 0
                                  ? formatDecimalTr(allocated)
                                  : "",
                            })
                          }
                          placeholder={allocated > 0 ? String(allocated) : "0"}
                          className="w-28 rounded border border-slate-200 px-2 py-1.5 text-sm tabular-nums"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.dailyPrice}
                          onChange={(e) =>
                            updateRow(index, {
                              dailyPrice: e.target.value,
                              saved: false,
                            })
                          }
                          onBlur={() =>
                            updateRow(index, {
                              dailyPrice: row.dailyPrice.trim()
                                ? formatDecimalTr(
                                    parseDecimalTr(row.dailyPrice),
                                  )
                                : "",
                            })
                          }
                          placeholder="0"
                          className="w-32 rounded border border-slate-200 px-2 py-1.5 text-sm tabular-nums"
                        />
                        {parseDecimalTr(row.dailyPrice) > 0 ? (
                          <span className="ml-2 text-xs text-slate-400">
                            {formatTry(parseDecimalTr(row.dailyPrice))}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={row.saving}
                            onClick={() => saveRow(row)}
                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                          >
                            {row.saving ? "Kaydediliyor…" : "Kaydet"}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRow(row)}
                            className="text-xs text-slate-400 hover:text-red-600"
                          >
                            Sil
                          </button>
                        </div>
                        {row.saved ? (
                          <p className="mt-1 text-xs text-emerald-600">
                            Kaydedildi
                          </p>
                        ) : null}
                        {row.error ? (
                          <p className="mt-1 max-w-[220px] text-xs text-red-600">
                            {row.error}
                          </p>
                        ) : null}
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="bg-slate-50/80">
                        <td colSpan={5} className="px-3 py-3">
                          <div className="overflow-x-auto">
                            <table className="min-w-[640px] text-sm">
                              <thead>
                                <tr>
                                  <th className="px-2 py-2 text-left font-semibold text-slate-600">
                                    Eğitmen
                                  </th>
                                  {months.map((month) => (
                                    <th
                                      key={month}
                                      className="px-2 py-2 text-center font-semibold text-slate-600"
                                    >
                                      {formatMonth(month)}
                                    </th>
                                  ))}
                                  <th className="px-2 py-2 text-right font-semibold text-slate-600">
                                    Toplam
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {trainers.map((trainer) => {
                                  const monthDays = months.map((month) =>
                                    parseDecimalTr(
                                      row.daysByTrainerMonth[
                                        allocKey(trainer.id, month)
                                      ] ?? "",
                                    ),
                                  );
                                  const total = monthDays.reduce(
                                    (a, b) => a + b,
                                    0,
                                  );
                                  return (
                                    <tr key={trainer.id}>
                                      <td className="px-2 py-1.5 font-medium text-slate-800">
                                        {trainer.full_name}
                                      </td>
                                      {months.map((month) => {
                                        const fieldKey = allocKey(
                                          trainer.id,
                                          month,
                                        );
                                        return (
                                          <td
                                            key={fieldKey}
                                            className="px-1 py-1.5 text-center"
                                          >
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              value={
                                                row.daysByTrainerMonth[
                                                  fieldKey
                                                ] ?? ""
                                              }
                                              onChange={(e) =>
                                                updateRow(index, {
                                                  daysByTrainerMonth: {
                                                    ...row.daysByTrainerMonth,
                                                    [fieldKey]: e.target.value,
                                                  },
                                                  saved: false,
                                                })
                                              }
                                              placeholder="—"
                                              className="w-14 rounded border border-slate-200 bg-white px-1.5 py-1 text-center text-sm tabular-nums"
                                            />
                                          </td>
                                        );
                                      })}
                                      <td className="px-2 py-1.5 text-right tabular-nums font-medium text-slate-800">
                                        {total || "—"}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PipelineView({
  initialClients,
  trainers,
  months,
}: Omit<Props, "category">) {
  return (
    <div className="space-y-10">
      <p className="text-sm text-slate-500">
        Satırı açıp eğitmen adının yanına ay bazında gün yazın. Örnek: ÇBS →
        Muhammed → Eki → 5 gün.
      </p>
      <PipelineSection
        category="kesin"
        initialClients={initialClients}
        trainers={trainers}
        months={months}
      />
      <PipelineSection
        category="hot"
        initialClients={initialClients}
        trainers={trainers}
        months={months}
      />
    </div>
  );
}
