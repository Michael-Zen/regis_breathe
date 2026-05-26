import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

type MailAccount = {
  user: string;
  pass: string;
};

const getMailAccounts = (): MailAccount[] => {
  const accounts = [1, 2, 3]
    .map((index) => ({
      user: process.env[`EMAIL_USER_${index}`],
      pass: process.env[`EMAIL_PASS_${index}`],
    }))
    .filter(
      (account): account is MailAccount =>
        Boolean(account.user) && Boolean(account.pass)
    );

  if (accounts.length > 0) {
    return accounts;
  }

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return [{ user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }];
  }

  return [];
};

const pickMailAccount = (accounts: MailAccount[], email: string) => {
  const hash = Array.from(email).reduce(
    (total, char) => total + char.charCodeAt(0),
    0
  );

  return accounts[hash % accounts.length];
};

export async function POST(req: NextRequest) {
  try {
    const { name, email, ticketBase64 } = await req.json();

    if (!email || !ticketBase64) {
      return NextResponse.json(
        { error: "Missing required fields (email, ticketBase64)" },
        { status: 400 }
      );
    }

    // Convert Base64 dataURIs directly to Buffers for Nodemailer attachments
    // A standard data URI looks like "data:image/png;base64,iVBOR..."
    const ticketData = ticketBase64.split("base64,")[1];
    const accounts = getMailAccounts();

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: "Email sender credentials are not configured" },
        { status: 500 }
      );
    }

    const sender = pickMailAccount(accounts, email);

    const transporter = nodemailer.createTransport({
      host: "smtp-mail.outlook.com",
      port: 587,
      secure: false, // true for 465, false for other ports
      tls: {
         ciphers: 'SSLv3'
      },
      auth: {
        user: sender.user,
        pass: sender.pass,
      },
    });

    const mailOptions = {
      from: `"Breathe 5K Ticketing" <${sender.user}>`,
      to: email,
      subject: `Konfirmasi Pendaftaran & E-Tiket: Breathe 5K - ${name}`,
      text: `Halo ${name},\n\nTerima kasih telah mendaftar di ajang Breathe 5K Fun Run!\n\nPendaftaran Anda telah berhasil dikonfirmasi. Terlampir E-Tiket pendaftaran Anda.\n\nHarap tunjukkan dokumen ini (dicetak atau versi digital) beserta kartu identitas pada saat pengambilan Race Pack.\n\nSalam Hangat,\nPanitia Breathe 5K`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #0A1E4A;">Halo ${name},</h2>
          <p>Terima kasih telah mendaftar di ajang <strong>Breathe 5K Fun Run 2026</strong>!</p>
          <p>Pendaftaran Anda telah berhasil dikonfirmasi dan pembayaran telah lunas. Terlampir pada email ini adalah <strong>E-Tiket</strong> resmi Anda.</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #1A54A6; margin: 20px 0;">
            <strong>📝 Informasi Penting:</strong>
            <ul style="margin-top: 10px; padding-left: 20px;">
              <li>Harap tunjukkan lampiran E-Tiket ini (dicetak atau versi digital di HP) beserta Kartu Identitas saat pengambilan Race Pack.</li>
              <li>Detail lokasi dan waktu pengambilan Race Pack akan diumumkan segera melalui email dan Instagram resmi kami.</li>
            </ul>
          </div>

          <p>Sampai jumpa di garis *Start*!</p>
          <br/>
          <p style="font-size: 14px; color: #64748b;">
            Salam Hangat,<br/>
            <strong>Panitia Breathe 5K</strong>
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `${name.replace(/\s+/g, "_")}_Ticket.pdf`,
          content: ticketData,
          encoding: "base64",
          contentType: "application/pdf"
        }
      ],
    };

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: "Email sent successfully", info }, { status: 200 });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return NextResponse.json({ error: error.message || "Failed to send email" }, { status: 500 });
  }
}
