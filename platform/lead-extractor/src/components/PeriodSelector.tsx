import * as React from "react"
import { Calendar as CalendarIcon, ChevronLeft, Settings } from "lucide-react"
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import DatePicker from 'react-datepicker'
import type { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import "react-datepicker/dist/react-datepicker.css"
import "./PeriodSelector.css"

interface PeriodSelectorProps {
  days: number
  setDays: (days: number) => void
  dateRange?: DateRange | null
  setDateRange?: (range: DateRange | undefined) => void
  filterMode: 'predefined' | 'custom'
  className?: string
}

interface Preset {
  label: string
  days: number
  icon?: React.ReactNode
}

const PRESETS: Preset[] = [
  { label: "7 derniers jours", days: 7 },
  { label: "15 derniers jours", days: 15 },
  { label: "30 derniers jours", days: 30 },
  { label: "60 derniers jours", days: 60 },
  { label: "90 derniers jours", days: 90 },
]

export function PeriodSelector({
  days,
  setDays,
  dateRange,
  setDateRange,
  filterMode,
  className
}: PeriodSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [showCustomPeriod, setShowCustomPeriod] = React.useState(false)
  const [tempStartDate, setTempStartDate] = React.useState<Date | null>(null)
  const [tempEndDate, setTempEndDate] = React.useState<Date | null>(null)

  // Initialiser les dates temporaires quand on ouvre le popover
  React.useEffect(() => {
    if (isOpen) {
      // Réinitialiser la vue sur les presets par défaut
      setShowCustomPeriod(false)
      
      if (dateRange?.from && dateRange?.to) {
        setTempStartDate(dateRange.from)
        setTempEndDate(dateRange.to)
      } else {
        // Initialiser avec les 7 derniers jours par défaut
        const end = new Date()
        const start = subDays(end, 7)
        setTempStartDate(start)
        setTempEndDate(end)
      }
    }
  }, [isOpen, dateRange])

  // Obtenir le texte affiché sur le bouton
  const getDisplayText = () => {
    if (filterMode === 'custom' && dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, "dd/MM", { locale: fr })} - ${format(dateRange.to, "dd/MM", { locale: fr })}`
    }
    
    const preset = PRESETS.find(p => p.days === days)
    return preset?.label || `${days} derniers jours`
  }

  // Gérer la sélection d'un preset
  const handlePresetClick = (presetDays: number) => {
    setDays(presetDays)
    setIsOpen(false)
  }

  // Basculer vers la période personnalisée
  const handleShowCustomPeriod = () => {
    setShowCustomPeriod(true)
  }

  // Retourner aux presets
  const handleBackToPresets = () => {
    setShowCustomPeriod(false)
  }

  // Gérer la sélection de dates personnalisées
  const handleDateChange = (dates: [Date | null, Date | null] | null) => {
    if (!dates) return
    
    const [start, end] = dates
    setTempStartDate(start)
    setTempEndDate(end)
  }

  // Appliquer les dates personnalisées
  const handleApplyCustomDates = () => {
    if (tempStartDate && tempEndDate && setDateRange) {
      setDateRange({
        from: startOfDay(tempStartDate),
        to: endOfDay(tempEndDate)
      })
      setIsOpen(false)
    }
  }

  // Annuler et fermer
  const handleCancel = () => {
    setTempStartDate(null)
    setTempEndDate(null)
    setIsOpen(false)
  }

  return (
    <div className={cn(className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-52 justify-start text-left font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {getDisplayText()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
          <div className="p-4">
            {!showCustomPeriod ? (
              // Vue des presets rapides
              <div className="period-selector-view space-y-4 w-64">
                {/* Titre */}
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <h4 className="font-medium text-sm">Choisir une période</h4>
                </div>

                {/* Presets rapides */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sélection rapide</p>
                  <div className="grid grid-cols-1 gap-1">
                    {PRESETS.map((preset) => (
                      <Button
                        key={preset.days}
                        variant={days === preset.days && filterMode === 'predefined' ? 'default' : 'ghost'}
                        size="sm"
                        className="justify-start"
                        onClick={() => handlePresetClick(preset.days)}
                      >
                        {preset.icon && <span className="mr-2">{preset.icon}</span>}
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Bouton pour période personnalisée */}
                <div className="border-t pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleShowCustomPeriod}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Période personnalisée
                  </Button>
                </div>
              </div>
            ) : (
              // Vue période personnalisée
              <div className="period-selector-view space-y-4">
                {/* En-tête avec bouton retour */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToPresets}
                    className="back-button p-1 h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    <h4 className="font-medium text-sm">Période personnalisée</h4>
                  </div>
                </div>
                
                {/* DatePicker */}
                <DatePicker
                  selected={tempStartDate}
                  onChange={handleDateChange}
                  startDate={tempStartDate}
                  endDate={tempEndDate}
                  selectsRange
                  inline
                  locale={fr}
                  dateFormat="dd/MM/yyyy"
                  monthsShown={1}
                  showPopperArrow={false}
                  maxDate={new Date()}
                  minDate={subDays(new Date(), 365)}
                />
                
                {/* Boutons d'action */}
                <div className="flex justify-end gap-2 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                  >
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApplyCustomDates}
                    disabled={!tempStartDate || !tempEndDate}
                  >
                    Appliquer
                  </Button>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}