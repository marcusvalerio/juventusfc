import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PackageCheck } from 'lucide-react';
import { riseItem, staggerContainer } from '@/lib/motion';
import { EmptyState, Skeleton } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Progress';
import type { InventoryItem } from '@/types/domain';

export function StockAlerts({ items, loading }: { items: InventoryItem[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-4 px-5 py-4">
        {[0, 1, 2].map((index) => (
          <div key={index}>
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="mt-2 h-1 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        compact
        icon={<PackageCheck className="text-success" />}
        title="Estoque em dia"
        description="Nenhum item abaixo do mínimo definido."
      />
    );
  }

  return (
    <motion.ul variants={staggerContainer(0.05)} initial="initial" animate="animate" className="flex flex-col">
      {items.map((item, index) => (
        <motion.li
          key={item.id}
          variants={riseItem}
          className={index > 0 ? 'border-t border-line px-5 py-3.5' : 'px-5 py-3.5'}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{item.name}</span>
            <Badge tone={item.status === 'esgotado' ? 'danger' : 'warn'}>
              {item.quantity} / {item.minQuantity} {item.unit}
            </Badge>
          </div>
          <ProgressBar
            className="mt-2.5"
            value={(item.quantity / Math.max(item.minQuantity, 1)) * 100}
            tone={item.status === 'esgotado' ? 'danger' : 'gold'}
            label={`Estoque de ${item.name}`}
          />
        </motion.li>
      ))}
      <li className="px-5 pb-4 pt-3">
        <Link to="/app/estoque" className="text-2xs text-gold transition-colors hover:text-gold-light">
          Abrir estoque →
        </Link>
      </li>
    </motion.ul>
  );
}
