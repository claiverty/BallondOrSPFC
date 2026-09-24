export function HeroTrophy() {
  return (
    <>
      <img
        className="hero-trophy-top"
        src="/images/ballon-top.webp"
        srcSet="/images/ballon-top-1200.webp 1200w, /images/ballon-top.webp 1447w"
        sizes="(min-width: 700px) min(110vw, 1600px), min(145vw, 1450px)"
        alt=""
        fetchPriority="high"
        decoding="async"
      />
      <img
        className="hero-trophy-bottom"
        src="/images/ballon-bottom.webp"
        srcSet="/images/ballon-bottom-1200.webp 1200w, /images/ballon-bottom.webp 1744w"
        sizes="(min-width: 700px) min(120vw, 1800px), min(150vw, 1744px)"
        alt=""
        decoding="async"
      />
    </>
  );
}
