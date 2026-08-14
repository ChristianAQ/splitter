// Ambiguous characters (0/O, 1/I/L) removed so codes are easy to read aloud
// and type on a phone keyboard. 6 chars from this 31-symbol alphabet is
// ~31^6 ≈ 887M combinations — the actual uniqueness guarantee comes from
// groups.service.ts checking (and retrying on collision) against Firestore
// before committing, since there's no server generating this centrally in
// the Spark-plan architecture.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateInviteCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}
