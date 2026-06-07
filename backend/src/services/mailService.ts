import nodemailer from 'nodemailer';

type Mail = { to: string; subject: string; html: string; text?: string };

function hasSmtp() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendMail({ to, subject, html, text }: Mail) {
  if (!hasSmtp()) {
    console.info('[Nexus Mail:DEV]', { to, subject, text: text || html.replace(/<[^>]+>/g, ' ') });
    return { simulated: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    return await transporter.sendMail({
      from: process.env.MAIL_FROM || 'Nexus Tecnologia LTDA <comercial@nexustecnologialtda.com.br>',
      to,
      subject,
      html,
      text
    });
  } catch (error) {
    console.error('[Nexus Mail:ERROR]', { to, subject, error });
    return { failed: true };
  }
}

export function professionalApprovalEmail(nome: string, code: string) {
  return {
    subject: 'Aprovação de cadastro - Nexus Gestão',
    html: `
      <div style="font-family:Arial,sans-serif;color:#172033;line-height:1.55">
        <h2>Seu acesso ao Nexus Gestão foi aprovado</h2>
        <p>Olá, ${nome}.</p>
        <p>Seu cadastro no sistema Nexus Gestão foi aprovado pela administração da Nexus Tecnologia LTDA.</p>
        <p>Para concluir a ativação da conta, confirme seu e-mail utilizando o código abaixo:</p>
        <p style="font-size:24px;font-weight:700;letter-spacing:4px;background:#f2f4f7;padding:14px 18px;display:inline-block;border-radius:8px">${code}</p>
        <p>Este código expira em 30 minutos. Caso você não tenha solicitado esse acesso, ignore esta mensagem e avise a administração.</p>
        <p>Atenciosamente,<br/>Nexus Tecnologia LTDA</p>
      </div>
    `,
    text: `Olá, ${nome}. Seu acesso ao Nexus Gestão foi aprovado. Código de confirmação: ${code}. Este código expira em 30 minutos.`
  };
}

export function passwordResetEmail(nome: string, code: string) {
  return {
    subject: 'Recuperação de senha - Nexus Gestão',
    html: `
      <div style="font-family:Arial,sans-serif;color:#172033;line-height:1.55">
        <h2>Recuperação de senha</h2>
        <p>Olá, ${nome}.</p>
        <p>Recebemos uma solicitação para redefinir sua senha no Nexus Gestão.</p>
        <p>Use o código abaixo para criar uma nova senha:</p>
        <p style="font-size:24px;font-weight:700;letter-spacing:4px;background:#f2f4f7;padding:14px 18px;display:inline-block;border-radius:8px">${code}</p>
        <p>Este código expira em 30 minutos.</p>
      </div>
    `,
    text: `Código de recuperação de senha Nexus Gestão: ${code}`
  };
}
