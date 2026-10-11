// Optional incubating APIs: always test methods on the live frame/session.
export type PersistentAnchor = XRAnchor & {
  requestPersistentHandle?: () => Promise<string>;
};
export type ExtendedSession = XRSession & {
  restorePersistentAnchor?: (handle: string) => Promise<PersistentAnchor>;
  deletePersistentAnchor?: (handle: string) => Promise<void>;
  persistentAnchors?: readonly string[];
};
