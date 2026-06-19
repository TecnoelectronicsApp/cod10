const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  ACCEPTED: { label: 'Preparando', color: 'bg-blue-100 text-blue-800' },
  PICKED: { label: 'En camino', color: 'bg-purple-100 text-purple-800' },
  DELIVERED: { label: 'Entregado', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
  COMPLETED: { label: 'Completado', color: 'bg-gray-100 text-gray-800' },
};

export default function StatusBadge({ status }: { status: string }) {
  const info = STATUS_MAP[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${info.color}`}>
      {info.label}
    </span>
  );
}
