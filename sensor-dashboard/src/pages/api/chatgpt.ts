import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, sensorContext } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OpenAI API key not set');
    return res.status(500).json({ error: 'OpenAI API key not set' });
  }

  // Compose improved system prompt
  const systemPrompt = `You are a highly skilled climate data analyst.\n\nGiven the following sensor data summary and the last 10 sensor entries (with coordinates):\n\n- State the location (city, country, or region) based on the coordinates.\n- Do NOT list all the data points or repeat all values.\n- Instead, derive and present a few key insights or patterns you notice in the data.\n- Focus on what stands out, what is unusual, or what is most relevant for a human reader.\n- Present these insights in a short, natural, and professional tone.\n- Avoid robotic, formulaic, or repetitive language.\n- Do NOT provide adaptation recommendations unless the user asks.\n- Use markdown formatting: short paragraphs, bullet points, bold for key insights, and line breaks for readability.\n- Keep your response concise and useful.\n\nSensor data summary: ${JSON.stringify(sensorContext.summary)}\n\nLast 10 sensor entries: ${JSON.stringify(sensorContext.locationData)}`;

  const openaiMessages = [
    { role: 'system', content: systemPrompt },
    ...(messages || [])
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: openaiMessages,
        max_tokens: 600,
        temperature: 0.7,
      }),
    });
    const data = await response.json();
    console.log('OpenAI API response:', data);
    if (data.choices && data.choices[0]) {
      res.status(200).json({ reply: data.choices[0].message.content });
    } else {
      console.error('No response from OpenAI', data);
      res.status(500).json({ error: 'No response from OpenAI', details: data });
    }
  } catch (err) {
    console.error('OpenAI API error', err);
    res.status(500).json({ error: 'OpenAI API error', details: err });
  }
} 