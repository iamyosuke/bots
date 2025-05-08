import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';

// 環境変数から認証情報を取得
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Gemini APIの設定
const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' });

async function generateBibleVerse() {
    try {
        const prompt = `Generate a bible verse in both English and Japanese.
Please provide the output in the following JSON format only:

{
    "en": {
        "book": "Book name in English",
        "chapter": "Chapter number",
        "verse": "Verse number",
        "content": "Bible verse in English",
        "explanation": "Brief explanation in English (max 100 chars)"
    },
    "ja": {
        "book": "書名（日本語）",
        "chapter": "章番号",
        "verse": "節番号",
        "content": "聖句（日本語）",
        "explanation": "簡潔な意味の解説（100文字以内）"
    }
}

Important:
- Use the same verse for both languages
- Keep explanations concise
- Ensure accurate translation
- Return only the JSON, no additional text`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        try {
            // 直接JSONとしてパースを試みる
            const verse_data = JSON.parse(text);
            
            // 必須フィールドの確認
            const requiredFields = ['book', 'chapter', 'verse', 'content', 'explanation'];
            for (const lang of ['en', 'ja']) {
                for (const field of requiredFields) {
                    if (!verse_data[lang] || !verse_data[lang][field]) {
                        throw new Error(`Missing required field: ${lang}.${field}`);
                    }
                }
            }
            
            return verse_data;
        } catch (parseError) {
            // JSONパースに失敗した場合、テキストからJSONを抽出して再試行
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('JSON not found in response');
            }
            const verse_data = JSON.parse(jsonMatch[0]);
            
            // 必須フィールドの確認
            const requiredFields = ['book', 'chapter', 'verse', 'content', 'explanation'];
            for (const lang of ['en', 'ja']) {
                for (const field of requiredFields) {
                    if (!verse_data[lang] || !verse_data[lang][field]) {
                        throw new Error(`Missing required field: ${lang}.${field}`);
                    }
                }
            }
            
            return verse_data;
        }
    } catch (error) {
        console.error('Error generating bible verse:', error);
        return null;
    }
}

async function postToDiscord(verseData) {
    if (!verseData) return false;

    try {
        // 日本時間の現在日時
        const now = new Date();
        const jstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
        const currentTime = new Intl.DateTimeFormat('ja-JP', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        }).format(jstDate);

        // Discordメッセージの整形
        const message = {
            embeds: [{
                title: `📖 Today's Bible Verse / 今日の聖書の言葉 (${currentTime})`,
                description: `**${verseData.en.book} ${verseData.en.chapter}:${verseData.en.verse}**\n${verseData.en.content}\n💭 *${verseData.en.explanation}*\n\n**${verseData.ja.book} ${verseData.ja.chapter}章${verseData.ja.verse}節**\n${verseData.ja.content}\n💭 *${verseData.ja.explanation}*`,
                color: 0x7289DA,
                footer: {
                    text: "🌏 English & 日本語"
                }
            }]
        };

        // Discordへ投稿
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
        const verseData = await generateBibleVerse();
        if (verseData) {
            const success = await postToDiscord(verseData);
            if (success) {
                console.log('Successfully posted to Discord');
            } else {
                console.log('Failed to post to Discord');
            }
        } else {
            console.log('Failed to generate bible verse');
        }
    } catch (error) {
        console.error('Error in main execution:', error);
    }
}

main(); 