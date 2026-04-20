export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, course, marketingConsent } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const crmWebhookSecret = process.env.CRM_WEBHOOK_SECRET;
  const resendKey = process.env.RESEND_API_KEY;

  // 1. Forward to CRM (creates a Lookbook Download record)
  if (crmWebhookSecret) {
    try {
      await fetch('https://crm.18thgrain.com/api/webhooks/lookbook-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': crmWebhookSecret.trim(),
        },
        body: JSON.stringify({
          name,
          email,
          courseOrganization: course || null,
          marketingConsent: !!marketingConsent,
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
          subject: `Lookbook download: ${name}${course ? ' — ' + course : ''}`,
          text: [
            `Someone downloaded the lookbook.`,
            ``,
            `Name: ${name}`,
            `Email: ${email}`,
            course ? `Club / Course: ${course}` : null,
            ``,
            `Marketing consent: ${marketingConsent ? 'Yes' : 'No'}`,
          ].filter(Boolean).join('\n'),
        }),
      });
    } catch (e) {
      console.error('Resend error:', e);
    }
  }

  // 3. Send the lookbook PDF to the lead via email
  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: '18th Grain <info@18thgrain.com>',
          to: email,
          subject: 'Your 18th Grain lookbook',
          text: [
            `Hi ${name.split(' ')[0]},`,
            ``,
            `Thank you for your interest in 18th Grain. Here\u2019s the lookbook you requested:`,
            ``,
            `https://www.18thgrain.com/18thGrain-lookbook.pdf`,
            ``,
            `It covers our materials, marker systems, and how commissioning works. Feel free to share it with your team.`,
            ``,
            `If you\u2019d like to start a conversation about a project, reply to this email anytime.`,
            ``,
            `Best,`,
            `18th Grain`,
            `Vancouver, BC`,
          ].join('\n'),
        }),
      });
    } catch (e) {
      console.error('Resend lead email error:', e);
    }
  }

  return res.status(200).json({
    success: true,
    downloadUrl: '/18thGrain-lookbook.pdf',
  });
}
