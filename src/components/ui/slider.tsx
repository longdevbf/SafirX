"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => {
  // ✅ Completely stable thumbCount - không depend vào props.value
  const thumbCount = React.useMemo(() => {
    // Chỉ dựa vào defaultValue hoặc fallback to 2 for range slider
    if (props.defaultValue && Array.isArray(props.defaultValue)) {
      return props.defaultValue.length
    }
    // Default to 2 thumbs for range slider
    return 2
  }, []) // ✅ Empty dependency array - computed once only

  // ✅ Static thumbs array - không thay đổi
  const thumbs = React.useMemo(() => {
    return Array.from({ length: thumbCount }, (_, index) => (
      <SliderPrimitive.Thumb
        key={index}
        className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      />
    ))
  }, [thumbCount])

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {thumbs}
    </SliderPrimitive.Root>
  )
})

Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }