import Image from 'next/image';

type BrandLogoProps = {
  /** Tamaño del logo (equivale al emoji 🍔 ~48px) */
  size?: number;
  showText?: boolean;
  tagline?: string;
  className?: string;
  textClassName?: string;
  taglineClassName?: string;
  variant?: 'light' | 'dark';
};

export default function BrandLogo({
  size = 48,
  showText = true,
  tagline,
  className = '',
  textClassName = '',
  taglineClassName = '',
  variant = 'dark',
}: BrandLogoProps) {
  const titleColor =
    variant === 'light' ? 'text-white' : 'text-orange-600';
  const subtitleColor =
    variant === 'light' ? 'text-orange-100' : 'text-gray-500';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src="/codigo10.png"
        alt="Codigo 10"
        width={size}
        height={size}
        className="shrink-0 object-contain"
        style={{ width: size, height: size }}
        priority
      />
      {showText && (
        <div>
          <p
            className={`text-xl font-bold leading-tight md:text-2xl ${titleColor} ${textClassName}`}
          >
            Codigo 10
          </p>
          {tagline && (
            <p className={`text-sm ${subtitleColor} ${taglineClassName}`}>
              {tagline}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
