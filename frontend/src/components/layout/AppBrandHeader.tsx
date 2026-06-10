import { Check, UserKey, UserStar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND_LOGO_SRC } from '@/lib/brandAssets';

export function BrandMark() {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
        <img
          src={BRAND_LOGO_SRC}
          alt=""
          className="h-full w-full object-contain"
        />
      </div>
      <span className="whitespace-nowrap bg-gradient-to-r from-foreground to-primary bg-clip-text text-xl font-bold text-transparent">
        GêLeads
      </span>
    </div>
  );
}

export function AppBrandControl({ className }: { className?: string }) {
  return (
    <div className={cn('flex min-w-0 items-center justify-center', className)} aria-label="GêLeads">
      <BrandMark />
    </div>
  );
}
