interface SkProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Sk({ className = '', style }: SkProps) {
  return <div className={`sk ${className}`} style={style} />;
}
