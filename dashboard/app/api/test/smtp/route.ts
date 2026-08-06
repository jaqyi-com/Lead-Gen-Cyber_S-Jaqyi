import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const recipient = process.env.DIGEST_RECIPIENT_EMAIL ?? user;

  if (!host || !user || !pass) {
    return NextResponse.json({ ok: false, message: '❌ SMTP env vars missing (SMTP_HOST, SMTP_USER, SMTP_PASS)' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: { user, pass },
    });

    // Verify connection first
    await transporter.verify();

    // Send test email
    const info = await transporter.sendMail({
      from: `"JAQYI Pipeline" <${user}>`,
      to: recipient,
      subject: '✅ JAQYI Pipeline — SMTP Test Successful',
      html: `
        <div style="font-family:Inter,sans-serif;background:#08080e;color:#f1f0ff;padding:32px;border-radius:16px;max-width:500px">
          <h2 style="color:#a78bfa;margin:0 0 12px">JAQYI Lead Pipeline</h2>
          <p style="color:#f1f0ff;font-size:15px">🎉 SMTP connection verified successfully!</p>
          <p style="color:rgba(241,240,255,0.5);font-size:13px;margin-top:8px">
            Sent at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST<br>
            From: ${user}<br>
            To: ${recipient}
          </p>
        </div>
      `,
    });

    return NextResponse.json({
      ok: true,
      message: `✅ SMTP connected — test email sent`,
      detail: `To: ${recipient} · Message-ID: ${info.messageId}`,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, message: `❌ SMTP error`, detail: String(err) }, { status: 500 });
  }
}
