import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BottomSheet } from "../ui/BottomSheet";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { ColorPicker } from "../ui/ColorPicker";
import { FriendPickerList } from "./FriendPickerList";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useFriends } from "../../hooks/useFriends";
import { addFriendsToGroup, createGroup } from "../../services/groups.service";
import { USER_COLOR_PALETTE } from "../../lib/userColors";
import { GROUP_ICON_OPTIONS, DEFAULT_GROUP_ICON_KEY, groupIconComponent } from "../../lib/groupIcons";
import type { Currency } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateGroupSheet({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { show } = useToast();
  const { friends } = useFriends();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState(DEFAULT_GROUP_ICON_KEY);
  const [color, setColor] = useState(USER_COLOR_PALETTE[0].value);
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const valid = name.trim().length > 0;
  const PreviewIcon = groupIconComponent(icon);

  function toggleFriend(uid: string) {
    setSelectedFriends((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

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
      const invited = friends.filter((f) => selectedFriends.has(f.uid));
      if (invited.length > 0) {
        await addFriendsToGroup(groupId, user.uid, profile.name, invited);
      }
      show(invited.length > 0 ? `Grupo creado con ${invited.length} amigo${invited.length > 1 ? "s" : ""}` : "Grupo creado", "success");
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
            className="flex h-16 w-16 items-center justify-center rounded-3xl"
            style={{ backgroundColor: `${color}22`, color }}
          >
            <PreviewIcon size={28} strokeWidth={1.8} />
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
            {GROUP_ICON_OPTIONS.map(({ key, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setIcon(key)}
                className={`flex h-11 w-11 items-center justify-center rounded-2xl border-2 ${
                  icon === key
                    ? "border-accent text-accent"
                    : "border-transparent bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                }`}
              >
                <Icon size={20} strokeWidth={1.8} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">Color</p>
          <ColorPicker value={color} onChange={setColor} />
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

        <div>
          <p className="mb-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">Añadir amigos (opcional)</p>
          {friends.length === 0 ? (
            <p className="text-sm text-neutral-400">
              Aún no tienes amigos añadidos.{" "}
              <Link to="/amigos" onClick={onClose} className="font-semibold text-accent">
                Añade alguno
              </Link>{" "}
              para incluirlo directamente, o invita después con el código del grupo.
            </p>
          ) : (
            <FriendPickerList friends={friends} selected={selectedFriends} onToggle={toggleFriend} />
          )}
        </div>

        <Button onClick={handleCreate} loading={saving} disabled={!valid} size="lg">
          Crear grupo
        </Button>
      </div>
    </BottomSheet>
  );
}
