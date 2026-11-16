import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { ColorPicker } from "../ui/ColorPicker";
import { BANK_SUGGESTIONS, newBankId } from "../../lib/banks";
import type { Bank } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  banks: Bank[];
  /** How many fixed expenses use each bank, to warn before removing one. */
  usage: Record<string, number>;
  onSave: (banks: Bank[]) => Promise<void>;
}

/** Add, rename, recolor or remove banks. Works on a draft; nothing changes
 * until "Guardar". */
export function BanksSheet({ open, onClose, banks, usage, onSave }: Props) {
  const [draft, setDraft] = useState<Bank[]>(banks);
  const [coloring, setColoring] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(banks);
      setColoring(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const names = draft.map((b) => b.name.trim().toLowerCase());
  const invalid = names.some((n, i) => !n || names.indexOf(n) !== i);
  const patch = (id: string, changes: Partial<Bank>) => setDraft((d) => d.map((b) => (b.id === id ? { ...b, ...changes } : b)));

  function addBank() {
    const used = new Set(names);
    const suggestion = BANK_SUGGESTIONS.find((s) => !used.has(s.name.toLowerCase()));
    const bank: Bank = { id: newBankId(), name: suggestion?.name ?? "", color: suggestion?.color ?? "#6366F1" };
    setDraft((d) => [...d, bank]);
    setColoring(bank.id);
  }

  async function handleSave() {
    if (invalid) return;
    setSaving(true);
    try {
      await onSave(draft.map((b) => ({ ...b, name: b.name.trim() })));
      onClose();
    } catch {
      /* the caller has already shown why */
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Tus bancos"
      footer={
        <Button className="w-full" onClick={handleSave} loading={saving} disabled={invalid}>
          Guardar
        </Button>
      }
    >
      <div className="flex flex-col gap-3 pb-2 pt-1">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Las cuentas desde las que pagas tus gastos fijos. Cada una con su color, para distinguirlas de un vistazo.
        </p>

        {draft.map((b) => {
          const count = usage[b.id] ?? 0;
          return (
            <div key={b.id} className="well rounded-[22px] p-3">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setColoring(coloring === b.id ? null : b.id)}
                  aria-label={`Cambiar el color de ${b.name || "este banco"}`}
                  aria-expanded={coloring === b.id}
                  className="pressable h-9 w-9 shrink-0 rounded-full ring-2 ring-white/70 dark:ring-white/15"
                  style={{ backgroundColor: b.color }}
                />
                <input
                  value={b.name}
                  maxLength={24}
                  placeholder="Nombre del banco"
                  aria-label="Nombre del banco"
                  onChange={(e) => patch(b.id, { name: e.target.value })}
                  className="field h-11 min-w-0 flex-1 rounded-2xl px-3.5 text-[16px] outline-none focus:!border-accent"
                />
                <button
                  type="button"
                  onClick={() => setDraft((d) => d.filter((x) => x.id !== b.id))}
                  aria-label={`Quitar ${b.name || "este banco"}`}
                  className="pressable flex h-11 w-9 shrink-0 items-center justify-center text-neutral-400 active:text-negative"
                >
                  <Trash2 size={17} strokeWidth={2} />
                </button>
              </div>
              {count > 0 && (
                <p className="mt-1.5 pl-[46px] text-xs text-neutral-500 dark:text-neutral-400">
                  {count} gasto{count === 1 ? "" : "s"} fijo{count === 1 ? "" : "s"}
                </p>
              )}
              {coloring === b.id && (
                <div className="mt-3 animate-rise pl-0.5">
                  <ColorPicker value={b.color} onChange={(color) => patch(b.id, { color })} />
                </div>
              )}
            </div>
          );
        })}

        {banks.some((b) => !draft.find((d) => d.id === b.id) && (usage[b.id] ?? 0) > 0) && (
          <p className="rounded-[18px] bg-amber-500/15 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
            Los gastos fijos de un banco que quites se quedan sin banco asignado; no se borran.
          </p>
        )}

        <button
          type="button"
          onClick={addBank}
          className="pressable flex items-center justify-center gap-1.5 rounded-[22px] border border-dashed border-neutral-300 py-3.5 text-sm font-semibold text-neutral-500 dark:border-neutral-600 dark:text-neutral-400"
        >
          <Plus size={16} strokeWidth={2.5} />
          Añadir banco
        </button>
      </div>
    </BottomSheet>
  );
}
