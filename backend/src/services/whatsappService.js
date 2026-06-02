// WhatsApp sharing via URL scheme (opens WhatsApp with pre-filled message)
// For production, integrate WhatsApp Business API or Twilio

const buildWhatsAppLink = ({ phone, invoiceNumber, amount, dueDate, publicLink, companyName }) => {
  const message = encodeURIComponent(
    `Hello! 👋\n\nYou have a new invoice from *${companyName}*.\n\n` +
    `📄 Invoice: *${invoiceNumber}*\n` +
    `💰 Amount: *${amount}*\n` +
    `📅 Due Date: *${dueDate}*\n\n` +
    `Click below to view and pay online:\n${publicLink}\n\n` +
    `_Powered by InvoiceFlow_`
  );

  const cleanPhone = phone?.replace(/\D/g, '') || '';
  return `https://wa.me/${cleanPhone}?text=${message}`;
};

// If Twilio is configured, send actual WhatsApp message
const sendWhatsAppMessage = async ({ phone, invoiceNumber, amount, dueDate, publicLink, companyName }) => {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await twilio.messages.create({
        from: `whatsapp:${process.env.TWILIO_PHONE}`,
        to: `whatsapp:${phone}`,
        body:
          `Hello! You have a new invoice from ${companyName}.\n\n` +
          `Invoice: ${invoiceNumber}\nAmount: ${amount}\nDue: ${dueDate}\n\n` +
          `Pay here: ${publicLink}`,
      });
      return { success: true, method: 'twilio' };
    } catch (err) {
      console.error('Twilio WhatsApp error:', err.message);
    }
  }

  // Fallback: return the WhatsApp URL for the frontend to open
  const link = buildWhatsAppLink({ phone, invoiceNumber, amount, dueDate, publicLink, companyName });
  return { success: true, method: 'url', whatsappUrl: link };
};

module.exports = { buildWhatsAppLink, sendWhatsAppMessage };