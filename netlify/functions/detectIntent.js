const OpenAI = require('openai');

exports.handler = async (event) => {
  try {
    const { message } = JSON.parse(event.body);

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY, // Use your Netlify environment variable
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an assistant that detects user intent. Respond only with the intent label.',
        },
        {
          role: 'user',
          content: message,
        },
      ],
    });

    const intent = response.choices[0].message.content.trim().toLowerCase();
    return {
      statusCode: 200,
      body: JSON.stringify({ intent }),
    };
  } catch (error) {
    console.error('Error detecting intent:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to detect intent' }),
    };
  }
};
