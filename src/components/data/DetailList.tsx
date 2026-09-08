import { cn } from '@/lib/cn';

export interface DetailItem {
  label: string;
  value: React.ReactNode;
  wide?: boolean;
}

/** Label/value grid used inside detail drawers and record views. */
export function DetailList({ items, columns = 2, className }: { items: DetailItem[]; columns?: 1 | 2; className?: string }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-5', columns === 2 ? 'sm:grid-cols-2' : '', className)}>
      {items.map((item) => (
        <div key={item.label} className={cn(item.wide && 'sm:col-span-2')}>
          <dt className="eyebrow">{item.label}</dt>
          <dd className="mt-1.5 text-[13px] leading-relaxed text-ink">{item.value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DetailSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('py-5 first:pt-0 last:pb-0', className)}>
      <h3 className="eyebrow mb-4">{title}</h3>
      {children}
    </section>
  );
}
