import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { ColorPicker } from "../ui/ColorPicker";
import { BANK_SUGGESTIONS, newBankId } from "../../lib/banks";
import type { Bank } from "../../types";

interface Props {
  banks: Bank[];
  value: string | undefined;
  onChange: (bankId: string | undefined) => void;
  /** Adds a bank to the user's list; resolves once it's saved. */
  onCreate: (bank: Bank) => Promise<void>;
}

/** Which bank a fixed expense is paid from: pick one, none, or add a new
 * one (name + color) without leaving the form. */
export function BankPicker({ banks, value, onChange, onCreate }: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(BANK_SUGGESTIONS[0].color);
  const [saving, setSaving] = useState(false);

  const taken = new Set(banks.map((b) => b.name.toLowerCase()));
  const suggestions = BANK_SUGGESTIONS.filter((s) => !taken.has(s.name.toLowerCase()));
  const trimmed = name.trim();
  const duplicate = taken.has(trimmed.toLowerCase());

  async function handleCreate() {
    if (!trimmed || duplicate) return;
    setSaving(true);
    const bank: Bank = { id: newBankId(), name: trimmed, color };
    try {
      await onCreate(bank);
      onChange(bank.id);
      setAdding(false);
      setName("");
    } catch {
      /* the caller has already shown why */
    } finally {
      setSaving(false);
    }
  }

  const chip = "pressable flex items-center gap-1.5 rounded-full border px-3 py-2 text-[13px] font-semibold";

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">Banco desde el que lo pagas</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Banco">
        <button
          type="button"
          role="radio"
          aria-checked={!value}
          onClick={() => onChange(undefined)}
          className={`${chip} ${
            !value ? "border-accent bg-accent/10 text-accent-700 dark:bg-accent/20 dark:text-accent-300" : "field text-neutral-600 dark:text-neutral-300"
          }`}
        >
          Sin banco
        </button>
        {banks.map((b) => {
          const selected = value === b.id;
          return (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(b.id)}
              style={selected ? { borderColor: b.color, backgroundColor: `${b.color}22` } : undefined}
              className={`${chip} ${selected ? "text-neutral-900 dark:text-white" : "field text-neutral-600 dark:text-neutral-300"}`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color }} aria-hidden />
              {b.name}
            </button>
          );
        })}
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={`${chip} border-dashed border-neutral-300 text-neutral-500 dark:border-neutral-600 dark:text-neutral-400`}
          >
            <Plus size={14} strokeWidth={2.5} />
            Nuevo banco
          </button>
        )}
      </div>

      {adding && (
        <div className="well mt-3 flex animate-rise flex-col gap-3 rounded-[22px] p-4">
          {suggestions.length > 0 && (
            <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
              {suggestions.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => {
                    setName(s.name);
                    setColor(s.color);
                  }}
                  className="surface pressable flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
                  {s.name}
                </button>
              ))}
            </div>
          )}
          <Input
            label="Nombre del banco"
            placeholder="Ej. ING, Santander"
            value={name}
            maxLength={24}
            error={duplicate ? "Ya tienes un banco con ese nombre." : undefined}
            onChange={(e) => setName(e.target.value)}
          />
          <div>
            <p className="mb-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">Color</p>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setAdding(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleCreate} loading={saving} disabled={!trimmed || duplicate}>
              Añadir banco
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
