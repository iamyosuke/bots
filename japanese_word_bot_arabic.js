import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';

// Get environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DISCORD_WEBHOOK_URL = process.env.JAPANESE_BOT_DISCORD_WEBHOOK;

// Configure Gemini API
const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genai.getGenerativeModel({ 
    model: 'gemini-2.0-flash',
    generationConfig: {
        temperature: 0.9,
    }
});

async function generateJapaneseWord() {
    try {
        // Add categories for variety
        const categories = [
            'daily life', 'emotions', 'food', 'travel', 'business',
            'nature', 'technology', 'hobbies', 'family', 'culture'
        ];
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        
        const prompt = `Generate a Japanese vocabulary word that is especially useful or interesting for Arabic speakers, related to ${randomCategory}, in the following JSON format only:

{
    "word": {
        "japanese": "日本語の単語",
        "reading": "ひらがなでの読み方",
        "romaji": "romaji reading",
        "arabic": "Arabic translation",
        "english": "English translation",
        "partOfSpeech": "noun/verb/adjective/etc",
        "level": "N5/N4/N3/N2/N1",
        "example": {
            "japanese": "例文",
            "reading": "れいぶんのよみかた",
            "arabic": "مثال باللغة العربية",
            "english": "Example sentence translation"
        },
        "notes": "Brief cultural or usage notes for Arabic speakers (max 100 chars, in English or Arabic)",
        "category": "${randomCategory}"
    }
}

Important:
- Choose a word that is practical or interesting for Arabic speakers learning Japanese
- Include an accurate Arabic translation for both the word and the example sentence
- Provide accurate readings in both hiragana and romaji
- Include JLPT level estimation
- Make notes practical and helpful for Arabic learners (in English or Arabic)
- Return only the JSON, no additional text`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        try {
            const word_data = JSON.parse(text);
            
            // Verify required fields
            const requiredFields = ['japanese', 'reading', 'romaji', 'english', 'partOfSpeech', 'level', 'example', 'notes', 'category'];
            for (const field of requiredFields) {
                if (!word_data.word || !word_data.word[field]) {
                    throw new Error(`Missing required field: word.${field}`);
                }
            }
            
            // Verify example fields
            const exampleFields = ['japanese', 'reading', 'arabic', 'english'];
            for (const field of exampleFields) {
                if (!word_data.word.example[field]) {
                    throw new Error(`Missing required field: word.example.${field}`);
                }
            }
            
            return word_data;
        } catch (parseError) {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('JSON not found in response');
            }
            return JSON.parse(jsonMatch[0]);
        }
    } catch (error) {
        console.error('Error generating Japanese word:', error);
        return null;
    }
}

async function postToDiscord(wordData) {
    if (!wordData) return false;

    try {
        // Get current time in JST
        const now = new Date();
        const jstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
        const currentTime = new Intl.DateTimeFormat('ja-JP', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        }).format(jstDate);

        // Format Discord message
        const message = {
            embeds: [{
                title: `📝 كلمة يابانية لليوم (${currentTime})`,
                fields: [
                    {
                        name: "الكلمة",
                        value: `${wordData.word.japanese}（${wordData.word.reading}）\n*${wordData.word.romaji}*`,
                        inline: true
                    },
                    {
                        name: "المعنى",
                        value: `${wordData.word.arabic}\n*${wordData.word.partOfSpeech}*`,
                        inline: true
                    },
                    {
                        name: "المستوى",
                        value: wordData.word.level,
                        inline: true
                    },
                    {
                        name: "مثال",
                        value: `${wordData.word.example.japanese}\n${wordData.word.example.reading}\n**${wordData.word.example.arabic}**`
                    },
                    {
                        name: "ملاحظات",
                        value: wordData.word.notes
                    }
                ],
                color: 0x7289DA,
                footer: {
                    text: `التصنيف: ${wordData.word.category} | 🇯🇵🤝🇦🇪 تعلم اليابانية للناطقين بالعربية`
                }
            }]
        };

        // Post to Discord
        const response = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        return response.status === 204;
    } catch (error) {
        console.error('Error posting to Discord:', error);
        return false;
    }
}

async function main() {
    try {
        const wordData = await generateJapaneseWord();
        if (wordData) {
            const success = await postToDiscord(wordData);
            if (success) {
                console.log('Successfully posted to Discord');
            } else {
                console.log('Failed to post to Discord');
            }
        } else {
            console.log('Failed to generate Japanese word');
        }
    } catch (error) {
        console.error('Error in main execution:', error);
    }
}

main();
