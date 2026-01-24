import { ActivityCalendar } from 'react-activity-calendar';
import { useTheme } from 'next-themes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ActivityHeatmapProps {
  data: Array<{
    date: string;
    count: number;
    level: number;
  }>;
  onDateSelect?: (date: string | undefined) => void;
  selectedDate?: string;
}

export function ActivityHeatmap({ data, onDateSelect, selectedDate }: ActivityHeatmapProps) {
  const { theme } = useTheme();

  if (data.length === 0) {
    return <div className="text-sm text-muted-foreground">No activity yet</div>;
  }

  const nonZeroDays = data.reduce((acc, item) => acc + (item.count > 0 ? 1 : 0), 0);
  const maxCount = data.reduce((acc, item) => (item.count > acc ? item.count : acc), 0);

  return (
    <div className="w-full overflow-x-auto pb-2">
      {process.env.NODE_ENV !== 'production' && (
        <div className="text-xs text-muted-foreground mb-2">
          heatmap: {data.length} days, {nonZeroDays} active, max {maxCount}
        </div>
      )}
      <ActivityCalendar
        data={data}
        theme={{
          light: ['#e2e8f0', '#5eead4', '#2dd4bf', '#14b8a6', '#0f766e'],
          dark: ['#1e293b', '#134e4a', '#0f766e', '#14b8a6', '#2dd4bf'],
        }}
        colorScheme={theme === 'dark' ? 'dark' : 'light'}
        blockSize={12}
        blockMargin={4}
        fontSize={12}
        renderBlock={(block, activity) => {
          const isSelected = selectedDate === activity.date;
          return (
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div 
                    onClick={() => onDateSelect?.(isSelected ? undefined : activity.date)}
                    className={`cursor-pointer transition-all duration-200 ${
                      isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background z-10 scale-125' : ''
                    }`}
                  >
                    {block}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  {activity.count} bookmarks on {activity.date}
                  {isSelected && ' (Selected)'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }}
      />
    </div>
  );
}

