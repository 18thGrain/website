export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, course, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  const crmWebhookSecret = process.env.CRM_WEBHOOK_SECRET;
  const resendKey = process.env.RESEND_API_KEY;

  // 1. Forward to CRM (creates a Website Inquiry record)
  if (crmWebhookSecret) {
    try {
      await fetch('https://crm.18thgrain.com/api/webhooks/contact-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': crmWebhookSecret.trim(),
        },
        body: JSON.stringify({
          name,
          email,
          courseOrganization: course || null,
          message,
        }),
      });
    } catch (e) {
      console.error('CRM webhook error:', e);
    }
  }

  // 2. Send email notification via Resend
  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'notifications@18thgrain.com',
          to: 'info@18thgrain.com',
          subject: `New inquiry from ${name}${course ? ' — ' + course : ''}`,
          text: [
            `Name: ${name}`,
            `Email: ${email}`,
            course ? `Club / Course: ${course}` : null,
            ``,
            `Message:`,
            message,
          ].filter(Boolean).join('\n'),
        }),
      });
    } catch (e) {
      console.error('Resend error:', e);
    }
  }

  return res.status(200).json({ success: true });
}
