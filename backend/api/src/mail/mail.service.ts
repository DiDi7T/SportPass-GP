import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTestAccount, createTransport, getTestMessageUrl, type Transporter } from 'nodemailer';

// El envío ocurre mientras el entrenador espera la respuesta de "Aprobar": si el servidor SMTP no
// responde, se corta en segundos y el fallo queda registrado en lugar de bloquear la aprobación.
const TIMEOUTS = { connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000 };

export type MailAttachment ={ filename: string; content: Buffer; contentType: string };

export type MailMessage = {
  to: string;
  cc?: string;
  subject: string;
  text: string;
  html: string;
  attachments?: MailAttachment[];
};

// Si MAIL_REDIRECT_TO está definido (desarrollo y demostraciones), el correo se desvía a esa dirección y el
// asunto conserva a quién iba dirigido. MAIL_REDIRECT_CC_TO desvía la copia a otra dirección; sin ella, la
// copia se omite. MAIL_REDIRECT_CC_TO solo aplica junto con MAIL_REDIRECT_TO, para que nunca salga un correo
// a un destinatario real por configurar solo la copia. En producción no se define ninguna.
export function applyRedirect(message: MailMessage, redirectTo?: string, redirectCcTo?: string): MailMessage {
  const target = redirectTo?.trim();
  if (!target) return message;
  const ccTarget = redirectCcTo?.trim();
  const original = message.cc ? `${message.to}; CC: ${message.cc}` : message.to;
  return {
    ...message,
    to: target,
    cc: message.cc && ccTarget ? ccTarget : undefined,
    subject: `[Para: ${original}] ${message.subject}`,
  };
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Promise<Transporter>;

  constructor(private readonly config: ConfigService) {}

  // Con MAIL_HOST se usa ese servidor SMTP (p. ej. Gmail con contraseña de aplicación). Sin él, fuera de
  // producción se crea una cuenta de prueba de Ethereal: el correo no se entrega y se ve en un enlace.
  private getTransporter() {
    this.transporter ??= (async () => {
      const host = this.config.get<string>('MAIL_HOST');
      if (host) {
        const port = Number(this.config.get('MAIL_PORT', 587));
        return createTransport({
          host,
          port,
          secure: this.config.get('MAIL_SECURE', port === 465 ? 'true' : 'false') === 'true',
          auth: { user: this.config.get<string>('MAIL_USER'), pass: this.config.get<string>('MAIL_PASSWORD') },
          ...TIMEOUTS,
        });
      }
      if (this.config.get('NODE_ENV') === 'production') {
        throw new Error('El envío de correos no está configurado (falta MAIL_HOST).');
      }
      const account = await createTestAccount();
      this.logger.log(`Correo de prueba con Ethereal (${account.user}): los mensajes no se entregan.`);
      return createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: { user: account.user, pass: account.pass },
        ...TIMEOUTS,
      });
    })().catch(error => {
      // Si falla la configuración, el siguiente envío lo vuelve a intentar.
      this.transporter = undefined;
      throw error;
    });
    return this.transporter;
  }

  async send(message: MailMessage) {
    const transporter = await this.getTransporter();
    const outgoing = applyRedirect(
      message,
      this.config.get<string>('MAIL_REDIRECT_TO'),
      this.config.get<string>('MAIL_REDIRECT_CC_TO'),
    );
    const info = await transporter.sendMail({
      from: this.config.get<string>('MAIL_FROM', 'SportPass Icesi <no-reply@sportpass.local>'),
      ...outgoing,
    });
    const preview = getTestMessageUrl(info);
    if (preview) this.logger.log(`Vista previa del correo: ${preview}`);
    return { messageId: info.messageId as string, previewUrl: preview || null };
  }
}
