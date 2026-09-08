import { cn } from '@/lib/cn';
import { CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/States';

export function ChartCard({
  title,
  description,
  action,
  loading,
  height = 200,
  footer,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  loading?: boolean;
  height?: number;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('flex flex-col overflow-hidden rounded-lg border border-line bg-graphite', className)}>
      <div className="px-5 pb-1 pt-5">
        <CardHeader title={title} description={description} action={action} />
      </div>
      <div className="flex-1 px-5 py-4">
        {loading ? (
          <div className="flex items-end gap-2" style={{ height }} aria-busy="true">
            {[52, 74, 40, 88, 63, 96].map((value, index) => (
              <Skeleton key={index} className="flex-1 rounded-t" style={{ height: `${value}%` }} />
            ))}
          </div>
        ) : (
          children
        )}
      </div>
      {footer && <div className="border-t border-line px-5 py-3">{footer}</div>}
    </section>
  );
}
