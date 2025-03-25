import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../styles/Animation.module.css'; // Create this CSS module
import { useModelContext } from '../contexts/ModelContext'; // Import context hook
// Import the *new* sampling function
import { samplePrecomputedPositions } from '../utils/samplingUtils';
import { createAndBindSkeleton } from '../utils/riggingUtils'; // Import the new rigging utility
import * as THREE from 'three'; // Import THREE
import SkinnedModelViewer from '../components/SkinnedModelViewer'; // Import the new component

export default function AnimationPage() {
    const router = useRouter();
    // Get groupedVertexData AND modelGeometry from context
    const { groupedVertexData, modelGeometry } = useModelContext();
    const [animationPrompt, setAnimationPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [suggestedJoints, setSuggestedJoints] = useState(null);
    const [skeleton, setSkeleton] = useState(null); // State to hold the created skeleton

    // Add a check on mount to ensure geometry is loaded
    useEffect(() => {
        if (!modelGeometry) {
            console.warn("AnimationPage: Model geometry not found in context on mount.");
            // Optionally, show a message or redirect
            // setError("Model geometry is missing. Please go back to the editor.");
        }
    }, [modelGeometry]);

    const handleBack = () => {
        // Navigate back to the editor page or home page as appropriate
        // You might need context or query params to know which model was being edited
        router.back(); // Simple back navigation
    };

    const handleGenerateAnimation = async () => {
        setError(null);
        setSuggestedJoints(null);
        setSkeleton(null); // Clear previous skeleton
        setIsLoading(true);

        // --- 1. Validate Inputs ---
        // Check groupedVertexData from context
        if (!groupedVertexData || groupedVertexData.length === 0) {
            setError("Grouped vertex data not found. Please go back to the editor, define groups, and click 'Continue'.");
            setIsLoading(false);
            return;
        }
        // Check modelGeometry from context
        if (!modelGeometry) {
            setError("Model geometry not found. Please go back to the editor and click 'Continue'.");
            setIsLoading(false);
            return;
        }
        if (!animationPrompt.trim()) {
            setError("Please enter an animation prompt.");
            setIsLoading(false);
            return;
        }

        try {
            // --- 2. Sample Precomputed Positions ---
            const samplingRatio = 0.5; // 50%
            const maxSamples = 10; // Max 5000 vertices
            console.log(`Sampling ${samplingRatio * 100}% of ${groupedVertexData.length} precomputed vertices, up to a max of ${maxSamples}...`);
            const sampledPositions = samplePrecomputedPositions(groupedVertexData, samplingRatio, maxSamples);

            if (sampledPositions.length === 0) {
                setError("Failed to sample any vertex positions from the provided data.");
                setIsLoading(false);
                return;
            }

            // --- 3. Call Backend API Route for Joint Suggestions ---
            console.log(`Sending ${sampledPositions.length} sampled positions and prompt to backend API route...`);

            const response = await fetch('/api/generate-joints', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sampledVertices: sampledPositions,
                    animationPrompt: animationPrompt.trim(),
                }),
            });

            if (!response.ok) {
                let errorMsg = `Request failed with status ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch (e) { /* Ignore */ }
                throw new Error(errorMsg);
            }

            const joints = await response.json();

            // --- 4. Process Response (Joints) ---
            console.log("Backend Response (Suggested Joints):", joints);
            setSuggestedJoints(joints); // Store raw joint suggestions

            // --- 5. Create Skeleton and Bind Attributes to Geometry ---
            console.log("Attempting to create skeleton and bind attributes to geometry...");
            if (modelGeometry && joints && joints.length > 0) {
                // createAndBindSkeleton modifies modelGeometry in place
                const createdSkeleton = createAndBindSkeleton(modelGeometry, joints);

                if (createdSkeleton) {
                    setSkeleton(createdSkeleton); // Store the created skeleton in state
                    console.log("Successfully created skeleton. Geometry attributes updated.", createdSkeleton);
                    // No alert here, rely on the viewer appearing
                    // The SkinnedMesh will now be created by the SkinnedModelViewer component
                } else {
                    throw new Error("Failed to create skeleton or bind attributes.");
                }
            } else {
                throw new Error("Missing geometry or joint data needed for skeleton creation.");
            }

        } catch (err) {
            console.error("Error during animation generation process:", err);
            setError(err.message || "An unknown error occurred.");
            setSuggestedJoints(null);
            setSkeleton(null); // Clear skeleton on error
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <Head>
                <title>Create Animation</title>
                <meta name="description" content="Generate animations for your 3D model" />
            </Head>

            <main className={styles.main}>
                <div className={styles.header}>
                    <button className={styles.backButton} onClick={handleBack}>
                        Back to Editor
                    </button>
                    <h1 className={styles.title}>Generate Animation</h1>
                </div>

                <div className={styles.content}>
                    <p className={styles.instructions}>
                        Describe the animation you want to create for the selected parts of your model.
                        The system will suggest joint locations and prepare the model for animation.
                    </p>
                    <textarea
                        className={styles.promptInput}
                        value={animationPrompt}
                        onChange={(e) => setAnimationPrompt(e.target.value)}
                        placeholder="e.g., 'Make the selected arm wave hello', 'Create a walking cycle for the legs'"
                        rows={5}
                    />
                    <button
                        className={styles.generateButton}
                        onClick={handleGenerateAnimation}
                        // Disable if geometry is missing
                        disabled={!animationPrompt.trim() || isLoading || !groupedVertexData || groupedVertexData.length === 0 || !modelGeometry}
                    >
                        {isLoading ? 'Generating...' : 'Generate Skeleton & Preview'}
                    </button>
                    {isLoading && <p className={styles.loadingText}>Processing request, please wait...</p>}
                    {error && <p className={styles.errorText}>Error: {error}</p>}

                    {/* Conditionally render the SkinnedModelViewer */}
                    {modelGeometry && skeleton && !isLoading && !error && (
                        <div className={styles.viewerContainer}> {/* Optional: Add styling */}
                            <h4>Skinned Model Preview</h4>
                            <SkinnedModelViewer geometry={modelGeometry} skeleton={skeleton} />
                        </div>
                    )}

                    {/* Display info (optional, can be removed if viewer is enough) */}
                    {skeleton && !isLoading && (
                        <div className={styles.results}>
                            <h4>Skeleton Details</h4>
                            <p>Skeleton with {skeleton.bones.length} bones generated.</p>
                            <pre>Joint Positions: {JSON.stringify(suggestedJoints, null, 2)}</pre>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
} 