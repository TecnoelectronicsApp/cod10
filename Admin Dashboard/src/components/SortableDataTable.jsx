import React, { useState, useEffect, useCallback, useRef } from "react";
import DataTable from "react-data-table-component";
import CustomLoader from "./Loader/CustomLoader";
import {
  DragHandle,
  reorderList,
  rowIndexFromPoint,
  preventSelection,
  restoreSelection,
} from "../utils/dragReorder";

export default function SortableDataTable({
  title,
  columns,
  data,
  loading,
  reordering,
  onReorder,
  hint,
  t,
  ...rest
}) {
  const [rows, setRows] = useState(data || []);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const draggingRef = useRef(null);
  const overRef = useRef(null);
  const rowsRef = useRef(rows);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    setRows(data || []);
  }, [data]);

  const finishDrag = useCallback(
    async (from, to) => {
      if (from === null || to === null || from === to) return;
      const current = rowsRef.current;
      const next = reorderList(current, from, to);
      setRows(next);
      rowsRef.current = next;
      try {
        await onReorder(next.map((row) => row._id));
      } catch (e) {
        setRows(data || []);
        rowsRef.current = data || [];
      }
    },
    [data, onReorder]
  );

  const setOver = useCallback((idx) => {
    overRef.current = idx;
    setOverIndex(idx);
  }, []);

  const handleGrab = useCallback((index, e) => {
    e.preventDefault();
    draggingRef.current = index;
    overRef.current = index;
    setDraggingIndex(index);
    setOverIndex(index);
    preventSelection();
  }, []);

  useEffect(() => {
    if (draggingIndex === null) return undefined;

    const blockSelect = (e) => e.preventDefault();

    const updateOver = (x, y) => {
      const idx = rowIndexFromPoint(x, y, rowsRef.current);
      if (idx !== null) setOver(idx);
    };

    const onMouseMove = (e) => {
      if (draggingRef.current === null) return;
      e.preventDefault();
      updateOver(e.clientX, e.clientY);
    };

    const onTouchMove = (e) => {
      if (draggingRef.current === null) return;
      const touch = e.touches[0];
      if (!touch) return;
      e.preventDefault();
      updateOver(touch.clientX, touch.clientY);
    };

    const endDrag = () => {
      const from = draggingRef.current;
      const to = overRef.current;
      draggingRef.current = null;
      overRef.current = null;
      setDraggingIndex(null);
      setOverIndex(null);
      restoreSelection();
      finishDrag(from, to);
    };

    document.addEventListener("selectstart", blockSelect);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", endDrag);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", endDrag);

    return () => {
      document.removeEventListener("selectstart", blockSelect);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", endDrag);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", endDrag);
      restoreSelection();
    };
  }, [draggingIndex, setOver, finishDrag]);

  const handleRowEnter = useCallback(
    (row) => {
      if (draggingRef.current === null) return;
      const idx = rowsRef.current.findIndex((r) => r._id === row._id);
      if (idx >= 0) setOver(idx);
    },
    [setOver]
  );

  const sortableColumns = [
    {
      name: "",
      width: "56px",
      cell: (row, index) => <DragHandle index={index} onGrab={handleGrab} />,
    },
    ...columns,
  ];

  const conditionalRowStyles = [
    {
      when: (row) =>
        draggingIndex !== null &&
        rows[overIndex] &&
        rows[overIndex]._id === row._id,
      style: {
        backgroundColor: "rgba(251, 99, 64, 0.15) !important",
        borderTop: "2px solid #fb6340",
        borderBottom: "2px solid #fb6340",
      },
    },
    {
      when: (row) =>
        draggingIndex !== null &&
        rows[draggingIndex] &&
        rows[draggingIndex]._id === row._id,
      style: { opacity: 0.55 },
    },
  ];

  return (
    <>
      {hint && (
        <p className="text-muted small px-4 pt-3 mb-0">
          {hint}
          {draggingIndex !== null ? ` · ${t("Drag to reorder")}…` : ""}
          {reordering ? ` · ${t("Saving")}…` : ""}
        </p>
      )}
      <div style={{ userSelect: draggingIndex !== null ? "none" : "auto" }}>
        <DataTable
          title={title}
          columns={sortableColumns}
          data={rows}
          keyField="_id"
          progressPending={loading || reordering}
          progressComponent={<CustomLoader />}
          pagination={false}
          highlightOnHover={draggingIndex === null}
          conditionalRowStyles={conditionalRowStyles}
          onRowMouseEnter={handleRowEnter}
          {...rest}
        />
      </div>
    </>
  );
}
