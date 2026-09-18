import { useId } from 'react';
export function Trophy({ small = false }: { small?: boolean }) {
  const prefix = useId().replace(/:/g, '');
  return (
    <svg
      className={small ? 'trophy-mark' : 'trophy-art'}
      viewBox="0 0 520 620"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${prefix}-ball`} cx=".31" cy=".22" r=".8">
          <stop stopColor="#fff2b9" />
          <stop offset=".25" stopColor="#e7c66b" />
          <stop offset=".65" stopColor="#aa772d" />
          <stop offset="1" stopColor="#362710" />
        </radialGradient>
        <linearGradient
          id={`${prefix}-base`}
          x1="130"
          y1="410"
          x2="370"
          y2="565"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#9b844e" />
          <stop offset=".4" stopColor="#4b442d" />
          <stop offset="1" stopColor="#191b16" />
        </linearGradient>
        <linearGradient
          id={`${prefix}-shine`}
          x1="180"
          y1="150"
          x2="350"
          y2="330"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff5bd" />
          <stop offset="1" stopColor="#856027" />
        </linearGradient>
        <filter id={`${prefix}-shadow`}>
          <feGaussianBlur stdDeviation="13" />
        </filter>
        <filter id={`${prefix}-grain`}>
          <feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" seed="8" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope=".14" />
          </feComponentTransfer>
          <feComposite in2="SourceGraphic" operator="in" />
          <feBlend in="SourceGraphic" mode="soft-light" />
        </filter>
        <clipPath id={`${prefix}-clip`}>
          <circle cx="260" cy="245" r="149" />
        </clipPath>
      </defs>
      <ellipse
        cx="265"
        cy="571"
        rx="160"
        ry="17"
        fill="#000"
        opacity=".65"
        filter={`url(#${prefix}-shadow)`}
      />
      <path
        d="M185 396L260 373L335 407L387 516L347 555L165 555L129 521L153 439Z"
        fill={`url(#${prefix}-base)`}
        stroke="#a08445"
        strokeOpacity=".35"
      />
      <path d="M185 396L209 472L165 555L129 521L153 439Z" fill="#625839" />
      <path d="M209 472L260 373L288 451L252 550L165 555Z" fill="#867343" opacity=".6" />
      <path d="M288 451L335 407L387 516L347 555L252 550Z" fill="#25271e" />
      <path
        d="M153 439L209 472L183 499M288 451L323 486L387 516M209 472L288 451M323 486L347 555"
        stroke="#c8a861"
        strokeOpacity=".22"
      />
      <path d="M224 379L233 408L286 415L301 374" fill={`url(#${prefix}-shine)`} />
      <circle
        cx="260"
        cy="245"
        r="149"
        fill={`url(#${prefix}-ball)`}
        stroke="#caa456"
        filter={`url(#${prefix}-grain)`}
      />
      <g clipPath={`url(#${prefix}-clip)`} stroke="#503411" strokeWidth="1.7" strokeOpacity=".75">
        <path
          d="M223 185L284 183L318 234L293 287L233 293L201 239Z"
          fill={`url(#${prefix}-shine)`}
        />
        <path d="M223 185L199 127L241 98L289 107L284 183M318 234L377 206L407 245L395 293L293 287M233 293L203 346L247 392L302 382L293 287M201 239L144 247L116 204L139 163L199 127M203 346L150 327L144 247M377 206L350 142L289 107M302 382L360 350L395 293" />
        <path
          d="M139 163L165 164L176 197L144 247M350 142L330 168L350 195L377 206M150 327L184 302L203 346M360 350L329 323L302 382"
          strokeOpacity=".35"
        />
      </g>
      <ellipse
        cx="218"
        cy="147"
        rx="48"
        ry="15"
        transform="rotate(-26 218 147)"
        fill="#fff8cf"
        opacity=".17"
      />
      <path d="M138 221C147 171 183 128 222 113" stroke="#fff3bc" strokeWidth="2" opacity=".5" />
      <path d="M182 546H332" stroke="#b79b57" strokeOpacity=".6" />
      <text
        x="260"
        y="529"
        textAnchor="middle"
        fill="#d7bd7d"
        fontSize="10"
        letterSpacing="3"
        fontFamily="serif"
      >
        SPFC · COMUNIDADE
      </text>
    </svg>
  );
}
