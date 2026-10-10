export type AvatarState =
  | "idle"
  | "greeting"
  | "listening"
  | "thinking"
  | "speaking"
  | "positive"
  | "negative"
  | "error";
export const stateClips: Record<AvatarState, string> = {
  idle: "Idle",
  greeting: "Wave",
  listening: "Idle",
  thinking: "Idle",
  speaking: "Idle",
  positive: "ThumbsUp",
  negative: "No",
  error: "Idle",
};
export const oneShotStates = new Set<AvatarState>([
  "greeting",
  "positive",
  "negative",
]);
export function afterAnimation(
  state: AvatarState,
  base: AvatarState,
): AvatarState {
  return oneShotStates.has(state) ? base : state;
}
