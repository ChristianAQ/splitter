import { useEffect } from "react";
import { Copy, Share2 } from "lucide-react";
import { Card } from "./Card";
import { Button } from "./Button";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ensureFriendCode } from "../../services/friends.service";

/** "Tu código" card, shared between Amigos and Perfil so it can be shared
 * from wherever you happen to be — one copy of the ensureFriendCode
 * bootstrap and the copy/share handlers instead of one per page.
 *
 * The code is just the uid — known synchronously from useAuth(), no
 * generation or loading state needed for display. The effect below only
 * keeps the *public preview* projection (friendCodes/{uid}) in sync in the
 * background, for whoever looks the code up. */
export function FriendCodeCard() {
  const { user, profile } = useAuth();
  const { show } = useToast();
  const myCode = user?.uid;

  useEffect(() => {
    if (!user || !profile) return;
    ensureFriendCode(user.uid, profile.name, profile.color, profile.photoUrl).catch(() => {
      /* silently retried next time this mounts */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, profile?.name, profile?.color, profile?.photoUrl]);

  async function handleCopyCode() {
    if (!myCode) return;
    try {
      await navigator.clipboard.writeText(myCode);
      show("Código copiado", "success");
    } catch {
      show(myCode);
    }
  }

  async function handleShareCode() {
    if (!myCode) return;
    const text = `Añádeme como amigo en Splitter con mi código: ${myCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Mi código de amigo en Splitter", text });
      } catch {
        /* user cancelled — no-op */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      show("Invitación copiada al portapapeles", "success");
    } catch {
      show("No se pudo compartir.", "error");
    }
  }

  return (
    <Card className="flex items-center gap-2">
      <span className="flex-1 truncate text-sm font-bold tracking-wide">{myCode ?? "······"}</span>
      <Button size="icon" variant="secondary" onClick={handleCopyCode} aria-label="Copiar código" disabled={!myCode}>
        <Copy size={17} strokeWidth={2.1} />
      </Button>
      <Button size="icon" variant="secondary" onClick={handleShareCode} aria-label="Compartir código" disabled={!myCode}>
        <Share2 size={17} strokeWidth={2.1} />
      </Button>
    </Card>
  );
}
