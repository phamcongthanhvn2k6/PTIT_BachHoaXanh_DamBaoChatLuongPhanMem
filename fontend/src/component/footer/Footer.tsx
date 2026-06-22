import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dataService } from '../../services/dataService';

function Footer() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    dataService.getAdminSettings().then(setSettings).catch(() => {});
  }, []);

  const phone = settings?.support_phone || "1800 1067";
  const email = settings?.support_email || "cskh@bachhoaxanh.com";
  const brand = settings?.brand_name || "Bách hóa XANH";
  const brandLogoUrl = settings?.brand_logo_url || '';

  return (
    <footer style={{ background: "#1a1a1a", color: "#ccc", padding: "48px 0 24px", marginTop: 64, fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              {brandLogoUrl && (
                <img
                  src={brandLogoUrl}
                  alt="Brand Logo"
                  style={{
                    height: 38,
                    width: 38,
                    objectFit: "contain",
                    borderRadius: "50%",
                    background: "white",
                    padding: "2px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                  }}
                />
              )}
              <div
                style={{
                  background: "#008848",
                  borderRadius: 8,
                  padding: "6px 14px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                }}
              >
                <span style={{ color: "white", fontWeight: 900, fontSize: 22, letterSpacing: -1, textTransform: "uppercase" }}>bách hóa</span>
                <span style={{ color: "#FFD400", fontWeight: 950, fontSize: 22, letterSpacing: -1, textTransform: "uppercase" }}>XANH</span>
              </div>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.8, color: "#999", marginBottom: 20 }}>
              {t('footer.description', { brand })}
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              {["📘", "📸", "▶️", "🐦"].map((icon, i) => (
                <div
                  key={i}
                  style={{
                    width: 36,
                    height: 36,
                    background: "#333",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  {icon}
                </div>
              ))}
            </div>
          </div>

          {[
            { title: t('footer.customerSupport'), items: [
              { label: t('footer.supportCenter'), to: '/account/support' },
              { label: t('footer.shoppingGuide') },
              { label: t('footer.returnPolicy') },
              { label: t('footer.shippingPolicy') },
              { label: t('footer.faq') },
            ] },
            { title: t('footer.aboutLotte'), items: [
              { label: t('footer.introduction') },
              { label: t('footer.careers') },
              { label: t('footer.newsEvents') },
              { label: t('footer.partnership') },
            ] },
            { title: t('footer.contact'), items: [
              { label: `📞 ${phone} (${t('footer.phoneFree')})` },
              { label: `✉️ ${email}` },
              { label: `📍 ${t('footer.location')}` },
              { label: `🕐 ${t('footer.workingHours')}` },
            ] },
          ].map((col) => (
            <div key={col.title}>
              <h4
                style={{
                  color: "white",
                  fontSize: 15,
                  fontWeight: 800,
                  marginBottom: 16,
                  paddingBottom: 10,
                  borderBottom: "2px solid #008848",
                }}
              >
                {col.title}
              </h4>
              {col.items.map((item) => (
                item.to ? (
                  <Link key={item.label} to={item.to} style={{ display: 'block', fontSize: 13, color: '#999', marginBottom: 10, textDecoration: 'none' }}>
                    {item.label}
                  </Link>
                ) : (
                  <div key={item.label} style={{ fontSize: 13, color: "#999", marginBottom: 10, cursor: "pointer" }}>
                    {item.label}
                  </div>
                )
              ))}
            </div>
          ))}
        </div>

        <div
          style={{
            borderTop: "1px solid #333",
            paddingTop: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12,
            color: "#666",
          }}
        >
          <span>{t('footer.copyright')}</span>
          <div style={{ display: "flex", gap: 8 }}>
            {["VISA", "MC", "ATM", "ZaloPay", "MoMo"].map((method) => (
              <span key={method} style={{ background: "#333", padding: "4px 8px", borderRadius: 4, fontSize: 11 }}>
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;