import { createHmac } from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, email } = req.query;

  if (!token || !email) {
    return res.status(400).send(errorPage('Missing parameters.'));
  }

  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) {
    console.error('UNSUBSCRIBE_SECRET not set');
    return res.status(500).send(errorPage('Configuration error. Please contact info@18thgrain.com.'));
  }

  // Verify HMAC token
  const expected = createHmac('sha256', secret).update(email).digest('hex');
  if (token !== expected) {
    return res.status(403).send(errorPage('Invalid unsubscribe link. Please contact info@18thgrain.com.'));
  }

  // Notify CRM to mark contact as unsubscribed
  const crmWebhookSecret = process.env.CRM_WEBHOOK_SECRET;
  if (crmWebhookSecret) {
    try {
      await fetch('https://crm.18thgrain.com/api/webhooks/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': crmWebhookSecret.trim(),
        },
        body: JSON.stringify({ email }),
      });
    } catch (e) {
      console.error('CRM unsubscribe webhook error:', e);
    }
  }

  // Notify info@ that someone unsubscribed
  const resendKey = process.env.RESEND_API_KEY;
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
          subject: `Unsubscribe: ${email}`,
          text: `${email} has unsubscribed from follow-up emails.`,
        }),
      });
    } catch (e) {
      console.error('Unsubscribe notification email error:', e);
    }
  }

  return res.status(200).send(successPage());
}

function successPage() {
  return `<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unsubscribed | 18th Grain</title>
<style>
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #171719;
    color: #ebe0c4;
    font-family: Inter, -apple-system, sans-serif;
    text-align: center;
    padding: 40px;
  }
  h1 {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 28px;
    font-weight: 400;
    margin: 0 0 16px;
  }
  p {
    font-size: 14px;
    line-height: 1.7;
    color: rgba(235, 224, 196, 0.6);
    max-width: 40ch;
    margin: 0 auto;
  }
  a {
    color: #c7a96b;
    text-decoration: none;
  }
  a:hover { text-decoration: underline; }
</style>
</head>
<body>
<div>
  <h1>You have been unsubscribed.</h1>
  <p>You will no longer receive follow-up emails from 18th Grain. If this was a mistake, contact us at <a href="mailto:info@18thgrain.com">info@18thgrain.com</a>.</p>
</div>
</body>
</html>`;
}

function errorPage(message) {
  return `<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unsubscribe | 18th Grain</title>
<style>
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #171719;
    color: #ebe0c4;
    font-family: Inter, -apple-system, sans-serif;
    text-align: center;
    padding: 40px;
  }
  h1 {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 28px;
    font-weight: 400;
    margin: 0 0 16px;
  }
  p {
    font-size: 14px;
    line-height: 1.7;
    color: rgba(235, 224, 196, 0.6);
    max-width: 40ch;
    margin: 0 auto;
  }
  a {
    color: #c7a96b;
    text-decoration: none;
  }
  a:hover { text-decoration: underline; }
</style>
</head>
<body>
<div>
  <h1>Something went wrong.</h1>
  <p>${message}</p>
</div>
</body>
</html>`;
}
