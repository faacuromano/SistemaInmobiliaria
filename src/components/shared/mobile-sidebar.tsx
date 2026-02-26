"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import type { Role } from "@/types/enums";

type MobileSidebarProps = {
  userRole: Role;
  userName: string;
  permissions: string[];
};

export function MobileSidebar({
  userRole,
  userName,
  permissions,
}: MobileSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-56 p-0"
        showCloseButton={false}
      >
        <SheetTitle className="sr-only">Menu de navegacion</SheetTitle>
        <Sidebar
          userRole={userRole}
          userName={userName}
          permissions={permissions}
          className="w-full border-r-0"
          onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
