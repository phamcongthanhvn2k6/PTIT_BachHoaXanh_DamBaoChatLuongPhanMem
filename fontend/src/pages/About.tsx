import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import aboutHeroImg from "../assets/about-hero.png";
import aboutStoreImg from "../assets/about-store.png";
import aboutCtaBgImg from "../assets/about-cta-bg.png";

/* ------------------------------------------------------------------ */
/*  Animated counter hook — smoothly counts from 0 to `end`           */
/* ------------------------------------------------------------------ */
function useCountUp(end: number, duration = 2000) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            setValue(Math.floor(progress * end));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  return { value, ref };
}

/* ------------------------------------------------------------------ */
/*  Fade-in-on-scroll wrapper                                         */
/* ------------------------------------------------------------------ */
const FadeInSection: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({
  children,
  className = "",
  delay = 0,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

/* ================================================================== */
/*  ABOUT PAGE                                                        */
/* ================================================================== */
const About: React.FC = () => {
  const { t } = useTranslation();

  /* ---------- stat counters ---------- */
  const stat1 = useCountUp(15, 1800);
  const stat2 = useCountUp(20000, 2200);
  const stat3 = useCountUp(14, 1600);
  const stat4 = useCountUp(5, 1400);

  /* ---------- mission cards ---------- */
  const missionCards = [
    { icon: "verified", titleKey: "about.missionQualityTitle", descKey: "about.missionQualityDesc" },
    { icon: "local_shipping", titleKey: "about.missionConvenienceTitle", descKey: "about.missionConvenienceDesc" },
    { icon: "smart_toy", titleKey: "about.missionSmartTitle", descKey: "about.missionSmartDesc" },
  ];

  /* ---------- values ---------- */
  const values = [
    { icon: "workspace_premium", titleKey: "about.valueQualityTitle", descKey: "about.valueQualityDesc", color: "text-amber-500" },
    { icon: "speed", titleKey: "about.valueConvenienceTitle", descKey: "about.valueConvenienceDesc", color: "text-blue-500" },
    { icon: "handshake", titleKey: "about.valueTrustTitle", descKey: "about.valueTrustDesc", color: "text-emerald-500" },
    { icon: "support_agent", titleKey: "about.valueServiceTitle", descKey: "about.valueServiceDesc", color: "text-violet-500" },
    { icon: "eco", titleKey: "about.valueFreshnessTitle", descKey: "about.valueFreshnessDesc", color: "text-green-500" },
    { icon: "lightbulb", titleKey: "about.valueInnovationTitle", descKey: "about.valueInnovationDesc", color: "text-orange-500" },
  ];

  /* ---------- why choose us ---------- */
  const whyCards = [
    { icon: "category", titleKey: "about.whyCuratedTitle", descKey: "about.whyCuratedDesc" },
    { icon: "storefront", titleKey: "about.whyBranchTitle", descKey: "about.whyBranchDesc" },
    { icon: "auto_awesome", titleKey: "about.whySmartTitle", descKey: "about.whySmartDesc" },
    { icon: "thumb_up", titleKey: "about.whyReliableTitle", descKey: "about.whyReliableDesc" },
    { icon: "headset_mic", titleKey: "about.whySupportTitle", descKey: "about.whySupportDesc" },
    { icon: "devices", titleKey: "about.whyModernTitle", descKey: "about.whyModernDesc" },
  ];

  return (
    <>
      {/* ====================== HERO ====================== */}
      <section id="about-hero" className="relative min-h-[520px] md:min-h-[620px] flex items-center justify-center overflow-hidden">
        {/* Background image */}
        <img
          src={aboutHeroImg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.4), rgba(0,0,0,0.7))" }} />

        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto py-20">
          <FadeInSection>
            <span className="inline-block px-4 py-1.5 mb-6 rounded-full backdrop-blur-md text-white text-xs font-semibold tracking-widest uppercase" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}>
              {t("about.heroBadge")}
            </span>
          </FadeInSection>

          <FadeInSection delay={120}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight mb-5 drop-shadow-lg">
              {t("about.heroTitle")}
            </h1>
          </FadeInSection>

          <FadeInSection delay={240}>
            <p className="text-base sm:text-lg md:text-xl font-light leading-relaxed max-w-2xl mx-auto mb-10 drop-shadow" style={{ color: "rgba(255,255,255,0.9)" }}>
              {t("about.heroSubtitle")}
            </p>
          </FadeInSection>

          <FadeInSection delay={360}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/products"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#E60012] hover:bg-[#c9000f] text-white rounded-full font-semibold shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
              >
                <span className="material-symbols-outlined text-xl">shopping_bag</span>
                {t("about.shopNow")}
              </Link>
              <Link
                to="/products"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 backdrop-blur-md text-white rounded-full font-semibold transition-all duration-300 hover:opacity-90"
                style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }}
              >
                <span className="material-symbols-outlined text-xl">explore</span>
                {t("about.exploreProducts")}
              </Link>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ==================== OUR STORY ==================== */}
      <section id="about-story" className="py-20 md:py-28 px-6 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Text */}
            <FadeInSection>
              <div className="space-y-6">
                <span className="text-[#E60012] font-bold tracking-widest uppercase text-xs">
                  {t("about.storyLabel")}
                </span>
                <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-extrabold text-neutral-900 dark:text-white leading-tight">
                  {t("about.storyTitle")}
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400 text-base md:text-lg leading-relaxed">
                  {t("about.storyDesc1")}
                </p>
                <p className="text-neutral-600 dark:text-neutral-400 text-base md:text-lg leading-relaxed">
                  {t("about.storyDesc2")}
                </p>
              </div>
            </FadeInSection>

            {/* Image */}
            <FadeInSection delay={200}>
              <div className="relative group">
                <div className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-[#E60012]/10 to-[#FFD400]/10 blur-sm group-hover:blur-md transition-all duration-500" />
                <img
                  src={aboutStoreImg}
                  alt="Bách hóa XANH store"
                  className="relative rounded-2xl shadow-2xl w-full aspect-[4/3] object-cover ring-1 ring-black/5"
                />
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* ==================== OUR MISSION ==================== */}
      <section id="about-mission" className="py-20 md:py-28 px-6 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto">
          <FadeInSection>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold text-neutral-900 dark:text-white mb-4">
                {t("about.missionTitle")}
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 max-w-xl mx-auto text-base md:text-lg">
                {t("about.missionSubtitle")}
              </p>
            </div>
          </FadeInSection>

          <div className="grid md:grid-cols-3 gap-8">
            {missionCards.map((card, i) => (
              <FadeInSection key={card.titleKey} delay={i * 150}>
                <div className="bg-white dark:bg-neutral-800 p-8 md:p-10 rounded-2xl shadow-sm hover:shadow-lg border border-neutral-100 dark:border-neutral-700 transition-all duration-300 group h-full">
                  <div className="w-14 h-14 rounded-xl bg-[#E60012]/10 flex items-center justify-center mb-6 group-hover:bg-[#E60012] transition-colors duration-300">
                    <span className="material-symbols-outlined text-3xl text-[#E60012] group-hover:text-white transition-colors duration-300">
                      {card.icon}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">
                    {t(card.titleKey)}
                  </h3>
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed">
                    {t(card.descKey)}
                  </p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== KEY METRICS ==================== */}
      <section
        id="about-metrics"
        className="py-20 md:py-24 px-6 relative overflow-hidden"
        style={{ background: "linear-gradient(to bottom right, #E60012, #B8000F)" }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />

        <div className="max-w-7xl mx-auto relative z-10">
          <FadeInSection>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
                {t("about.metricsTitle")}
              </h2>
              <p className="text-base md:text-lg max-w-lg mx-auto" style={{ color: "rgba(255,255,255,0.8)" }}>
                {t("about.metricsSubtitle")}
              </p>
            </div>
          </FadeInSection>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {/* Stat 1: Years */}
            <FadeInSection delay={0}>
              <div
                ref={stat1.ref}
                className="text-center p-6 md:p-8 rounded-2xl backdrop-blur-sm"
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                <div className="text-4xl md:text-5xl font-black text-white mb-2">{stat1.value}+</div>
                <div className="text-xs uppercase tracking-widest font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>
                  {t("about.statYears")}
                </div>
              </div>
            </FadeInSection>

            {/* Stat 2: Products */}
            <FadeInSection delay={100}>
              <div
                ref={stat2.ref}
                className="text-center p-6 md:p-8 rounded-2xl backdrop-blur-sm"
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                <div className="text-4xl md:text-5xl font-black text-white mb-2">{stat2.value >= 20000 ? "20K+" : `${(stat2.value / 1000).toFixed(1)}K`}</div>
                <div className="text-xs uppercase tracking-widest font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>
                  {t("about.statProducts")}
                </div>
              </div>
            </FadeInSection>

            {/* Stat 3: Branches */}
            <FadeInSection delay={200}>
              <div
                ref={stat3.ref}
                className="text-center p-6 md:p-8 rounded-2xl backdrop-blur-sm"
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                <div className="text-4xl md:text-5xl font-black text-white mb-2">{stat3.value}+</div>
                <div className="text-xs uppercase tracking-widest font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>
                  {t("about.statBranches")}
                </div>
              </div>
            </FadeInSection>

            {/* Stat 4: Customers */}
            <FadeInSection delay={300}>
              <div
                ref={stat4.ref}
                className="text-center p-6 md:p-8 rounded-2xl backdrop-blur-sm"
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                <div className="text-4xl md:text-5xl font-black text-white mb-2">{stat4.value}M+</div>
                <div className="text-xs uppercase tracking-widest font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>
                  {t("about.statCustomers")}
                </div>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* ==================== OUR VALUES ==================== */}
      <section id="about-values" className="py-20 md:py-28 px-6 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto">
          <FadeInSection>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold text-neutral-900 dark:text-white mb-4">
                {t("about.valuesTitle")}
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 max-w-xl mx-auto">
                {t("about.valuesSubtitle")}
              </p>
            </div>
          </FadeInSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {values.map((v, i) => (
              <FadeInSection key={v.titleKey} delay={i * 100}>
                <div className="flex items-start gap-5 p-6 md:p-8 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/50 hover:border-neutral-200 dark:hover:border-neutral-600 transition-all duration-300 h-full">
                  <div className={`w-12 h-12 rounded-xl bg-white dark:bg-neutral-700 shadow-sm flex items-center justify-center shrink-0 ${v.color}`}>
                    <span className="material-symbols-outlined text-2xl">{v.icon}</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 dark:text-white mb-1.5">
                      {t(v.titleKey)}
                    </h4>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed">
                      {t(v.descKey)}
                    </p>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== WHY CHOOSE US ==================== */}
      <section id="about-why" className="py-20 md:py-28 px-6 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto">
          <FadeInSection>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold text-neutral-900 dark:text-white mb-4">
                {t("about.whyTitle")}
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 max-w-xl mx-auto">
                {t("about.whySubtitle")}
              </p>
            </div>
          </FadeInSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {whyCards.map((card, i) => (
              <FadeInSection key={card.titleKey} delay={i * 100}>
                <div className="bg-white dark:bg-neutral-800 p-8 rounded-2xl shadow-sm hover:shadow-md border border-neutral-100 dark:border-neutral-700 transition-all duration-300 text-center h-full group">
                  <div className="w-16 h-16 rounded-2xl bg-[#E60012]/5 dark:bg-[#E60012]/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-[#E60012]/10 dark:group-hover:bg-[#E60012]/20 transition-colors">
                    <span className="material-symbols-outlined text-3xl text-[#E60012]">
                      {card.icon}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                    {t(card.titleKey)}
                  </h4>
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed">
                    {t(card.descKey)}
                  </p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ====================== CTA ====================== */}
      <section id="about-cta" className="py-20 px-6 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto">
          <FadeInSection>
            <div className="relative rounded-3xl overflow-hidden">
              <img
                src={aboutCtaBgImg}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(0,0,0,0.7), rgba(0,0,0,0.5))" }} />

              <div className="relative z-10 py-16 md:py-24 px-8 md:px-16 text-center md:text-left max-w-2xl">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-5">
                  {t("about.ctaTitle")}
                </h2>
                <p className="text-base md:text-lg leading-relaxed mb-10" style={{ color: "rgba(255,255,255,0.85)" }}>
                  {t("about.ctaDesc")}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  <Link
                    to="/products"
                    className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#E60012] hover:bg-[#c9000f] text-white rounded-full font-bold shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-xl">shopping_cart</span>
                    {t("about.shopNow")}
                  </Link>
                  <Link
                    to="/promotions"
                    className="inline-flex items-center justify-center gap-2 px-8 py-3.5 backdrop-blur-md text-white rounded-full font-semibold transition-all duration-300 hover:opacity-90"
                style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }}
                  >
                    <span className="material-symbols-outlined text-xl">local_offer</span>
                    {t("about.viewPromotions")}
                  </Link>
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>
    </>
  );
};

export default About;