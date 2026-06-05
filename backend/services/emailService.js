import nodemailer from 'nodemailer';

let cachedTransporter = null;
let smtpVerifyPromise = null;

const requireEmailConfig = () => {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 0);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  const missingKeys = [];
  if (!host) missingKeys.push('EMAIL_HOST');
  if (!port) missingKeys.push('EMAIL_PORT');
  if (!user) missingKeys.push('EMAIL_USER');
  if (!pass) missingKeys.push('EMAIL_PASS');

  if (missingKeys.length > 0) {
    console.error('EMAIL CONFIG MISSING', { missing: missingKeys });
    const err = new Error(`Missing email SMTP configuration: ${missingKeys.join(', ')}`);
    err.code = 'EMAIL_CONFIG_MISSING';
    throw err;
  }

  return {
    host,
    port,
    user,
    pass,
    from,
    secure: port === 465,
  };
};

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  const cfg = requireEmailConfig();
  cachedTransporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  });

  return cachedTransporter;
};

const verifySmtpConnection = async () => {
  const transporter = getTransporter();
  if (!smtpVerifyPromise) {
    smtpVerifyPromise = transporter.verify().then(() => {
      console.log('[EmailService] SMTP verified successfully');
      return true;
    }).catch((err) => {
      console.error('SMTP CONNECTION FAILED', err);
      smtpVerifyPromise = null;
      throw err;
    });
  }
  return smtpVerifyPromise;
};

export const sendMail = async ({ to, subject, text, html }) => {
  const cfg = requireEmailConfig();
  const transporter = getTransporter();

  await verifySmtpConnection();

  console.log('[EmailService] Sending email', { to, subject });

  const info = await transporter.sendMail({
    from: cfg.from,
    to,
    subject,
    text,
    html,
  });

  console.log('[EmailService] Email sent', { messageId: info?.messageId, to });
  return info;
};

