export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, course, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  const notionKey = process.env.NOTION_API_KEY;
  const notionDbId = process.env.NOTION_DATABASE_ID;
  const resendKey = process.env.RESEND_API_KEY;

  // 1. Write to Notion Website Inquiries database (non-blocking)
  if (notionKey && notionDbId) {
    try {
      await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${notionKey}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
          parent: { database_id: notionDbId },
          properties: {
            'Inquiry': { title: [{ text: { content: `Inquiry from ${name}` } }] },
            'Name': { rich_text: [{ text: { content: name } }] },
            'Email': { email: email },
            'Course / Organization': { rich_text: [{ text: { content: course || '' } }] },
            'Message': { rich_text: [{ text: { content: message } }] },
            'Status': { select: { name: 'New' } },
          },
        }),
      });
    } catch (e) {
      console.error('Notion error:', e);
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
