/** ASR is imperfect: require a recognizable word rather than VAD alone. */
export function recognizableSpeech(
  text: string,
  durationMs: number,
  interrupting: boolean,
) {
  const clean = text.trim().toLocaleLowerCase("it");
  if (
    !clean ||
    clean.includes("[") ||
    clean.includes("]") ||
    clean.includes("<") ||
    clean.includes(">") ||
    /^(rumore|musica|silenzio|noise|inaudibile|incomprensibile)$/u.test(clean)
  )
    return false;
  const words = clean.match(/\p{L}+/gu) ?? [];
  if (
    !words.length ||
    words.every((word) => /^(eh|uh|ah|mmm|hmm|mm)$/u.test(word))
  )
    return false;
  const meaningful = words.some(
    (word) => word.length >= 3 || /^(sì|si|no)$/u.test(word),
  );
  // VAD timestamps include 350 ms of prefix. A short real answer remains valid.
  return meaningful && (!interrupting || durationMs >= 450);
}
