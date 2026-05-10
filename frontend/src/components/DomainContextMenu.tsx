import { PropsWithChildren } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DomainContextMenuItem {
  label: string;
  onSelect: () => void;
  icon?: React.ReactNode;
}

interface DomainContextMenuProps extends PropsWithChildren {
  items: DomainContextMenuItem[]
}

export default function DomainContextMenu({ children, items } : DomainContextMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="ContextMenuTrigger">{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white border-2 border-gray-200 text-gray-700 rounded-md shadow-lg z-50 p-2">
        {items && items.map((item, index) => (
          <DropdownMenuItem key={index} onSelect={item.onSelect} className="flex items-center gap-2">
            {item.icon}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
