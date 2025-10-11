import OpenAI from "openai";
import pool from "../db.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const detectEmotion = async (text) => {
  try {
    const prompt = `
    Analyze the following text and determine the primary emotion(s) expressed. 
    Choose from: joy, sadness, love, nostalgia, pride, regret, excitement, peace, anger, fear, surprise, disgust.
    Return only the emotion name(s) as a comma-separated list, nothing else.
    
    Text: "${text}"
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an emotion detection AI. Analyze text and return only the primary emotion(s) as comma-separated values."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 50,
      temperature: 0.3
    });

    const emotions = response.choices[0].message.content
      .toLowerCase()
      .split(',')
      .map(emotion => emotion.trim())
      .filter(emotion => emotion.length > 0);

    return emotions;
  } catch (error) {
    console.error('Error detecting emotion:', error);
    // Fallback to a default emotion if AI fails
    return ['peace'];
  }
};

export const suggestTemplate = async (emotions, text) => {
  try {
    const primaryEmotion = emotions[0];
    
    // Get template from database based on primary emotion
    const templateQuery = `
      SELECT id, template_data 
      FROM emotion_templates 
      WHERE emotion_name = $1
    `;
    
    const result = await pool.query(templateQuery, [primaryEmotion]);
    
    if (result.rows.length > 0) {
      return {
        templateId: result.rows[0].id,
        templateData: result.rows[0].template_data,
        primaryEmotion
      };
    }
    
    // Fallback to default template
    const defaultResult = await pool.query(
      'SELECT id, template_data FROM emotion_templates WHERE emotion_name = $1',
      ['peace']
    );
    
    return {
      templateId: defaultResult.rows[0].id,
      templateData: defaultResult.rows[0].template_data,
      primaryEmotion: 'peace'
    };
  } catch (error) {
    console.error('Error suggesting template:', error);
    throw error;
  }
};
