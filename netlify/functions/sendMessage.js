const OpenAI = require('openai'); // Importar OpenAI

exports.handler = async (event) => {
  try {
    const { message, assistantId } = JSON.parse(event.body); // Extraer datos del cuerpo de la solicitud

    // Inicializar OpenAI con la clave API
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY, // Variable de entorno configurada en Netlify
    });

    // Crear un hilo
    const thread = await openai.beta.threads.create();
    const threadId = thread.id;

    // Enviar el mensaje del usuario
    await openai.beta.threads.messages.create(threadId, { role: 'user', content: message });

    // Ejecutar el asistente
    const run = await openai.beta.threads.runs.create(threadId, { assistant_id: assistantId });

    // Esperar la respuesta
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    while (runStatus.status !== 'completed') {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Esperar 1 segundo antes de volver a comprobar
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }

    // Recuperar los mensajes
    const messages = await openai.beta.threads.messages.list(threadId);
    const lastMessage = messages.data[0].content[0].text.value;

    // Devolver la respuesta del asistente
    return {
      statusCode: 200,
      body: JSON.stringify({ response: lastMessage }),
    };
  } catch (error) {
    console.error('Error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
