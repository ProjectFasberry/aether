import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { tv } from 'tailwind-variants';

const Table = ({ className, ...props }: HTMLAttributes<HTMLTableElement>) => (
  <div className="relative rounded-t-lg w-full overflow-x-auto">
    <table
      className={tv({ base: "w-full caption-bottom text-sm" })({ className })}
      {...props}
    />
  </div>
)

const TableHeader = ({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={tv({ base: "[&_tr]:border-b" })({ className })} {...props} />
)

const TableBody = ({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody
    className={tv({ base: "[&_tr:last-child]:border-0" })({ className })}
    {...props}
  />
)

const TableFooter = ({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) => (
  <tfoot
    className={tv({ base: "border-t border-neutral-700 bg-neutral-800/50 font-medium [&>tr]:last:border-b-0" })({ className })}
    {...props}
  />
)

const TableRow = ({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) => (
  <tr
    className={tv({ base: "border-b border-neutral-700 transition-colors hover:bg-neutral-800/50 data-[state=selected]:bg-neutral-700" })({ className })}
    {...props}
  />
)

const TableHead = ({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={tv({ base: "h-12 px-4 text-left align-middle font-medium [&:has([role=checkbox])]:pr-0" })({ className })}
    {...props}
  />
)

const TableCell = ({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td
    className={tv({ base: "p-4 align-middle [&:has([role=checkbox])]:pr-0" })({ className })}
    {...props}
  />
)

const TableCaption = ({ className, ...props }: HTMLAttributes<HTMLTableCaptionElement>) => (
  <caption
    className={tv({ base: 'mt-4 text-sm text-neutral-50' })({ className })}
    {...props}
  />
)

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}