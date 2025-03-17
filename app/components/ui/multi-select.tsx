"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";

export interface Option {
  value: string;
  label: string;
  color?: string;
  disabled?: boolean;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options...",
  className,
  disabled = false,
}: MultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleUnselect = (option: Option) => {
    onChange(selected.filter((s) => s !== option.value));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current;
    if (input) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (input.value === "" && selected.length > 0) {
          const newSelected = selected.slice(0, -1);
          onChange(newSelected);
        }
      }
      if (e.key === "Escape") {
        input.blur();
      }
    }
  };

  const selectables = options.filter((option) => !selected.includes(option.value));

  return (
    <Command
      onKeyDown={handleKeyDown}
      className={cn(
        "overflow-visible bg-transparent",
        className
      )}
    >
      <div
        className="group rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
      >
        <div className="flex flex-wrap gap-1">
          {selected.map((selectedValue) => {
            const option = options.find((o) => o.value === selectedValue);
            if (!option) return null;
            return (
              <Badge
                key={option.value}
                variant="secondary"
                className={cn(
                  "rounded-sm px-1 font-normal",
                  option.color
                )}
              >
                {option.label}
                <button
                  type="button"
                  className="ml-1 rounded-sm opacity-50 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                  onClick={() => handleUnselect(option)}
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove {option.label}</span>
                </button>
              </Badge>
            );
          })}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            placeholder={selected.length === 0 ? placeholder : undefined}
            disabled={disabled}
            className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>
      <div className="relative mt-2">
        {open && selectables.length > 0 ? (
          <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
            <CommandGroup className="h-full overflow-auto">
              {selectables.map((option) => {
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      onChange([...selected, option.value]);
                      setInputValue("");
                    }}
                    className={cn(
                      "cursor-pointer",
                      option.disabled && "cursor-not-allowed opacity-50"
                    )}
                    disabled={option.disabled || disabled}
                  >
                    {option.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ) : null}
      </div>
    </Command>
  );
}
 