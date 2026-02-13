import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const tabsListVariants = cva(
  "inline-flex items-center justify-center text-muted-foreground",
  {
    variants: {
      variant: {
        default: "h-10 rounded-md bg-muted p-1",
        underline: "h-auto border-b border-border bg-transparent p-0 gap-2",
        pill: "h-auto bg-transparent p-0 gap-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>,
    VariantProps<typeof tabsListVariants> {}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(tabsListVariants({ variant }), className)}
    data-variant={variant}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const tabsTriggerVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "rounded-sm px-3 py-1.5 text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        underline:
          "relative px-4 py-2.5 text-sm rounded-none border-b-2 border-transparent -mb-px data-[state=active]:border-primary data-[state=active]:text-foreground hover:text-foreground/80 hover:bg-muted/50",
        pill:
          "rounded-full px-4 py-2 text-sm bg-transparent hover:bg-muted/50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof tabsTriggerVariants> {
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, variant, icon, badge, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(tabsTriggerVariants({ variant }), "gap-2", className)}
    {...props}
  >
    {icon && <span className="shrink-0">{icon}</span>}
    {children}
    {badge && <span className="shrink-0">{badge}</span>}
  </TabsPrimitive.Trigger>
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      // Animation on content change
      "data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-2",
      "data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

// Animated Tabs with sliding indicator (for underline variant)
interface AnimatedTabsProps {
  tabs: { value: string; label: string; icon?: React.ReactNode }[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children?: React.ReactNode;
}

const AnimatedTabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  AnimatedTabsProps
>(
  (
    { tabs, defaultValue, value, onValueChange, className, children, ...props },
    ref
  ) => {
    const [activeTab, setActiveTab] = React.useState(
      value || defaultValue || tabs[0]?.value
    );
    const [indicatorStyle, setIndicatorStyle] = React.useState({
      left: 0,
      width: 0,
    });
    const tabsRef = React.useRef<Map<string, HTMLButtonElement>>(new Map());

    React.useEffect(() => {
      const currentTab = value || activeTab;
      const tabElement = tabsRef.current.get(currentTab || "");
      if (tabElement) {
        setIndicatorStyle({
          left: tabElement.offsetLeft,
          width: tabElement.offsetWidth,
        });
      }
    }, [value, activeTab]);

    const handleValueChange = (newValue: string) => {
      setActiveTab(newValue);
      onValueChange?.(newValue);
    };

    return (
      <Tabs
        ref={ref}
        value={value || activeTab}
        onValueChange={handleValueChange}
        className={className}
        {...props}
      >
        <div className="relative">
          <TabsList variant="underline" className="w-full justify-start">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                ref={(el) => {
                  if (el) tabsRef.current.set(tab.value, el);
                }}
                value={tab.value}
                variant="underline"
                icon={tab.icon}
                className="border-b-transparent"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {/* Animated indicator */}
          <div
            className="absolute bottom-0 h-0.5 bg-primary transition-all duration-300 ease-out"
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
            }}
          />
        </div>
        {children}
      </Tabs>
    );
  }
);
AnimatedTabs.displayName = "AnimatedTabs";

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  AnimatedTabs,
  tabsListVariants,
  tabsTriggerVariants,
};
