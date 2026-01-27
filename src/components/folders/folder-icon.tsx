'use client';

import { Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

// Preset folder colors
export const FOLDER_COLORS = [
  { name: 'default', value: undefined, class: 'text-muted-foreground' },
  { name: 'blue', value: '#3b82f6', class: 'text-blue-500' },
  { name: 'green', value: '#22c55e', class: 'text-green-500' },
  { name: 'yellow', value: '#eab308', class: 'text-yellow-500' },
  { name: 'orange', value: '#f97316', class: 'text-orange-500' },
  { name: 'red', value: '#ef4444', class: 'text-red-500' },
  { name: 'purple', value: '#a855f7', class: 'text-purple-500' },
  { name: 'pink', value: '#ec4899', class: 'text-pink-500' },
] as const;

export type FolderColor = (typeof FOLDER_COLORS)[number]['value'];

interface FolderIconProps {
  color?: string;
  isOpen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function FolderIcon({
  color,
  isOpen = false,
  size = 'md',
  className,
}: FolderIconProps) {
  const Icon = isOpen ? FolderOpen : Folder;

  // Find matching color class or use inline style
  const colorConfig = FOLDER_COLORS.find((c) => c.value === color);
  const colorClass = colorConfig?.class ?? '';

  return (
    <Icon
      className={cn(sizeClasses[size], colorClass, className)}
      style={color && !colorConfig ? { color } : undefined}
      aria-hidden="true"
    />
  );
}

interface ColorPickerProps {
  value?: string;
  onChange: (color: string | undefined) => void;
  className?: string;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {FOLDER_COLORS.map((color) => (
        <button
          key={color.name}
          type="button"
          onClick={() => onChange(color.value)}
          className={cn(
            'h-6 w-6 rounded-full border-2 transition-all hover:scale-110',
            value === color.value
              ? 'border-primary ring-2 ring-primary/20'
              : 'border-transparent hover:border-muted-foreground/30'
          )}
          style={{
            backgroundColor: color.value ?? 'var(--muted)',
          }}
          aria-label={`Select ${color.name} color`}
        />
      ))}
    </div>
  );
}
