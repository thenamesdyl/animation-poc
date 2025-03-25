import * as THREE from 'three';

// --- IMPORTANT ---
// Replace this placeholder with your actual Claude API key.
// Consider using environment variables or a secure configuration method.
// DO NOT COMMIT YOUR API KEY DIRECTLY INTO THE CODE.
const CLAUDE_API_KEY = 'YOUR_CLAUDE_API_KEY_HERE'; // <-- Replace this securely

// The specific Anthropic API endpoint you are using
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'; // Example endpoint, verify the correct one

/**
 * Sends sampled vertex data and an animation prompt to the Claude API
 * to request suggested joint locations.
 *
 * @param {Array<THREE.Vector3>} sampledVertices - An array of sampled vertex positions (world space).
 * @param {string} animationPrompt - The user's text prompt describing the desired animation.
 * @returns {Promise<object>} A promise that resolves with the parsed JSON response from Claude,
 *                              expected to contain joint location suggestions.
 * @throws {Error} If the API request fails or returns an error status.
 */
export async function getJointLocationsFromClaude(sampledVertices, animationPrompt) {
    if (!CLAUDE_API_KEY || CLAUDE_API_KEY === 'YOUR_CLAUDE_API_KEY_HERE') {
        console.error("Claude API Key is not configured. Please set it in utils/claudeAPI.js");
        throw new Error("Claude API Key not configured.");
    }
    if (!Array.isArray(sampledVertices)) {
        throw new Error("sampledVertices must be an array.");
    }
    if (typeof animationPrompt !== 'string' || !animationPrompt.trim()) {
        throw new Error("animationPrompt must be a non-empty string.");
    }

    // --- Format Data for Claude ---
    // Convert vertex data to a simple string or JSON format suitable for the prompt.
    // Example: simple string list of coordinates
    const vertexDataString = sampledVertices.map(v => `(${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)})`).join(', ');

    // --- Construct the Prompt for Claude ---
    // This prompt needs careful crafting based on how you want Claude to respond.
    // It should clearly state the goal: suggest joint locations for rigging based on
    // the provided vertex sample and the desired animation.
    const systemPrompt = `You are an expert 3D rigging assistant. Your task is to suggest plausible 3D joint locations (as an array of {x, y, z} objects) for a skeleton based on a sample of vertex coordinates from a selected region of a 3D model and a description of the desired animation for that region. Focus on the primary joints needed for the described animation. Provide the response ONLY as a JSON array of objects, each object having 'x', 'y', and 'z' properties. Do not include any other text, explanations, or markdown formatting. Example format: [{"x": 0.1, "y": 1.5, "z": -0.2}, {"x": 0.1, "y": 1.0, "z": -0.2}]`;

    const userMessage = `
Model Vertex Sample (World Coordinates):
[${vertexDataString}]

Desired Animation for this region:
"${animationPrompt}"

Suggest the 3D joint locations as a JSON array of {x, y, z} objects based on these vertices and the desired animation.
`;

    // --- Prepare API Request ---
    const requestBody = {
        model: "claude-3-5-sonnet-20240620", // Or your preferred Claude model
        max_tokens: 1024, // Adjust as needed
        system: systemPrompt,
        messages: [
            {
                role: "user",
                content: userMessage
            }
        ]
    };

    console.log("Sending request to Claude API...");
    // console.log("Request Body:", JSON.stringify(requestBody, null, 2)); // Uncomment for debugging

    try {
        const response = await fetch(CLAUDE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01' // Use the required API version
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Claude API Error Response:", errorBody);
            throw new Error(`Claude API request failed with status ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Received response from Claude API.");
        // console.log("Response Body:", JSON.stringify(data, null, 2)); // Uncomment for debugging

        // --- Extract Content ---
        // Adjust based on the actual structure of the Claude API response
        if (data.content && data.content.length > 0 && data.content[0].type === 'text') {
            const rawJson = data.content[0].text;
            try {
                // Attempt to parse the text content as JSON (as requested in the system prompt)
                const jointData = JSON.parse(rawJson);
                if (!Array.isArray(jointData)) {
                    throw new Error("Parsed response is not an array.");
                }
                // Optional: Add validation for the structure of each object in the array
                jointData.forEach((joint, index) => {
                    if (typeof joint.x !== 'number' || typeof joint.y !== 'number' || typeof joint.z !== 'number') {
                        throw new Error(`Invalid structure for joint at index ${index}. Expected {x, y, z} with numbers.`);
                    }
                });
                return jointData;
            } catch (parseError) {
                console.error("Failed to parse Claude's response as JSON:", parseError);
                console.error("Raw response text:", rawJson);
                throw new Error(`Failed to parse Claude's response as the expected JSON array. Response: ${rawJson}`);
            }
        } else {
            throw new Error("Unexpected response structure from Claude API.");
        }

    } catch (error) {
        console.error("Error calling Claude API:", error);
        throw error; // Re-throw the error for the caller to handle
    }
} 