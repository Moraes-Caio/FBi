interface Props {
  read?: boolean
  size?: number
  className?: string
}

export function DoubleCheck({ read = false, size = 16, className = '' }: Props) {
  const c = read ? '#34B7F1' : '#8696a0'
  return (
    <svg
      width={size}
      height={size * 0.625}
      viewBox="0 0 16 10"
      fill="none"
      className={className}
      style={{ display: 'inline-block', flexShrink: 0, verticalAlign: 'middle' }}
    >
      {/* Todos os 4 segmentos em 45° — checks geometricamente idênticos, deslocado +4.5 em x */}
      <path
        d="M0.5 5 L2.5 7 L7.5 2"
        stroke={c}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 5 L7 7 L12 2"
        stroke={c}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
