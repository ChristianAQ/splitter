import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomSheet } from "../ui/BottomSheet";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { joinGroupByCode, previewInviteCode, type InvitePreview } from "../../services/groups.service";
import { groupIconComponent } from "../../lib/groupIcons";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function JoinGroupSheet({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { show } = useToast();
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [checking, setChecking] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const PreviewIcon = groupIconComponent(preview?.icon ?? "");

  function reset() {
    setCode("");
    setPreview(null);
    setError(null);
  }

  async function handleCheck() {
    if (!code.trim()) return;
    setChecking(true);
    setError(null);
    setPreview(null);
    try {
      const result = await previewInviteCode(code);
      if (!result) {
        setError("Ese código de invitación no es válido.");
      } else {
        setPreview(result);
      }
    } catch {
      setError("No se pudo comprobar el código. Inténtalo de nuevo.");
    } finally {
      setChecking(false);
    }
  }

  async function handleJoin() {
    if (!preview || !user || !profile) return;
    setJoining(true);
    try {
      const result = await joinGroupByCode(code, user.uid, profile.name, profile.photoUrl);
      show(result.alreadyMember ? "Ya eras miembro de este grupo" : "Te has unido al grupo", "success");
      reset();
      onClose();
      navigate(`/grupos/${result.groupId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo unir al grupo.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Unirse a un grupo"
      footer={
        preview ? (
          <Button onClick={handleJoin} loading={joining} className="w-full">
            Unirme a «{preview.groupName}»
          </Button>
        ) : (
          <Button onClick={handleCheck} loading={checking} disabled={!code.trim()} className="w-full">
            Comprobar código
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-4 pb-2 pt-1">
        <Input
          label="Código de invitación"
          placeholder="K7F2P9"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setPreview(null);
          }}
          autoCapitalize="characters"
          autoFocus
        />
        {error && <p className="text-sm font-medium text-negative">{error}</p>}

        {preview && (
          <div className="well flex animate-rise items-center gap-3 rounded-[18px] p-3.5">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]"
              style={{ backgroundColor: `${preview.color}33`, color: preview.color }}
            >
              <PreviewIcon size={20} strokeWidth={1.8} />
            </div>
            <p className="text-sm">
              Vas a unirte a <span className="font-semibold">"{preview.groupName}"</span>
            </p>
          </div>
        )}

      </div>
    </BottomSheet>
  );
}
