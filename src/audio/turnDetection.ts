/** Shared by backend session creation and client updates: brief pauses are not turns. */
export const turnDetection = {
  type: "server_vad",
  threshold: 0.5,
  prefix_padding_ms: 350,
  silence_duration_ms: 850,
  create_response: false,
  interrupt_response: false,
} as const;
