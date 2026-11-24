const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })



async function generateOutline(req, res) {
    try {
        const { topic, style, numChapters, description } = req.body;

        const prompt = `
                You are an expert book architect and editorial planner. Create a cohesive, engaging book outline based on the following specifications:

                Topic: ${topic}
                Writing Style / Tone: ${style || "Informative, engaging, and accessible"}
                Number of Chapters: ${numChapters || 5}
                ${description ? `Additional Context / Description: ${description}` : ""}

                Instructions:
                1. Generate exactly ${numChapters || 5} chapters that follow a logical progression from foundational concepts to deeper insights.
                2. Each chapter must have a compelling, clear title and a concise, actionable 2-3 sentence description summarizing what the reader will learn.
                3. Maintain the requested writing style throughout all chapter titles and descriptions.
                4. Return ONLY a valid JSON array of objects. Do not include markdown code fences, introductory text, or trailing commentary.

                Output Format Example:
                [
                {
                    "title": "Chapter 1: Foundations of Modern Habit Building",
                    "description": "Explores the neuroscience behind cue-craving-response loops and why willpower alone fails. Readers will identify their existing daily triggers and learn how to design an environment that supports effortless consistency."
                },
                {
                    "title": "Chapter 2: The Two-Minute Momentum Rule",
                    "description": "Introduces micro-commitments as a practical strategy to overcome procrastination. Includes step-by-step exercises for scaling small daily actions into long-term routines."
                }
                ]
                `;


        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: prompt,
        })

        const text = response.text;

        let startIndex = text.indexOf("[");
        let endIndex = text.lastIndexOf("]");

        if (startIndex === -1 || endIndex === -1) {
            console.log("could not found json array in gemini response");
            return res.status(500).json({
                message: "failed to parse ai response, no json array found"
            })
        }

        const jsonString = text.substring(startIndex, endIndex + 1)

        try {
            const outline = JSON.parse(jsonString);
            res.status(200).json({ outline })
        } catch (err) {
            res.status(500).json({ message: "error generating outline", err })
        }
    } catch (error) {
        res.status(500).json({
            message: "server error during outline generation"
        })
    }
}

async function generateChapterContent(req, res) {
    try {
        const { chapterTitle, chapterDescription, style } = req.body;

        if (!chapterTitle || !chapterDescription) {
            return res.status(400).json({
                message: "chapterTitle and chapterDescription are required",
            });
        }

        const prompt = `
            You are an experienced book author writing a rich, engaging chapter for an eBook.

            Chapter Title: ${chapterTitle}
            Chapter Summary / Description: ${chapterDescription}
            Writing Style / Tone: ${style || "Informative, engaging, and accessible"}

            Instructions:
            1. Write a thorough, well-structured chapter that directly covers everything in the chapter description.
            2. Organize the chapter with clear section headings, smooth transitions, and practical examples or explanations suited to the writing style.
            3. Keep the tone consistent throughout and avoid meta commentary like "Here is your chapter" or word-count notes.
            4. Return clean formatted text ready for a book chapter.
            `;

        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: prompt,
        });

        const content = response.text;

        if (!content) {
            return res.status(500).json({
                message: "Failed to generate chapter content from AI response",
            });
        }

        return res.status(200).json({
            chapterTitle,
            content,
        });
    } catch (error) {
        console.error("Error generating chapter content:", error);
        if (!res.headersSent) {
            return res.status(500).json({
                message: "Server error during chapter generation",
            });
        }
    }
}


module.exports = { generateOutline, generateChapterContent }