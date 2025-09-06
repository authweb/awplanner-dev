// client/src/ui/icons/Icon.tsx
import { forwardRef } from 'react'
import type { SVGProps } from 'react'
import { iconRegistry, type IconName } from './registry'

export type IconProps = {
  name: IconName
  size?: number
  /** Цвет для currentColor-иконок (или используй className="text-...") */
  color?: string
  /** Толщина линии, если внутри иконки stroke="currentColor" */
  strokeWidth?: number
  className?: string
  title?: string
} & Omit<SVGProps<SVGSVGElement>, 'width' | 'height' | 'color'>

const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
  { name, size = 16, color, strokeWidth, className, title, style, ...rest },
  ref
) {
  const Cmp = iconRegistry[name]
  if (!Cmp) return null

  return (
    <Cmp
      ref={ref}
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={['inline-block', className].filter(Boolean).join(' ')}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : 'presentation'}
      title={title}
      style={color ? { ...style, color } : style}
      {...rest}
    />
  )
})

export default Icon
