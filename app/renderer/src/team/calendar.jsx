// calendar.jsx
import {
  Animation,
  ChevronDownIcon$1,
  ChevronLeftIcon,
  ChevronRightIcon,
  DayFlag,
  reactExports,
  UI,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Button$1, buttonVariants, cn$2 } from "../infra/dialog-content.jsx";
import { DayPicker } from "react-day-picker";

var SelectionState2;

(function (SelectionState3) {
  SelectionState3["range_end"] = "range_end";
  SelectionState3["range_middle"] = "range_middle";
  SelectionState3["range_start"] = "range_start";
  SelectionState3["selected"] = "selected";
})(SelectionState2 || (SelectionState2 = {}));

function getDefaultClassNames() {
  const classNames = {};
  for (const key2 in UI) {
    classNames[UI[key2]] = `rdp-${UI[key2]}`;
  }
  for (const key2 in DayFlag) {
    classNames[DayFlag[key2]] = `rdp-${DayFlag[key2]}`;
  }
  for (const key2 in SelectionState2) {
    classNames[SelectionState2[key2]] = `rdp-${SelectionState2[key2]}`;
  }
  for (const key2 in Animation) {
    classNames[Animation[key2]] = `rdp-${Animation[key2]}`;
  }
  return classNames;
}

function CalendarDayButton({
  className,
  day,
  modifiers: modifiers2,
  locale,
  ...props
}) {
  const defaultClassNames = getDefaultClassNames();
  const ref = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (modifiers2.focused) ref.current?.focus();
  }, [modifiers2.focused]);
  return (
    <Button$1
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers2.selected &&
        !modifiers2.range_start &&
        !modifiers2.range_end &&
        !modifiers2.range_middle
      }
      data-range-start={modifiers2.range_start}
      data-range-end={modifiers2.range_end}
      data-range-middle={modifiers2.range_middle}
      className={cn$2(
        "relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 rounded-lg border-0 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:bg-primary/10 data-[range-middle=true]:text-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  locale,
  formatters: formatters2,
  components: components2,
  ...props
}) {
  const defaultClassNames = getDefaultClassNames();
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn$2(
        "group/calendar bg-background p-2 [--cell-size:--spacing(7)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date2) =>
          date2.toLocaleString(locale?.code, {
            month: "short",
          }),
        ...formatters2,
      }}
      classNames={{
        root: cn$2("w-fit", defaultClassNames.root),
        months: cn$2(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months,
        ),
        month: cn$2("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn$2(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav,
        ),
        button_previous: cn$2(
          buttonVariants({
            variant: buttonVariant,
          }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_previous,
        ),
        button_next: cn$2(
          buttonVariants({
            variant: buttonVariant,
          }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_next,
        ),
        month_caption: cn$2(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
          defaultClassNames.month_caption,
        ),
        dropdowns: cn$2(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn$2(
          "relative rounded-lg",
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn$2(
          "absolute inset-0 bg-popover opacity-0",
          defaultClassNames.dropdown,
        ),
        caption_label: cn$2(
          "font-medium select-none",
          captionLayout === "label"
            ? "text-sm"
            : "flex items-center gap-1 rounded-lg text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
          defaultClassNames.caption_label,
        ),
        table: "w-full border-collapse",
        weekdays: cn$2("flex", defaultClassNames.weekdays),
        weekday: cn$2(
          "flex-1 rounded-lg text-[0.8rem] font-normal text-muted-foreground select-none",
          defaultClassNames.weekday,
        ),
        week: cn$2("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn$2(
          "w-(--cell-size) select-none",
          defaultClassNames.week_number_header,
        ),
        week_number: cn$2(
          "text-[0.8rem] text-muted-foreground select-none",
          defaultClassNames.week_number,
        ),
        day: cn$2(
          "group/day relative aspect-square h-full w-full rounded-lg p-0 text-center select-none",
          defaultClassNames.day,
        ),
        range_start: cn$2(
          "relative isolate z-0 rounded-lg bg-primary/10 after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-primary/10",
          defaultClassNames.range_start,
        ),
        range_middle: cn$2("rounded-lg", defaultClassNames.range_middle),
        range_end: cn$2(
          "relative isolate z-0 rounded-lg bg-primary/10 after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-primary/10",
          defaultClassNames.range_end,
        ),
        today: cn$2(
          "rounded-lg bg-muted text-foreground data-[selected=true]:rounded-lg",
          defaultClassNames.today,
        ),
        outside: cn$2(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside,
        ),
        disabled: cn$2(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled,
        ),
        hidden: cn$2("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className: className2, rootRef, ...props2 }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn$2(className2)}
              {...props2}
            />
          );
        },
        Chevron: ({ className: className2, orientation, ...props2 }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon
                className={cn$2("size-4", className2)}
                {...props2}
              />
            );
          }
          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn$2("size-4", className2)}
                {...props2}
              />
            );
          }
          return (
            <ChevronDownIcon$1
              className={cn$2("size-4", className2)}
              {...props2}
            />
          );
        },
        DayButton: ({ ...props2 }) => (
          <CalendarDayButton locale={locale} {...props2} />
        ),
        WeekNumber: ({ children: children2, ...props2 }) => {
          return (
            <td {...props2}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children2}
              </div>
            </td>
          );
        },
        ...components2,
      }}
      {...props}
    />
  );
}
