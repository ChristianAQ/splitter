import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomSheet } from "../ui/BottomSheet";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { createGroup } from "../../services/groups.service";
import { USER_COLOR_PALETTE } from "../../lib/userColors";
import type { Currency } from "../../types";

const ICONS = ["💰", "🏖️", "🏠", "🍽️", "✈️", "🎉", "🚗", "🎓", "⚽️", "🎁"];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateGroupSheet({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { show } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(USER_COLOR_PALETTE[0].value);
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [saving, setSaving] = useState(false);

  const valid = name.trim().length > 0;

  async function handleCreate() {
    if (!valid || !user || !profile) return;
    setSaving(true);
    try {
      const { groupId } = await createGroup(
        { name: name.trim(), description: description.trim() || undefined, icon, color, currency },
        user.uid,
        profile.name,
        profile.color
      );
      show("Grupo creado", "success");
      onClose();
      navigate(`/grupos/${groupId}`);
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo crear el grupo.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Nuevo grupo">
      <div className="flex flex-col gap-5 pb-2 pt-1">
        <div className="flex justify-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-3xl text-3xl"
            style={{ backgroundColor: `${color}22` }}
          >
            {icon}
          </div>
        </div>

        <Input label="Nombre" placeholder="Ej. Viaje a Italia" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <Input
          label="Descripción (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div>
          <p className="mb-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">Icono</p>
          <div className="flex flex-wrap gap-2">
            {ICONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl border-2 ${
                  icon === i ? "border-accent" : "border-transparent bg-neutral-100 dark:bg-neutral-800"
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">Color</p>
          <div className="flex flex-wrap gap-2">
            {USER_COLOR_PALETTE.map((c) => (
              <button
                key={c.value}
                type="button"
                aria-label={c.name}
                onClick={() => setColor(c.value)}
                className={`h-9 w-9 rounded-full border-2 ${color === c.value ? "border-neutral-900 dark:border-white" : "border-transparent"}`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">Moneda principal</p>
          <div className="flex gap-2">
            {(["EUR", "USD", "GBP"] as Currency[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`flex-1 rounded-2xl border py-2.5 text-sm font-semibold ${
                  currency === c ? "border-accent bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300" : "border-neutral-200 text-neutral-500 dark:border-neutral-700"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleCreate} loading={saving} disabled={!valid} size="lg">
          Crear grupo
        </Button>
      </div>
    </BottomSheet>
  );
}
