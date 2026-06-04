import { cn } from '@/lib/utils';
import { APP_NAME } from '@/src/lib/brand';

type AppLogoProps = {
  size?: number;
  className?: string;
  showName?: boolean;
  nameClassName?: string;
};

export function AppLogo({
  size = 48,
  className,
  showName = false,
  nameClassName,
}: AppLogoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <img
        src="/logo.svg"
        alt={APP_NAME}
        width={size}
        height={size}
        className="shrink-0 rounded-2xl"
      />
      {showName ? (
        <span className={cn('text-3xl font-bold tracking-tight', nameClassName)}>{APP_NAME}</span>
      ) : null}
    </div>
  );
}