export const sendOtpEmail = async ({ email, otp, expiresMinutes = 10 }) => {
  if (!email) throw new Error('Email is required for OTP');

  const subject = 'Ma xac thuc email Lotte Mart';
  const text = `Ma OTP cua ban la ${otp}. Ma co hieu luc trong ${expiresMinutes} phut.`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1f2937;max-width:560px;margin:0 auto;">
      <h2 style="color:#dc2626;">Xac thuc email tai khoan</h2>
      <p>Ban vua yeu cau xac thuc email cho tai khoan Lotte Mart.</p>
      <p>Ma OTP cua ban:</p>
      <div style="font-size:30px;font-weight:700;letter-spacing:6px;background:#fef2f2;border:1px solid #fecaca;padding:14px 18px;border-radius:8px;display:inline-block;">${otp}</div>
      <p style="margin-top:14px;">Ma co hieu luc trong <b>${expiresMinutes} phut</b>.</p>
      <p style="color:#6b7280;font-size:13px;">Neu ban khong yeu cau, vui long bo qua email nay.</p>
    </div>
  `;

  return sendMail({ to: email, subject, text, html });
};

const formatMoney = (val) => Number(val || 0).toLocaleString('vi-VN');

export const sendOrderSuccessEmail = async (user, order) => {
  if (!user?.email) {
    console.warn('USER HAS NO EMAIL, SKIP SEND MAIL');
    return { skipped: true, reason: 'USER_HAS_NO_EMAIL' };
  }

  const email = user.email;

  const orderCode = String(order?._id || order?.id || '').slice(-8).toUpperCase();
  const subject = `Dat hang thanh cong - Don #${orderCode}`;

  const items = Array.isArray(order?.items) ? order.items : [];
  const itemRowsHtml = items.map((item) => {
    const quantity = Number(item?.quantity || 0);
    const price = Number(item?.final_price ?? item?.price ?? 0);
    return `<tr>
      <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;">${item?.product_name || 'San pham'}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;text-align:center;">${quantity}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatMoney(price)}đ</td>
    </tr>`;
  }).join('');

  const fullAddress = order?.order_address?.full_address
    || [order?.order_address?.street, order?.order_address?.ward, order?.order_address?.district, order?.order_address?.city].filter(Boolean).join(', ')
    || 'N/A';

  const text = [
    `Don hang ${orderCode} da dat thanh cong.`,
    `Tong tien: ${formatMoney(order?.total_amount)}đ`,
    `Phuong thuc thanh toan: ${order?.payment?.method || order?.payment_method || 'N/A'}`,
    `Dia chi giao hang: ${fullAddress}`,
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:640px;margin:0 auto;">
      <h2 style="color:#dc2626;">Dat hang thanh cong</h2>
      <p>Xin chao ${user?.full_name || user?.username || 'Quy khach'}, cam on ban da mua hang tai Lotte Mart.</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px;">
        <p><b>Ma don:</b> #${orderCode}</p>
        <p><b>Tong tien:</b> ${formatMoney(order?.total_amount)}đ</p>
        <p><b>Trang thai:</b> ${order?.status || 'PENDING'}</p>
        <p><b>Phuong thuc thanh toan:</b> ${order?.payment?.method || order?.payment_method || 'N/A'}</p>
        <p><b>Dia chi nhan hang:</b> ${fullAddress}</p>
        <p><b>Diem thuong:</b> ${Number(order?.points_earned || 0)}</p>
      </div>

      <h3 style="margin-top:16px;">Chi tiet san pham</h3>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="text-align:left;padding:8px 6px;">San pham</th>
            <th style="text-align:center;padding:8px 6px;">SL</th>
            <th style="text-align:right;padding:8px 6px;">Gia</th>
          </tr>
        </thead>
        <tbody>${itemRowsHtml}</tbody>
      </table>

      <p style="margin-top:16px;color:#4b5563;font-size:13px;">Thong tin bao gom: ma don hang, tong tien, danh sach san pham, dia chi nhan hang.</p>
    </div>
  `;

  return sendMail({ to: email, subject, text, html });
};

export const sendNotificationSettingsEmail = async (user, changedSettings) => {
  if (!user?.email) return { skipped: true };

  const subject = `Cập nhật tùy chọn thông báo - Lotte Mart`;
  const changedListHtml = changedSettings.map(k => `<li style="padding:4px 0;">${k.key}: <b style="color:${k.value ? '#15803d' : '#b91c1c'};">${k.value ? 'Bật' : 'Tắt'}</b></li>`).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:640px;margin:0 auto;">
      <h2 style="color:#dc2626;">Cập nhật tùy chọn thông báo</h2>
      <p>Xin chào ${user?.full_name || user?.username || 'Quý khách'},</p>
      <p>Các tùy chọn thông báo của bạn vừa được cập nhật thành công:</p>
      <ul style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px 14px 14px 30px;">
        ${changedListHtml}
      </ul>
      <p style="margin-top:20px;color:#4b5563;font-size:13px;">Nếu bạn không thực hiện thay đổi này, vui lòng kiểm tra lại tài khoản.</p>
    </div>
  `;
  const text = `Tùy chọn thông báo của bạn vừa được cập nhật.`;

  return sendMail({ to: user.email, subject, text, html });
};

export const sendPriceDropEmail = async ({ email, username, productName, oldPrice, newPrice, link }) => {
  if (!email) return { skipped: true };
  const subject = `[Lotte Mart] Giam gia san pham ${productName}!`;
  const text = `San pham ${productName} ban dang theo doi da giam gia tu ${Number(oldPrice).toLocaleString('vi-VN')}d xuong con ${Number(newPrice).toLocaleString('vi-VN')}d.`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:640px;margin:0 auto;">
      <h2 style="color:#dc2626;">San pham ban quan tam da giam gia!</h2>
      <p>Xin chao ${username || 'Quy khach'},</p>
      <p>San pham <b>${productName}</b> ma ban dang theo doi vua giam gia manh:</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:16px;">
        <p><b>Gia cu:</b> <del style="color:#6b7280;">${Number(oldPrice).toLocaleString('vi-VN')}d</del></p>
        <p><b>Gia moi cuc soc:</b> <b style="color:#dc2626;font-size:18px;">${Number(newPrice).toLocaleString('vi-VN')}d</b></p>
      </div>
      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}${link}" style="background:#dc2626;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;font-weight:bold;">Mua Ngay</a></p>
      <p style="margin-top:20px;color:#4b5563;font-size:13px;">Lotte Mart han hanh duoc phuc vu quy khach.</p>
    </div>
  `;
  return sendMail({ to: email, subject, text, html });
};

export default {
  sendMail,
  sendOtpEmail,
  sendOrderSuccessEmail,
  sendNotificationSettingsEmail,
  sendPriceDropEmail,
};
