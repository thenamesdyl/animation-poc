// pages/editor.js
import { useEffect, useState, useRef, forwardRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF } from '@react-three/drei';
import { useModelContext } from '../contexts/ModelContext';
import styles from '../styles/Editor.module.css';
import LassoController from '../components/LassoController';
import AttributeSetter from '../components/AttributeSetter';
import * as THREE from 'three'; // Ensure THREE is imported
import { useSkeletonGenerator } from '../hooks/useSkeletonGenerator'; // Import the custom hook
import AnimationPromptUI from '../components/AnimationPromptUI'; // Import the prompt UI component

// Modify Model component to accept and forward a ref
const Model = forwardRef(({ url }, ref) => { // Use forwardRef
    const { scene } = useGLTF(url);
    const meshRef = useRef(); // Internal ref to find the mesh

    // Find the first mesh and assign it to the forwarded ref
    useEffect(() => {
        if (!scene) return; // Guard against scene not being loaded yet

        // --- Calculate Bounding Box and Reposition ---
        scene.updateMatrixWorld(true); // Ensure world matrices are up-to-date before calculation
        const modelBoundingBox = new THREE.Box3();

        scene.traverse((node) => {
            if (node.isMesh) {
                // Ensure geometry bounding box is computed
                if (!node.geometry.boundingBox) {
                    node.geometry.computeBoundingBox();
                }
                if (node.geometry.boundingBox) { // Check if boundingBox exists
                    const meshWorldBoundingBox = node.geometry.boundingBox.clone();
                    meshWorldBoundingBox.applyMatrix4(node.matrixWorld); // Transform to world space
                    modelBoundingBox.union(meshWorldBoundingBox); // Correct method: union
                } else {
                    console.warn(`Mesh "${node.name}" has no bounding box.`);
                }
            }
        });

        // Check if the bounding box is valid (not empty)
        if (!modelBoundingBox.isEmpty()) {
            // Calculate the vertical offset needed to place the lowest point at Y=0
            const offsetY = -modelBoundingBox.min.y;

            // Apply the offset to the root scene object
            scene.position.y += offsetY; // Adjust current position
            scene.updateMatrixWorld(true); // IMPORTANT: Update world matrix *after* position change
            console.log(`Model adjusted by offsetY: ${offsetY}`);
        } else {
            console.warn("Could not calculate model bounding box for repositioning.");
        }
        // --- End of Repositioning Logic ---

        // --- Find Mesh and Assign Ref (Now uses original positioning relative to adjusted scene) ---
        let foundMesh = null;
        scene.traverse((node) => { // Traverse the scene with its original positioning
            if (!foundMesh && node.isMesh) {
                console.log('Model Component: Found mesh:', node.name);
                foundMesh = node;
            }
        });
        // Assign the found mesh to the forwarded ref
        if (ref) {
            ref.current = foundMesh;
        }
        // Assign to internal ref for potential direct use if needed
        meshRef.current = foundMesh;

        // Log model information (optional)
        // scene.traverse((node) => {
        //     if (node.isMesh) {
        //         // console.log('Mesh found:', node.name);
        //     }
        // });

    }, [scene, ref, url]); // Dependencies remain the same

    // Use the internal ref for the primitive object if needed,
    // but the main goal here is to populate the forwarded ref.
    // The scene object itself is already repositioned before rendering.
    return <primitive object={scene} scale={[1, 1, 1]} /* position is now handled by the scene object itself */ />;
});
Model.displayName = 'Model'; // Add display name for DevTools

