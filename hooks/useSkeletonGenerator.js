import { useState, useCallback } from 'react';
import * as THREE from 'three';
import { samplePrecomputedPositions } from '../utils/samplingUtils';
import { createAndBindSkeleton } from '../utils/riggingUtils';

export function useSkeletonGenerator() {
    const [isPreparing, setIsPreparing] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [generatedSkeleton, setGeneratedSkeleton] = useState(null);
    const [skinnedGeometry, setSkinnedGeometry] = useState(null); // Store geometry with skinning attributes

    // Internal state for prepared data
    const [preparedData, setPreparedData] = useState({
        groupedVertexData: null,
        geometryClone: null,
    });

    /**
     * Prepares the necessary data (vertex positions, geometry clone) for skeleton generation.
     * @param {THREE.Mesh} mesh - The target mesh.
     * @returns {boolean} - True if preparation was successful and prompt can be shown, false otherwise.
     */
    const prepare = useCallback((mesh) => {
        setIsPreparing(true);
        setError(null);
        setGeneratedSkeleton(null);
        setSkinnedGeometry(null);
        setPreparedData({ groupedVertexData: null, geometryClone: null }); // Clear previous

        // --- 1. Validation ---
        if (!mesh || !mesh.geometry || !mesh.geometry.attributes.position) {
            console.error("Skeleton Prep: Mesh or geometry position data is missing.");
            setError("Model mesh data is not available.");
            setIsPreparing(false);
            return false;
        }
        const currentVertexGroups = mesh.userData?.vertexGroups || {};
        if (Object.keys(currentVertexGroups).length === 0) {
            console.error("Skeleton Prep: No vertex groups defined.");
            setError("Please define at least one vertex group using the Attribute Setter.");
            setIsPreparing(false);
            return false;
        }

        // --- 2. Prepare Data ---
        console.log("Skeleton Prep: Preparing data...");
        const positionAttribute = mesh.geometry.attributes.position;
        const groupedData = [];
        mesh.updateMatrixWorld(); // Ensure world matrix is up-to-date

        // Iterate through vertex groups stored in userData
        for (const groupName in currentVertexGroups) {
            const indices = currentVertexGroups[groupName];
            indices.forEach(index => {
                if (index < positionAttribute.count) {
                    const vertex = new THREE.Vector3();
                    vertex.fromBufferAttribute(positionAttribute, index);
                    vertex.applyMatrix4(mesh.matrixWorld); // Calculate world position

                    groupedData.push({
                        group: groupName,
                        vertexIndex: index, // Keep original index if needed later
                        position: { x: vertex.x, y: vertex.y, z: vertex.z }
                    });
                } else {
                    console.warn(`Skeleton Prep: Index ${index} for group ${groupName} is out of bounds.`);
                }
            });
        }

        if (groupedData.length === 0) {
            console.error("Skeleton Prep: No valid vertices found in defined groups.");
            setError("No vertices associated with the defined groups. Please re-assign attributes.");
            setIsPreparing(false);
            return false;
        }

        // --- 3. Store Data & Set State ---
        const geometryClone = mesh.geometry.clone();
        setPreparedData({ groupedVertexData: groupedData, geometryClone: geometryClone });
        setShowPrompt(true); // Signal to show the prompt UI
        setIsPreparing(false);
        console.log(`Skeleton Prep: Prepared ${groupedData.length} vertices from groups:`, Object.keys(currentVertexGroups));
        return true; // Success
    }, []); // Dependencies: none, relies on arguments

    /**
     * Handles the API call and skeleton creation process.
     */
    const generate = useCallback(async () => {
        setError(null);
        setGeneratedSkeleton(null);
        setSkinnedGeometry(null);
        setIsLoading(true);

        const { groupedVertexData, geometryClone } = preparedData;

        // --- 1. Validate Inputs ---
        if (!groupedVertexData || groupedVertexData.length === 0) {
            setError("Grouped vertex data not found or empty. Please prepare data again.");
            setIsLoading(false);
            return;
        }
        if (!geometryClone) {
            setError("Model geometry not found. Please prepare data again.");
            setIsLoading(false);
            return;
        }
        if (!prompt.trim()) {
            setError("Please enter an animation prompt.");
            setIsLoading(false);
            return;
        }

        try {
            // --- 2. Sample Precomputed Positions ---
            const samplingRatio = 0.5; // 50%
            const maxSamples = 100; // Max samples
            console.log(`Skeleton Gen: Sampling ${samplingRatio * 100}% of ${groupedVertexData.length} vertices, max ${maxSamples}...`);
            const sampledPositions = samplePrecomputedPositions(groupedVertexData, samplingRatio, maxSamples);

            if (sampledPositions.length === 0) {
                throw new Error("Failed to sample any vertex positions.");
            }

            // --- 3. Call Backend API ---
            console.log(`Skeleton Gen: Sending ${sampledPositions.length} samples and prompt to API...`);
            const response = await fetch('/api/generate-joints', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sampledVertices: sampledPositions,
                    animationPrompt: prompt.trim(),
                }),
            });

            if (!response.ok) {
                let errorMsg = `API request failed (${response.status})`;
                try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; } catch (e) { /* Ignore */ }
                throw new Error(errorMsg);
            }

            const joints = await response.json();
            console.log("Skeleton Gen: API Response (Joints):", joints);

            // --- 4. Create Skeleton & Bind ---
            if (geometryClone && joints && joints.length > 0) {
                console.log("Skeleton Gen: Creating skeleton and binding attributes...");
                // createAndBindSkeleton modifies geometryClone in place
                const createdSkeleton = createAndBindSkeleton(geometryClone, joints);

                if (createdSkeleton) {
                    setGeneratedSkeleton(createdSkeleton);
                    setSkinnedGeometry(geometryClone); // Store the modified geometry
                    console.log("Skeleton Gen: Success.", createdSkeleton);
                    setShowPrompt(false); // Hide prompt UI on success
                } else {
                    throw new Error("Failed to create skeleton or bind attributes.");
                }
            } else {
                throw new Error("Missing geometry or joint data for skeleton creation.");
            }

        } catch (err) {
            console.error("Skeleton Gen: Error:", err);
            setError(err.message || "An unknown error occurred.");
            setGeneratedSkeleton(null);
            setSkinnedGeometry(null);
        } finally {
            setIsLoading(false);
        }
    }, [preparedData, prompt]); // Dependencies: preparedData, prompt

    /**
     * Cancels the prompting process.
     */
    const cancel = useCallback(() => {
        setShowPrompt(false);
        setError(null);
        setPrompt(''); // Clear prompt on cancel
        // Keep generated skeleton/geometry if user just cancels the prompt view
    }, []);

    return {
        isPreparing,
        showPrompt,
        prompt,
        setPrompt,
        isLoading,
        error,
        generatedSkeleton,
        skinnedGeometry, // Expose the geometry with skinning attributes
        prepare,
        generate,
        cancel,
    };
} 