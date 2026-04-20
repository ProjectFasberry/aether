import { useEffect, useMemo, useState } from "react";

interface MasonryGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  columnConfig: { [key: string]: number; default: number };
  className?: string;
  columnGap?: number;
  rowGap?: number;
}

const useColumnCount = (
  config: { 
    [key: string]: number; 
    default: number 
  }
): number => {
  const [columnCount, setColumnCount] = useState(config.default);

  useEffect(() => {
    const handleResize = () => {
      let newColumnCount = config.default;

      const sortedBreakpoints = Object.keys(config)
        .filter(k => k !== 'default')
        .map(Number)
        .sort((a, b) => b - a);

      for (const breakpoint of sortedBreakpoints) {
        if (window.innerWidth >= breakpoint) {
          newColumnCount = config[breakpoint.toString()]!;
          break;
        }
      }
      setColumnCount(newColumnCount);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [config]);

  return columnCount;
};

export function MasonryGrid<T>({
  items, renderItem, columnConfig, className = '', columnGap = 4, rowGap = 4,
}: MasonryGridProps<T>) {
  const numColumns = useColumnCount(columnConfig);

  const columns = useMemo(() => {
    const newColumns: T[][] = Array.from({ length: numColumns }, () => []);

    items.forEach((item, index) => {
      const columnIndex = index % numColumns;
      newColumns[columnIndex]?.push(item);
    });

    return newColumns;
  }, [items, numColumns]);

  return (
    <div className={`flex w-full gap-${columnGap} ${className}`}>
      {columns.map((columnItems, colIndex) => (
        <div key={colIndex} className={`flex flex-1 flex-col gap-${rowGap}`}>
          {columnItems.map((item, itemIndex) => (
            renderItem(item, colIndex * columnItems.length + itemIndex)
          ))}
        </div>
      ))}
    </div>
  );
}