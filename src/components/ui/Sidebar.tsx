"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Globe,
  Clock,
  Users,
  FileText,
  Crown,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useSidebar } from "@/components/providers/SidebarProvider";

const Sidebar = () => {
  const pathname = usePathname();
  const { isCollapsed, setIsCollapsed } = useSidebar();

  const routes = [
    {
      href: "/nations",
      label: "Nations",
      icon: Globe,
      active: pathname.startsWith("/nations"),
    },
    {
      href: "/empires",
      label: "Empires",
      icon: Crown,
      active: pathname.startsWith("/empires"),
    },
    {
      href: "/eras",
      label: "Eras",
      icon: Clock,
      active: pathname.startsWith("/eras"),
    },
    {
      href: "/population",
      label: "Population Records",
      icon: Users,
      active: pathname.startsWith("/population"),
    },
    {
      href: "/reports",
      label: "Reports",
      icon: FileText,
      active: pathname.startsWith("/reports"),
    },
  ];

  return (
    <div
      className={cn(
        "relative space-y-4 py-4 flex flex-col h-full bg-background text-foreground transition-all duration-300 border-r border-border",
        isCollapsed ? "w-[64px] shrink-0" : "w-[180px] md:w-[240px] shrink-0",
      )}
    >
      <div className="px-3 py-2">
        <Link href="/" onClick={(e) => e.stopPropagation()} className="block">
          <h2
            className={cn(
              "text-lg font-semibold tracking-tight transition-all duration-300 hover:text-primary",
              isCollapsed && "text-center",
            )}
          >
            {isCollapsed ? "PT" : "Population Tracker"}
          </h2>
        </Link>
      </div>
      <div className="px-3 py-2 flex-1">
        <div className="space-y-1">
          {routes.map((route) => (
            <Link
              key={route.href}
              aria-label={route.label}
              aria-current={route.active ? "page" : undefined}
              title={route.label}
              href={route.href}
              className={cn(
                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-foreground hover:bg-muted rounded-lg transition",
                route.active
                  ? "text-foreground bg-muted"
                  : "text-muted-foreground",
                isCollapsed && "justify-center",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center flex-1">
                <route.icon
                  className={cn(
                    "h-5 w-5",
                    isCollapsed ? "" : "mr-3",
                    route.active ? "text-primary" : "text-muted-foreground",
                  )}
                />
                {!isCollapsed && route.label}
              </div>
            </Link>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="mx-3 flex items-center justify-center rounded-md p-2 hover:bg-muted"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? (
          <PanelLeftOpen className="h-5 w-5" />
        ) : (
          <PanelLeftClose className="h-5 w-5" />
        )}
      </button>
    </div>
  );
};

export default Sidebar;
