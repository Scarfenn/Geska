// Anchor and viewport use window coordinates; returned offsets are modal-local.
export function taskMenuPosition(anchor, viewport, size, insets) {
  const topLimit = Math.max(8, insets.top - viewport.y);
  const bottom = viewport.height - insets.bottom - 8;
  const maxHeight = Math.max(1, bottom - topLimit);
  const maxWidth = Math.max(1, viewport.width - 16);
  const width = Math.min(size?.width ?? 0, maxWidth);
  const height = Math.min(size?.height ?? 0, maxHeight);
  const below = anchor.y - viewport.y + anchor.height + 28;
  return {
    left: Math.max(8, Math.min(anchor.x - viewport.x + 32, viewport.width - width - 8)),
    top: Math.max(topLimit, Math.min(below, bottom - height)),
    maxWidth,
    maxHeight,
  };
}
