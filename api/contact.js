export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, course, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;
  const resendKey = process.env.RESEND_API_KEY;

  // 1. Write to Google Sheets via Apps Script (non-blocking)
  if (googleScriptUrl) {
    try {
      await fetch(googleScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ name, email, course, message }),
        redirect: 'follow',
      });
    } catch (e) {
      // Log but don't block — email notification is the fallback
      console.error('Google Sheets error:', e);
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
