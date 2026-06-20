import React from "react";

export function DragHandle({ index, onGrab }) {
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label="Arrastrar para reordenar"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onGrab(index, e);
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onGrab(index, e);
      }}
      onDragStart={(e) => e.preventDefault()}
      style={{
        cursor: "grab",
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        fontSize: "1.25rem",
        color: "#8898aa",
        padding: "8px 10px",
        display: "inline-block",
        touchAction: "none",
        lineHeight: 1,
      }}
    >
      ⠿
    </span>
  );
}

export function reorderList(list, fromIndex, toIndex) {
  if (fromIndex === toIndex) return list;
  const next = [...list];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

/** Índice de fila bajo el cursor (react-data-table-component usa id="row-{key}"). */
export function rowIndexFromPoint(x, y, rows, keyField = "_id") {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;

  const rowEl = el.closest('[role="row"]');
  if (!rowEl || !rowEl.id || !rowEl.id.startsWith("row-")) return null;

  const rowKey = rowEl.id.slice(4);
  const idx = rows.findIndex((r) => String(r[keyField]) === rowKey);
  return idx >= 0 ? idx : null;
}

export function preventSelection() {
  document.body.style.userSelect = "none";
  document.body.style.webkitUserSelect = "none";
  document.body.style.cursor = "grabbing";
}

export function restoreSelection() {
  document.body.style.userSelect = "";
  document.body.style.webkitUserSelect = "";
  document.body.style.cursor = "";
}
