import * as THREE from 'three'; // Keep if needed for validation, maybe not

// --- IMPORTANT ---
// Use the API key directly from server-side environment variables.
// Ensure ANTHROPIC_API_KEY (without NEXT_PUBLIC_) is set in your .env.local
const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    // --- Basic Input Validation ---
    if (!CLAUDE_API_KEY) {
        console.error("Server-side Error: ANTHROPIC_API_KEY is not configured.");
        return res.status(500).json({ error: "API configuration error on server." });
    }

    const { sampledVertices, animationPrompt } = req.body;

    if (!Array.isArray(sampledVertices) || sampledVertices.length === 0) {
        return res.status(400).json({ error: "sampledVertices must be a non-empty array." });
    }
    if (typeof animationPrompt !== 'string' || !animationPrompt.trim()) {
        return res.status(400).json({ error: "animationPrompt must be a non-empty string." });
    }

    // --- Prepare Data for Claude (same logic as before) ---
    const vertexDataString = sampledVertices.map(v => `(${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)})`).join(', ');

    const systemPrompt = `You are an expert 3D rigging assistant specializing in creating efficient skeletons for animation. Your task is to analyze a sample of 3D vertex coordinates (in world space) representing a specific region of a 3D model, along with a user's description of the desired animation for that region. Based on this information, you must suggest **exactly 4** plausible 3D joint locations (also in world space) that would form the core structure of a skeleton needed to achieve the described animation.

**Instructions:**
1.  Analyze the provided vertex sample to understand the general shape and extent of the model region.
2.  Analyze the user's animation prompt to understand the type and range of motion required.
3.  Determine the **4 most essential joints** needed specifically for the described animation. Place them logically within the bounds suggested by the vertex sample.
4.  Output the suggested joint locations as a JSON array containing exactly 4 objects.
5.  Each object in the array must represent a single joint and have the keys "x", "y", and "z", with numerical values representing the world space coordinates.
6.  **CRITICAL:** Your response MUST contain ONLY the valid JSON array of 4 objects. Do not include any introductory text, explanations, apologies, markdown formatting (like \`\`\`json), or any characters before the opening bracket \`[\` or after the closing bracket \`]\`.

**Example Output Format:**
[{"x": 0.1, "y": 1.5, "z": -0.2}, {"x": 0.1, "y": 1.0, "z": -0.2}, {"x": 0.1, "y": 0.5, "z": -0.1}, {"x": 0.1, "y": 0.0, "z": 0.0}]
`;

    const userMessageContent = `
Here is the data for the rigging request:

**1. Sampled Vertex Coordinates (World Space):**
A sample of ${sampledVertices.length} vertex coordinates from the target region:
[${vertexDataString}]

**2. Desired Animation:**
The user wants to animate this region with the following description:
"${animationPrompt}"

**Task:**
Based on the vertex sample and the desired animation, provide **exactly 4** suggested 3D joint locations in the specified JSON format.
`;

    console.log("user message content", userMessageContent);
    const requestBody = {
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 4096, // Keep increased limit
        system: systemPrompt,
        messages: [{ role: "user", content: userMessageContent }]
    };

    // --- Make the API Call from the Server ---
    try {
        console.log("API Route: Sending request to Claude API...");
        const anthropicResponse = await fetch(CLAUDE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY, // Use the server-side key
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(requestBody)
        });

        // Forward Anthropic's status code if it's an error
        if (!anthropicResponse.ok) {
            const errorBody = await anthropicResponse.text();
            console.error("API Route: Claude API Error Response:", errorBody);
            // Send Anthropic's error status and a generic message back to the client
            return res.status(anthropicResponse.status).json({ error: `Anthropic API request failed: ${anthropicResponse.statusText}` });
        }

        const data = await anthropicResponse.json();
        console.log("API Route: Received response from Claude API.");

        // --- Extract and Parse Content (same logic as before) ---
        if (data.content && data.content.length > 0 && data.content[0].type === 'text') {
            const rawJson = data.content[0].text;
            try {
                const jointData = JSON.parse(rawJson);
                // Basic validation
                if (!Array.isArray(jointData)) throw new Error("Parsed response is not an array.");
                // Optional: Check length, structure
                // if (jointData.length !== 4) console.warn(...)
                // jointData.forEach(...)

                // --- Send Success Response to Frontend ---
                return res.status(200).json(jointData);

            } catch (parseError) {
                console.error("API Route: Failed to parse Claude's response as JSON:", parseError);
                console.error("API Route: Raw response text:", rawJson);
                return res.status(500).json({ error: "Failed to parse response from AI service." });
            }
        } else {
            console.error("API Route: Unexpected response structure from Claude API:", data);
            return res.status(500).json({ error: "Unexpected response structure from AI service." });
        }

    } catch (error) {
        console.error("API Route: Error calling Claude API:", error);
        // Distinguish network errors from API errors if possible
        return res.status(500).json({ error: "Failed to communicate with AI service." });
    }
} 