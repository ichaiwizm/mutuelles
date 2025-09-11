import * as React from "react";
import { Calendar, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Calendar as CalendarComponent } from "./calendar";
import { format, parse, isValid } from "date-fns";
import { fr } from "date-fns/locale";

export interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  showCalendar?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onChange, label, error, showCalendar = true, minDate, maxDate, className, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState(value);

    React.useEffect(() => {
      setInputValue(value);
    }, [value]);

    // Validation de la date
    const isValidDate = React.useMemo(() => {
      if (!inputValue) return null;
      
      try {
        // Essayer plusieurs formats
        const formats = ['yyyy-MM-dd', 'dd/MM/yyyy', 'dd-MM-yyyy'];
        
        for (const formatStr of formats) {
          try {
            const parsedDate = parse(inputValue, formatStr, new Date());
            if (isValid(parsedDate)) {
              if (minDate && parsedDate < minDate) return false;
              if (maxDate && parsedDate > maxDate) return false;
              return true;
            }
          } catch {
            continue;
          }
        }
        return false;
      } catch {
        return false;
      }
    }, [inputValue, minDate, maxDate]);

    // Obtenir la date parsée pour le calendrier
    const parsedDate = React.useMemo(() => {
      if (!inputValue || !isValidDate) return undefined;
      
      const formats = ['yyyy-MM-dd', 'dd/MM/yyyy', 'dd-MM-yyyy'];
      
      for (const formatStr of formats) {
        try {
          const parsed = parse(inputValue, formatStr, new Date());
          if (isValid(parsed)) return parsed;
        } catch {
          continue;
        }
      }
      return undefined;
    }, [inputValue, isValidDate]);

    // Gérer les changements de l'input
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      
      // Si c'est une date valide, mettre à jour la valeur
      if (!newValue) {
        onChange('');
      } else {
        // Essayer de parser et normaliser au format YYYY-MM-DD
        const formats = ['yyyy-MM-dd', 'dd/MM/yyyy', 'dd-MM-yyyy'];
        
        for (const formatStr of formats) {
          try {
            const parsed = parse(newValue, formatStr, new Date());
            if (isValid(parsed)) {
              const normalized = format(parsed, 'yyyy-MM-dd');
              onChange(normalized);
              break;
            }
          } catch {
            continue;
          }
        }
      }
    };

    // Gérer la sélection du calendrier
    const handleCalendarSelect = (date: Date | undefined) => {
      if (date) {
        const formatted = format(date, 'yyyy-MM-dd');
        setInputValue(formatted);
        onChange(formatted);
      }
      setIsOpen(false);
    };

    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
          </label>
        )}
        <div className="relative">
          <Input
            ref={ref}
            value={inputValue}
            onChange={handleInputChange}
            className={cn(
              showCalendar && "pr-10",
              isValidDate === false && "border-red-500 focus:border-red-500 focus:ring-red-500",
              isValidDate === true && "border-green-500 focus:border-green-500 focus:ring-green-500",
              className
            )}
            placeholder="YYYY-MM-DD ou DD/MM/YYYY"
            {...props}
          />
          {showCalendar && (
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-7 w-7 p-0 hover:bg-muted"
                  type="button"
                >
                  <CalendarDays className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="single"
                  selected={parsedDate}
                  onSelect={handleCalendarSelect}
                  disabled={(date) => {
                    if (minDate && date < minDate) return true;
                    if (maxDate && date > maxDate) return true;
                    return false;
                  }}
                  initialFocus
                  locale={fr}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
        {(error || isValidDate === false) && (
          <p className="text-sm text-red-500">
            {error || "Format de date invalide"}
          </p>
        )}
      </div>
    );
  }
);

DateInput.displayName = "DateInput";

export { DateInput };