import { createHmac } from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, course, marketingConsent, website } = req.body;

  // Honeypot: bots fill hidden fields
  if (website) {
    return res.status(200).json({ success: true });
  }

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
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
          subject: `Collection download: ${name}${course ? ' — ' + course : ''}`,
          text: [
            `Someone downloaded The Collection.`,
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
          subject: 'The Collection — 18th Grain',
          text: [
            `Hi ${name.split(' ')[0]},`,
            ``,
            `Thank you for your interest in 18th Grain. Here\u2019s The Collection:`,
            ``,
            `https://www.18thgrain.com/18thGrain-the-collection.pdf`,
            ``,
            `It covers our full product range, materials, sizes, and how commissioning works. Feel free to share it with your team.`,
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

  // 4. Schedule follow-up emails (opt-in only)
  if (resendKey && marketingConsent) {
    const unsubscribeSecret = process.env.UNSUBSCRIBE_SECRET;
    if (unsubscribeSecret) {
      const token = createHmac('sha256', unsubscribeSecret).update(email).digest('hex');
      const unsubLink = `https://www.18thgrain.com/api/unsubscribe?token=${token}&email=${encodeURIComponent(email)}`;
      const firstName = name.split(' ')[0];

      function scheduleDate(days) {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString();
      }

      // Email 1 — Day 3
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
            subject: 'Quick follow-up from 18th Grain',
            scheduled_at: scheduleDate(3),
            text: [
              `Hi ${firstName},`,
              ``,
              `Thanks for downloading the lookbook. Wanted to follow up in case anything caught your eye or if you have a project you're thinking about.`,
              ``,
              `Most courses start with tee markers, but we also take on signage, plaques, and course accessories. Everything is designed and made for a specific course, so the first step is always a conversation about what you're looking for.`,
              ``,
              `If the timing is right, reply here and we can go from there.`,
              ``,
              `Best,`,
              `18th Grain`,
              `Vancouver, BC`,
              ``,
              `--`,
              `You received this because you opted in when downloading the 18th Grain lookbook.`,
              `To unsubscribe: ${unsubLink}`,
            ].join('\n'),
          }),
        });
      } catch (e) {
        console.error('Follow-up email 1 error:', e);
      }

      // Email 2 — Day 14
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
            subject: 'Before we go quiet',
            scheduled_at: scheduleDate(7),
            text: [
              `Hi ${firstName},`,
              ``,
              `Just checking in one more time.`,
              ``,
              `If there's a project on the horizon, we'd be glad to hear about it. Even if it's early stage, we're happy to talk through what's possible and what the process looks like.`,
              ``,
              `Reply any time, or reach us at info@18thgrain.com.`,
              ``,
              `Best,`,
              `18th Grain`,
              `Vancouver, BC`,
              ``,
              `--`,
              `You received this because you opted in when downloading the 18th Grain lookbook.`,
              `To unsubscribe: ${unsubLink}`,
            ].join('\n'),
          }),
        });
      } catch (e) {
        console.error('Follow-up email 2 error:', e);
      }
    } else {
      console.warn('UNSUBSCRIBE_SECRET not set — skipping follow-up email sequence');
    }
  }

  return res.status(200).json({
    success: true,
    downloadUrl: '/18thGrain-the-collection.pdf',
  });
}
