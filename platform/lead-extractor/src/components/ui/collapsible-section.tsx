import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

interface CollapsibleSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

const CollapsibleSection = React.forwardRef<HTMLDivElement, CollapsibleSectionProps>(
  ({ title, description, defaultOpen = false, icon, badge, children, className, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);

    return (
      <Card ref={ref} className={cn("w-full", className)} {...props}>
        <CardHeader
          className="cursor-pointer hover:bg-muted/50 transition-colors pb-3"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon && <div className="text-muted-foreground">{icon}</div>}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base leading-none">{title}</CardTitle>
                  {badge && badge}
                </div>
                {description && (
                  <CardDescription className="text-sm leading-tight">
                    {description}
                  </CardDescription>
                )}
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </div>
        </CardHeader>
        {isOpen && (
          <CardContent className="pt-0 pb-6 space-y-4">
            {children}
          </CardContent>
        )}
      </Card>
    );
  }
);

CollapsibleSection.displayName = "CollapsibleSection";

export { CollapsibleSection };