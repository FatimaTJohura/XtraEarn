const tls = require('tls');
const net = require('net');

const host = 'smtp-relay.brevo.com';
const port = 587;
const user = process.env.BREVO_SMTP_USER;
const pass = process.env.BREVO_SMTP_PASS;
const senderEmail = process.env.SENDER_EMAIL;
const recipientEmail = process.env.RECIPIENT_EMAIL;

const socket = net.createConnection(port, host, () => {
  console.log('Connected to', host, port);
});

let step = 0;
socket.on('data', data => {
  const msg = data.toString();

  if (msg.startsWith('220') && step === 0) {
    step = 1;
    socket.write('EHLO localhost\r\n');
  } else if (msg.startsWith('250') && step === 1) {
    step = 2;
    socket.write('STARTTLS\r\n');
  } else if (msg.startsWith('220') && step === 2) {
    step = 3;
    const tlsSocket = tls.connect({ socket, rejectUnauthorized: false }, () => {
      console.log('TLS Handshake established with Brevo!');
      tlsSocket.write('EHLO localhost\r\n');
    });

    let tlsStep = 0;
    tlsSocket.on('data', tData => {
      const tMsg = tData.toString();
      const code = tMsg.substring(0, 3);
      console.log('Brevo <', tMsg.trim());

      if (code === '250' && tlsStep === 0) {
        tlsStep = 1;
        tlsSocket.write('AUTH LOGIN\r\n');
      } else if (code === '334' && tlsStep === 1) {
        tlsStep = 2;
        tlsSocket.write(Buffer.from(user).toString('base64') + '\r\n');
      } else if (code === '334' && tlsStep === 2) {
        tlsStep = 3;
        tlsSocket.write(Buffer.from(pass).toString('base64') + '\r\n');
      } else if (code === '235' && tlsStep === 3) {
        tlsStep = 4;
        console.log('Authentication passed! Sending MAIL FROM...');
        tlsSocket.write(`MAIL FROM:<${senderEmail}>\r\n`);
      } else if (code === '250' && tlsStep === 4) {
        tlsStep = 5;
        console.log('MAIL FROM accepted! Sending RCPT TO...');
        tlsSocket.write(`RCPT TO:<${recipientEmail}>\r\n`);
      } else if (code === '250' && tlsStep === 5) {
        tlsStep = 6;
        console.log('RCPT TO accepted! Sending DATA...');
        tlsSocket.write('DATA\r\n');
      } else if (code === '354' && tlsStep === 6) {
        tlsStep = 7;
        console.log('Sending email body...');
        const subjectEncoded = `=?UTF-8?B?${Buffer.from('🎉 XtraEarn Live Real Email Integration Active!').toString('base64')}?=`;
        const emailContent = [
          `From: "XtraEarn Platform" <${senderEmail}>`,
          `To: <${recipientEmail}>`,
          `Subject: ${subjectEncoded}`,
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset=UTF-8',
          '',
          '<div style="font-family: Arial, sans-serif; background: #0F172A; color: #FFFFFF; padding: 32px; border-radius: 12px; max-width: 600px; margin: 0 auto;">',
          '  <div style="border-bottom: 2px solid #22C55E; padding-bottom: 16px; margin-bottom: 24px;">',
          '    <h1 style="color: #22C55E; margin: 0; font-size: 24px;">🎉 Real Email Delivery Verified!</h1>',
          '    <p style="color: #94A3B8; margin: 4px 0 0 0;">XtraEarn Platform Notification Engine</p>',
          '  </div>',
          '  <p style="font-size: 16px; line-height: 1.6; color: #F8FAFC;">',
          '    Congratulations! Your Brevo SMTP Relay integration is now <strong>100% LIVE and ACTIVE</strong>.',
          '  </p>',
          '  <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; padding: 16px; margin: 20px 0;">',
          '    <p style="margin: 4px 0; font-size: 14px; color: #CBD5E1;"><strong>✓ Gateway:</strong> Brevo SMTP Relay (smtp-relay.brevo.com:587)</p>',
          '    <p style="margin: 4px 0; font-size: 14px; color: #CBD5E1;"><strong>✓ Sender:</strong> ' + senderEmail + '</p>',
          '    <p style="margin: 4px 0; font-size: 14px; color: #CBD5E1;"><strong>✓ Delivered To:</strong> ' + recipientEmail + '</p>',
          '    <p style="margin: 4px 0; font-size: 14px; color: #CBD5E1;"><strong>✓ Status:</strong> Delivered directly to inbox</p>',
          '  </div>',
          '  <p style="color: #94A3B8; font-size: 13px; margin-top: 24px;">',
          '    Every OTP, password reset, escrow update, and payout notice will now arrive in real inboxes.',
          '  </p>',
          '  <hr style="border: 0; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 24px 0;" />',
          '  <p style="color: #64748B; font-size: 12px; text-align: center; margin: 0;">',
          '    © 2026 XtraEarn Technologies Ltd. Motijheel C/A, Dhaka-1000, Bangladesh',
          '  </p>',
          '</div>',
          '.\r\n'
        ].join('\r\n');
        tlsSocket.write(emailContent);
      } else if (code === '250' && tlsStep === 7) {
        console.log('===========================================================');
        console.log('🎉🎉🎉 REAL EMAIL DELIVERED TO INBOX VIA BREVO SMTP!');
        console.log('Brevo Response:', tMsg.trim());
        console.log('===========================================================');
        tlsSocket.write('QUIT\r\n');
        tlsSocket.end();
        process.exit(0);
      }
    });
  }
});
