const OpenAI = require('openai');
const { SYSTEM_PROMPT, TRIAGE_FUNCTION, buildSystemPrompt } = require('../config/prompts');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate personalized greeting based on patient context
 */
function generateGreeting(patientContext, patientHistory) {
  if (!patientContext) {
    return "Hello! I'm MedQueue AI, your healthcare assistant. I'm here to understand your symptoms and help you book an appointment with the right specialist. How can I help you today?";
  }

  const { name, age, gender } = patientContext;
  const firstName = name?.split(' ')[0] || 'there';

  if (patientHistory?.lastVisit) {
    const lastVisitDate = new Date(patientHistory.lastVisit.date);
    const daysSinceLastVisit = Math.floor((Date.now() - lastVisitDate) / (1000 * 60 * 60 * 24));

    if (daysSinceLastVisit < 30) {
      return `Welcome back, ${firstName}! I see you visited us ${daysSinceLastVisit} days ago for ${patientHistory.lastVisit.symptoms.slice(0, 2).join(' and ')}. Are you here for a follow-up, or is this about something new?`;
    }

    return `Hello ${firstName}! Good to see you again. How can I help you today?`;
  }

  return `Hello ${firstName}! I'm MedQueue AI, your healthcare assistant. I'm here to understand your symptoms and connect you with the right specialist. Please tell me what's bothering you today.`;
}

/**
 * Process a chat message and get AI response
 */
async function processMessage(conversationHistory, patientContext, patientHistory) {
  try {
    // Build system prompt with patient context
    const systemPrompt = buildSystemPrompt(patientContext, patientHistory);

    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory
    ];

    // Call GPT-4o-mini with tools (new format)
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools: [{
        type: 'function',
        function: TRIAGE_FUNCTION
      }],
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 500
    });

    const choice = response.choices[0];
    const message = choice.message;

    // Check if tool was called (triage complete)
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      if (toolCall.function.name === 'triage_patient') {
        const rawResult = JSON.parse(toolCall.function.arguments);

        // Map to frontend-expected format
        const triageResult = {
          symptoms: rawResult.symptoms || [],
          symptomDuration: rawResult.symptom_duration,
          urgencyScore: rawResult.urgency_score,
          recommendedSpecialty: rawResult.specialist,
          possibleConditions: [], // AI doesn't diagnose, so empty
          reasoning: rawResult.reasoning,
          preVisitSummary: rawResult.pre_visit_summary,
          redFlags: rawResult.red_flags || [],
          languageDetected: rawResult.language_detected,
          precautions: rawResult.urgency_score >= 4
            ? 'Please seek medical attention promptly. Avoid self-medication.'
            : null
        };

        // Generate confirmation message
        const confirmationMessage = generateTriageConfirmation(triageResult);

        return {
          message: confirmationMessage,
          triageResult,
          tokenUsage: {
            prompt: response.usage.prompt_tokens,
            completion: response.usage.completion_tokens,
            total: response.usage.total_tokens
          }
        };
      }
    }

    // Regular message response
    return {
      message: message.content,
      triageResult: null,
      tokenUsage: {
        prompt: response.usage.prompt_tokens,
        completion: response.usage.completion_tokens,
        total: response.usage.total_tokens
      }
    };
  } catch (error) {
    console.error('OpenAI API Error:', error.message);
    console.error('Full error:', JSON.stringify(error.response?.data || error, null, 2));
    throw new Error('Failed to process message with AI: ' + error.message);
  }
}

/**
 * Generate triage confirmation message
 */
function generateTriageConfirmation(triageResult) {
  const { recommendedSpecialty, urgencyScore, reasoning } = triageResult;

  const urgencyLabels = {
    1: 'Routine',
    2: 'Low priority',
    3: 'Moderate',
    4: 'High priority',
    5: 'Emergency - Please seek immediate care!'
  };

  let message = `Based on your symptoms, I recommend seeing a **${recommendedSpecialty}** specialist.\n\n`;
  message += `**Urgency Level:** ${urgencyLabels[urgencyScore]}\n\n`;
  message += `**Reasoning:** ${reasoning}\n\n`;

  if (urgencyScore >= 4) {
    message += `⚠️ Your symptoms require prompt attention. I recommend booking the earliest available appointment.\n\n`;
  }

  if (urgencyScore === 5) {
    message += `🚨 **IMPORTANT:** If you're experiencing severe symptoms, please call emergency services or go to the nearest emergency room immediately.\n\n`;
  }

  message += `Would you like me to show you available doctors and time slots?`;

  return message;
}

/**
 * Extract symptoms from free text (for voice calls)
 */
async function extractSymptoms(text) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Extract medical symptoms from the given text. Return a JSON array of symptom strings in English. Be concise.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 200
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.symptoms || [];
  } catch (error) {
    console.error('Symptom extraction error:', error);
    return [];
  }
}

/**
 * Translate text to English (for multilingual support)
 */
async function translateToEnglish(text) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Translate the following text to English. Only return the translation, nothing else.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

/**
 * Detect language of text
 */
async function detectLanguage(text) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Detect the language of the text. Return only the language name (e.g., "Hindi", "English", "Tamil").'
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0,
      max_tokens: 20
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Language detection error:', error);
    return 'English';
  }
}

module.exports = {
  generateGreeting,
  processMessage,
  generateTriageConfirmation,
  extractSymptoms,
  translateToEnglish,
  detectLanguage
};
