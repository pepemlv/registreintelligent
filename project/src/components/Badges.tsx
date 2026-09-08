import type { DocumentStatus, Priority, TaskStatus, MailStatus } from '@/types';
import { statusConfig, priorityConfig, taskStatusConfig, mailStatusConfig } from '@/lib/documentConfig';

export function StatusBadge({ status, size = 'sm' }: { status: DocumentStatus; size?: 'sm' | 'xs' }) {
  const cfg = statusConfig[status];
  const sizing = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${cfg.bg} ${cfg.text} ${sizing}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export function TaskStatusBadge({ status, size = 'sm' }: { status: TaskStatus; size?: 'sm' | 'xs' }) {
  const cfg = taskStatusConfig[status];
  const sizing = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${cfg.bg} ${cfg.text} ${sizing}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export function MailStatusBadge({ status, size = 'sm' }: { status: MailStatus; size?: 'sm' | 'xs' }) {
  const cfg = mailStatusConfig[status];
  const sizing = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${cfg.bg} ${cfg.text} ${sizing}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = priorityConfig[priority];
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

export function Avatar({
  name,
  color,
  size = 'md',
}: {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const sizing =
    size === 'sm' ? 'h-7 w-7 text-[10px]' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-9 w-9 text-xs';
  return (
    <div className={`${sizing} ${color} rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-sm`}>
      {initials}
    </div>
  );
}
