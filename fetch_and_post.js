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
        const prompt = `聖書から、毎日の励ましとなる短い一節を1つ挙げてください。
以下のJSON形式で出力してください。他の説明は不要です：

{
    "book": "書名",
    "chapter": "章番号",
    "verse": "節番号",
    "content": "聖句の内容",
    "explanation": "100文字以内の解説"
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        try {
            // 直接JSONとしてパースを試みる
            const verse_data = JSON.parse(text);
            
            // 必須フィールドの確認
            const requiredFields = ['book', 'chapter', 'verse', 'content', 'explanation'];
            for (const field of requiredFields) {
                if (!verse_data[field]) {
                    throw new Error(`Missing required field: ${field}`);
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
            for (const field of requiredFields) {
                if (!verse_data[field]) {
                    throw new Error(`Missing required field: ${field}`);
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
                title: `📖 今日の聖書の言葉 (${currentTime})`,
                description: `**${verseData.book} ${verseData.chapter}章${verseData.verse}節**\n\n${verseData.content}\n\n💭 *${verseData.explanation}*`,
                color: 0x7289DA
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