// team-management-member-table.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 as cn } from "../infra/dialog-content.jsx";
function Table({ className, ...props }) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}
function TableHeader({ className, ...props }) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "[&_tr]:[border-bottom-width:var(--divider-width)]",
        className,
      )}
      {...props}
    />
  );
}
function TableBody({ className, ...props }) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}
function TableRow({ className, ...props }) {
  return (
    <tr
      data-slot="table-row"
      className={cn("border-b", className)}
      {...props}
    />
  );
}
function TableHead({ className, ...props }) {
  return (
    <th
      data-slot="table-head"
      className={cn("text-left align-middle font-medium", className)}
      {...props}
    />
  );
}
function TableCell({ className, ...props }) {
  return (
    <td
      data-slot="table-cell"
      className={cn("align-middle", className)}
      {...props}
    />
  );
}
export function TeamManagementMemberTable({
  showCredits = true,
  headerSelection,
  memberLabel,
  roleLabel,
  quotaLabel,
  usageLabel,
  actionLabel,
  uidPrefix,
  rows,
}) {
  const showSelection = headerSelection !== void 0;
  const showUsage = showCredits && usageLabel !== void 0;
  const showAction = actionLabel !== void 0;
  return (
    <div className="overflow-clip rounded-lg border border-border [&_[data-slot=table-container]]:overflow-visible">
      <Table className="min-w-[36rem] table-fixed">
        <colgroup>
          {showSelection ? <col className="w-10" /> : null}
          <col />
          {showCredits ? <col className="w-28" /> : null}
          {showUsage ? <col className="w-28" /> : null}
          {showAction ? <col className="w-30" /> : null}
        </colgroup>
        <TableHeader className="sticky top-0 z-10 bg-muted">
          <TableRow>
            {showSelection ? (
              <TableHead className="px-3 py-1.5 text-[11px] text-muted-foreground">
                {headerSelection}
              </TableHead>
            ) : null}
            <TableHead className="min-w-0 break-words px-3 py-1.5 text-[11px] text-muted-foreground">
              {memberLabel}
            </TableHead>
            {showCredits ? (
              <TableHead className="min-w-0 break-words px-3 py-1.5 text-center text-[11px] text-muted-foreground">
                {quotaLabel}
              </TableHead>
            ) : null}
            {showUsage ? (
              <TableHead className="min-w-0 break-words px-3 py-1.5 text-center text-[11px] text-muted-foreground">
                {usageLabel}
              </TableHead>
            ) : null}
            {showAction ? (
              <TableHead className="px-3 py-1.5 text-right text-[11px] text-muted-foreground">
                <div className="ml-auto grid w-full grid-cols-2 gap-1">
                  <span className="col-start-2 text-center">{actionLabel}</span>
                </div>
              </TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className="transition-colors hover:bg-foreground/[0.03]"
            >
              {showSelection ? (
                <TableCell className="px-3 py-2">{row.selection}</TableCell>
              ) : null}
              <TableCell className="px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-foreground">
                    {row.name}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    <span className="sr-only">
                      {roleLabel}
                      {": "}
                    </span>
                    {row.role}
                    {" · "}
                    {uidPrefix} {row.uid}
                  </p>
                </div>
              </TableCell>
              {showCredits ? (
                <TableCell className="min-w-0 break-words px-3 py-2 text-center text-xs text-muted-foreground">
                  {row.quota}
                </TableCell>
              ) : null}
              {showUsage ? (
                <TableCell className="min-w-0 break-words px-3 py-2 text-center text-xs text-muted-foreground">
                  {row.usage}
                </TableCell>
              ) : null}
              {showAction ? (
                <TableCell className="px-3 py-2 text-right">
                  {row.action}
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
