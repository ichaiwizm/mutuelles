import * as React from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DateRangePickerProps {
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
  className?: string
}

export function DateRangePicker({ 
  date,
  onDateChange,
  className 
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleSelect = (newDate: DateRange | undefined) => {
    onDateChange(newDate)
    
    // Fermer automatiquement si les deux dates sont sélectionnées
    if (newDate?.from && newDate?.to) {
      setIsOpen(false)
    }
  }

  const formatDateRange = () => {
    if (!date?.from) {
      return "Sélectionner une période"
    }

    if (date.to) {
      return `${format(date.from, "dd/MM", { locale: fr })} - ${format(date.to, "dd/MM", { locale: fr })}`
    }

    return format(date.from, "dd/MM/yyyy", { locale: fr })
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-slate-500"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Du:</span>
                <input
                  type="date"
                  value={date?.from ? format(date.from, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    const newDate = e.target.value ? new Date(e.target.value) : undefined
                    handleSelect({
                      from: newDate,
                      to: date?.to
                    })
                  }}
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Au:</span>
                <input
                  type="date"
                  value={date?.to ? format(date.to, "yyyy-MM-dd") : ""}
                  min={date?.from ? format(date.from, "yyyy-MM-dd") : undefined}
                  onChange={(e) => {
                    const newDate = e.target.value ? new Date(e.target.value) : undefined
                    handleSelect({
                      from: date?.from,
                      to: newDate
                    })
                  }}
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                />
              </div>
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleSelect}
              numberOfMonths={2}
              locale={fr}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onDateChange(undefined)
                  setIsOpen(false)
                }}
              >
                Effacer
              </Button>
              <Button
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={!date?.from || !date?.to}
              >
                Appliquer
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}