export default function Editor() {
    const router = useRouter();
    const { modelData, clearModel /*, storeGroupedVertexData, storeModelGeometry */ } = useModelContext();
    const [isClient, setIsClient] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const modelMeshRef = useRef(null); // Ref to be populated by the Model component
    const [selectedIndices, setSelectedIndices] = useState(new Set());
    const [hasAttributesSet, setHasAttributesSet] = useState(false);
    const controlsRef = useRef(); // Ref for OrbitControls

    // --- Use the Skeleton Generator Hook ---
    const {
        isPreparing, // Renamed from previous example for clarity
        showPrompt,
        prompt,
        setPrompt,
        isLoading: isGeneratingSkeleton, // Rename for clarity if needed
        error: skeletonError,
        generatedSkeleton,
        skinnedGeometry, // Get the geometry with skinning attributes
        prepare: prepareForAnimation, // Rename function for clarity
        generate: generateSkeleton,
        cancel: cancelSkeletonGeneration,
    } = useSkeletonGenerator();
    // --- End Hook Usage ---

    useEffect(() => {
        setIsClient(true);

        // Clean up function
        return () => {
            // Don't clear immediately as we might be navigating within the app
        };
    }, []);

    // Redirect if no model data
    useEffect(() => {
        if (!modelData?.loaded) {
            router.push('/');
        }
    }, [modelData, router]);

    // Clear context on unmount
    useEffect(() => {
        return () => {
            // Optional: Decide if you want to clear model data when leaving editor
            // clearModel();
        };
    }, [clearModel]);

    // Handle going back to the upload page
    const handleBack = () => {
        clearModel(); // Clear model data from context
        router.push('/'); // Navigate back to the home page
    };

    // --- Update the button handler to use the hook's prepare function ---
    const handlePrepareClick = () => {
        const mesh = modelMeshRef.current;
        if (mesh) {
            // Call the prepare function from the hook
            prepareForAnimation(mesh);
            // The hook will set showPrompt to true on success
        } else {
            console.error("Prepare Button: Target mesh ref is not current.");
            alert("Error: Model mesh not loaded correctly.");
        }
    };

    // Callback for AttributeSetter
    const handleAttributeSetSuccess = () => {
        setHasAttributesSet(true); // Update state when an attribute is set
    };

    // If no model data, redirect to home page
    if (isClient && !modelData?.loaded) {
        router.push('/');
        return null;
    }

    if (!modelData?.modelUrl) {
        // Handle case where model URL is not available
        return <div>Loading model or redirecting...</div>;
    }

    return (
        <div className={styles.container}>
            <Head>
                <title>3D Animation Editor</title>
                <meta name="description" content="Edit your 3D model and create animations" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            </Head>

            <main className={styles.main}>
                <div className={styles.header}>
                    <button className={styles.backButton} onClick={handleBack}>
                        Back
                    </button>
                    <h1 className={styles.title}>3D Model Editor</h1>
                    {modelData?.modelName && <h2 className={styles.modelName}>{modelData.modelName}</h2>}

                    {/* Toggle edit mode button */}
                    <button
                        className={`${styles.editModeButton} ${editMode ? styles.active : ''}`}
                        onClick={() => setEditMode(!editMode)}
                        disabled={showPrompt || isGeneratingSkeleton || isPreparing} // Disable while prompting/generating/preparing
                    >
                        {editMode ? 'View Mode' : 'Edit Mode (Lasso)'}
                    </button>

                    {/* Conditionally render the Prepare/Animate button */}
                    {hasAttributesSet && (
                        <button
                            className={styles.continueButton} // Reuse style
                            onClick={handlePrepareClick} // Use the updated handler
                            disabled={showPrompt || isGeneratingSkeleton || isPreparing} // Disable if prompt is open or busy
                        >
                            {isPreparing ? 'Preparing...' : 'Prepare for Animation'}
                        </button>
                    )}
                </div>

                {/* --- Conditionally render the Animation Prompt UI --- */}
                {showPrompt && (
                    <AnimationPromptUI
                        prompt={prompt}
                        onPromptChange={setPrompt}
                        onGenerate={generateSkeleton}
                        onCancel={cancelSkeletonGeneration}
                        isLoading={isGeneratingSkeleton}
                        error={skeletonError}
                    />
                )}
                {/* --- End Animation Prompt UI --- */}

                <div className={styles.sceneContainer}>
                    <Canvas
                        camera={{ position: [0, 2, 5], fov: 50 }}
                        style={{ width: '100%', height: '100%' }}
                    >
                        <ambientLight intensity={0.5} />
                        <directionalLight
                            position={[10, 10, 5]}
                            intensity={1}
                            castShadow
                        />

                        {/* Always render the Model, pass the ref */}
                        <Model url={modelData.modelUrl} ref={modelMeshRef} />

                        {/* Conditionally render LassoController when in edit mode */}
                        {editMode && !showPrompt && modelMeshRef.current && ( // Ensure meshRef is current
                            <LassoController
                                targetMeshRef={modelMeshRef}
                                selectedIndices={selectedIndices}
                                onSelectionChange={setSelectedIndices}
                            />
                        )}

                        {/* Render the AttributeSetter component */}
                        {editMode && !showPrompt && modelMeshRef.current && selectedIndices.size > 0 && (
                            <AttributeSetter
                                targetMeshRef={modelMeshRef}
                                selectedIndices={selectedIndices}
                                onAttributeSetSuccess={handleAttributeSetSuccess} // Pass the callback
                            />
                        )}

                        {/* --- Render Skeleton Helper --- */}
                        {generatedSkeleton && <SkeletonVisualizer skeleton={generatedSkeleton} />}
                        {/* --- End Skeleton Helper --- */}

                        <OrbitControls
                            ref={controlsRef} // Make sure you have a ref if you need to interact with controls directly
                            enableDamping
                            dampingFactor={0.1}
                            // This condition should work correctly:
                            // Controls are enabled ONLY IF:
                            // - Not in editMode AND
                            // - The prompt is not currently shown
                            enabled={!editMode && !showPrompt}
                        />
                        <Environment preset="sunset" />
                        <gridHelper args={[10, 10]} />
                    </Canvas>

                    {/* Mobile touch controls */}
                    <div className={styles.mobileControls}>
                        {/* Left joystick for movement/steering */}
                        <div className={styles.leftJoystick}></div>

                        {/* Right joystick for camera control */}
                        <div className={styles.rightJoystick}></div>

                        {/* Bottom arc layout for abilities */}
                        <div className={styles.abilityButtons}>
                            {Array(6).fill(0).map((_, i) => (
                                <button
                                    key={i}
                                    className={styles.abilityButton}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Optional: Display skeleton info */}
                {generatedSkeleton && !isGeneratingSkeleton && !showPrompt && (
                    <div className={styles.results}> {/* Reuse or create style */}
                        <h4>Skeleton Generated</h4>
                        <p>Skeleton with {generatedSkeleton.bones.length} bones created.</p>
                        {/* Displaying skinnedGeometry info might be too verbose */}
                    </div>
                )}
            </main>
        </div>
    );
}

// Helper component to render the skeleton (can stay the same or be simplified)
const SkeletonVisualizer = ({ skeleton }) => {
    const helperRef = useRef();

    useEffect(() => {
        // Clean up previous helper (optional, primitive handles removal)
        // if (helperRef.current && helperRef.current.parent) {
        //     helperRef.current.parent.remove(helperRef.current);
        // }
        // Always reset the ref at the start of the effect
        helperRef.current = null;

        if (skeleton && skeleton.bones.length > 0) {
            // Find a suitable object for the helper (e.g., the root bone's parent or the first bone)
            const rootObject = skeleton.bones[0].parent || skeleton.bones[0];
            if (rootObject && rootObject.isObject3D) { // Add check if rootObject is valid Object3D
                try {
                    helperRef.current = new THREE.SkeletonHelper(rootObject);
                    helperRef.current.material.linewidth = 2;
                    console.log("SkeletonVisualizer: Created helper for", rootObject);
                } catch (error) {
                    console.error("SkeletonVisualizer: Error creating SkeletonHelper:", error);
                    helperRef.current = null; // Ensure ref is null on error
                }
            } else {
                console.warn("SkeletonVisualizer: Could not find valid root object for SkeletonHelper.");
                // helperRef.current is already null from the start of useEffect
            }
        } else {
            // Skeleton is null or has no bones
            // helperRef.current is already null from the start of useEffect
            console.log("SkeletonVisualizer: No valid skeleton provided.");
        }
    }, [skeleton]); // Dependency remains skeleton

    // Use useFrame to ensure the helper is updated if the skeleton/bones animate later
    useFrame(() => {
        // Check if helperRef.current exists and has an update method before calling
        if (helperRef.current && typeof helperRef.current.update === 'function') {
            helperRef.current.update();
        }
    }); // Removed the line number causing the error in the log

    // Return the primitive if the helper exists
    return helperRef.current ? <primitive object={helperRef.current} /> : null;
};