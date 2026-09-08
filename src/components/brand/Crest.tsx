import { cn } from '@/lib/cn';

/**
 * Club mark: a shield split by the vertical stripes of the shirt, with the
 * monogram cut out of the centre. Drawn as vector so it stays crisp at any size
 * and can later sit beside the real crest asset without a redesign.
 */
export function Crest({ className, title = 'Juventus F.C.' }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 36" className={cn('h-7 w-auto', className)} role="img" aria-label={title}>
      <defs>
        <clipPath id="crest-shield">
          <path d="M16 0.8 L30.4 5.2 V19.6 C30.4 27.6 24.2 33 16 35.2 C7.8 33 1.6 27.6 1.6 19.6 V5.2 Z" />
        </clipPath>
      </defs>

      <g clipPath="url(#crest-shield)">
        <rect x="0" y="0" width="32" height="36" fill="#0C0E12" />
        {[5.2, 13.2, 21.2].map((x) => (
          <rect key={x} x={x} y="0" width="3.4" height="36" fill="#C9A227" opacity="0.16" />
        ))}
      </g>

      <path
        d="M16 0.8 L30.4 5.2 V19.6 C30.4 27.6 24.2 33 16 35.2 C7.8 33 1.6 27.6 1.6 19.6 V5.2 Z"
        fill="none"
        stroke="#C9A227"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />

      <text
        x="16"
        y="23.4"
        textAnchor="middle"
        fill="#E0BE55"
        style={{ fontFamily: 'Sentient, Georgia, serif', fontSize: '15px', fontWeight: 500 }}
      >
        J
      </text>
    </svg>
  );
}
