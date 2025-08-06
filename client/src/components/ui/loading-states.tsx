import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner = ({
  size = 'md',
  className,
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div
      className={cn(
        'border-2 border-muted border-t-primary rounded-full animate-spin',
        sizeClasses[size],
        className,
      )}
    />
  );
};

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
}

export const LoadingSkeleton = ({
  className,
  lines = 1,
}: LoadingSkeletonProps) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="loading-shimmer h-4 bg-muted rounded"
          style={{
            width: `${Math.random() * 40 + 60}%`,
          }}
        />
      ))}
    </div>
  );
};

interface LoadingCardProps {
  className?: string;
  showImage?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
}

export const LoadingCard = ({
  className,
  showImage = true,
  showTitle = true,
  showDescription = true,
}: LoadingCardProps) => {
  return (
    <div className={cn('card-enhanced p-4 space-y-3', className)}>
      {showImage && (
        <div className="loading-shimmer w-full h-32 bg-muted rounded-lg" />
      )}
      {showTitle && (
        <div className="loading-shimmer h-5 bg-muted rounded w-3/4" />
      )}
      {showDescription && (
        <div className="space-y-2">
          <div className="loading-shimmer h-4 bg-muted rounded w-full" />
          <div className="loading-shimmer h-4 bg-muted rounded w-2/3" />
        </div>
      )}
    </div>
  );
};

interface LoadingButtonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingButton = ({
  className,
  size = 'md',
}: LoadingButtonProps) => {
  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4',
    lg: 'h-12 px-6 text-lg',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-md bg-muted text-muted-foreground',
        sizeClasses[size],
        className,
      )}
    >
      <LoadingSpinner size="sm" className="mr-2" />
      Loading...
    </div>
  );
};

interface LoadingTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const LoadingTable = ({
  rows = 5,
  columns = 4,
  className,
}: LoadingTableProps) => {
  return (
    <div className={cn('card-enhanced overflow-hidden', className)}>
      <div className="p-4 border-b border-border">
        <div className="loading-shimmer h-6 bg-muted rounded w-1/4" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4">
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div
                  key={colIndex}
                  className="loading-shimmer h-4 bg-muted rounded"
                  style={{
                    width: `${Math.random() * 40 + 60}%`,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface LoadingListProps {
  items?: number;
  className?: string;
}

export const LoadingList = ({ items = 5, className }: LoadingListProps) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3 p-3">
          <div className="loading-shimmer w-10 h-10 bg-muted rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="loading-shimmer h-4 bg-muted rounded w-1/3" />
            <div className="loading-shimmer h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
};
