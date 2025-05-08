import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';

// 環境変数から認証情報を取得
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Gemini APIの設定
const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genai.getGenerativeModel({ model: 'gemini-pro' });

async function generateBibleVerse() {
    try {
        const prompt = `
        聖書から、毎日の励ましとなる短い一節を1つ挙げてください。
        以下の形式で出力してください：
        - 書名、章、節番号
        - 聖句の内容
        - 簡潔な解説（100文字以内）
        
        出力は必ずJSON形式で、以下のキーを含めてください：
        {
            "book": "書名",
            "chapter": "章",
            "verse": "節",
            "content": "聖句の内容",
            "explanation": "解説"
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // JSONとしてパース
        return JSON.parse(text);
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