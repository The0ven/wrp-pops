"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { Nation } from "@prisma/client";

export function FancyMultiSelect({
  selected,
  nations,
  placeholder,
  setSelected,
}: {
  selected: Nation[];
  nations: Nation[];
  placeholder: string;
  setSelected: (selected: Nation[]) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleUnselect = React.useCallback(
    (nation: Nation) => {
      setSelected(selected.filter((s) => s.id !== nation.id));
    },
    [selected, setSelected],
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (input) {
        if (e.key === "Delete" || e.key === "Backspace") {
          if (input.value === "" && selected.length > 0) {
            e.preventDefault();
            handleUnselect(selected[selected.length - 1]);
          }
        }
        // This is not a default behaviour of the <input /> field
        if (e.key === "Escape") {
          setOpen(false);
          input.blur();
        }
      }
    },
    [selected, handleUnselect],
  );

  const selectables = nations.filter(
    (nation) => !selected.some((item) => item.id === nation.id),
  );

  return (
    <Command
      onKeyDown={handleKeyDown}
      className="overflow-visible bg-transparent"
    >
      <div className="group rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex flex-wrap gap-1">
          {selected.map((nation) => {
            return (
              <Badge key={nation.id} variant="secondary">
                {nation.name}
                <button
                  type="button"
                  aria-label={`Remove ${nation.name}`}
                  className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => handleUnselect(nation)}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            );
          })}
          {/* Avoid having the "Search" Icon */}
          <CommandPrimitive.Input
            id="vassals"
            aria-label="Vassal Nations"
            ref={inputRef}
            value={inputValue}
            onValueChange={(value) => {
              setInputValue(value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
      <div className="relative mt-2">
        <CommandList>
          {open && selectables.length > 0 ? (
            <div className="w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
              <CommandGroup className="h-full overflow-auto max-h-[232px]">
                {selectables.map((nation) => {
                  return (
                    <CommandItem
                      key={nation.id}
                      value={`${nation.name} ${nation.id}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onSelect={(_value) => {
                        setInputValue("");
                        setSelected([...selected, nation]);
                        setOpen(false);
                        inputRef.current?.blur();
                      }}
                      className={"cursor-pointer"}
                    >
                      {nation.name}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </div>
          ) : null}
        </CommandList>
      </div>
    </Command>
  );
}
