// pages/editor.js
import { useEffect, useState, useRef, forwardRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF } from '@react-three/drei';
import { useModelContext } from '../contexts/ModelContext';
import styles from '../styles/Editor.module.css';
import LassoController from '../components/LassoController';
import AttributeSetter from '../components/AttributeSetter';
import * as THREE from 'three'; // Ensure THREE is imported
import { sampleVertexPositions } from '../utils/samplingUtils'; // Import the sampling utility

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
    const { modelData, clearModel, storeGroupedVertexData, storeModelGeometry } = useModelContext();
    const [isClient, setIsClient] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const targetMeshRef = useRef(); // Create a ref to hold the target mesh
    const modelMeshRef = useRef(null); // Ref to be populated by the Model component
    const [selectedIndices, setSelectedIndices] = useState(new Set()); // Lifted state
    const [hasAttributesSet, setHasAttributesSet] = useState(false); // State to track if attributes are set
    const [vertexGroups, setVertexGroups] = useState({});
    const controlsRef = useRef(); // Ref for OrbitControls

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

    // --- Debugging: Sample and print selected vertices ---
    useEffect(() => {
        const mesh = modelMeshRef.current;
        // Only sample if in edit mode, mesh exists, and there are selected vertices
        if (editMode && mesh && selectedIndices.size > 0) {
            try {
                // Calculate ratio for ~10 samples. sampleVertexPositions handles edge cases.
                const ratio = 10 / selectedIndices.size;
                const sampledPoints = sampleVertexPositions(mesh, selectedIndices, ratio);
                console.log(`Sampled ${sampledPoints.length} vertex world positions (target: 10):`, sampledPoints.map(v => ({ x: v.x, y: v.y, z: v.z }))); // Log cleaner objects
            } catch (error) {
                console.error("Error sampling vertex positions:", error);
            }
        }
    }, [selectedIndices, editMode]); // Re-run when selection or editMode changes
    // --- End of Debugging ---

    // Handle going back to the upload page
    const handleBack = () => {
        clearModel(); // Clear model data from context
        router.push('/'); // Navigate back to the home page
    };

    // Handler for the new button
    const handleContinueToAnimation = () => {
        const mesh = modelMeshRef.current;

        // --- 1. Validation ---
        if (!mesh || !mesh.geometry || !mesh.geometry.attributes.position) {
            console.error("Cannot continue: Mesh or geometry position data is missing.");
            alert("Error: Model mesh data is not available.");
            return;
        }
        // Ensure vertexGroups are derived from mesh.userData for consistency
        const currentVertexGroups = mesh.userData?.vertexGroups || {};
        if (Object.keys(currentVertexGroups).length === 0) {
            console.error("Cannot continue: No vertex groups defined.");
            alert("Error: Please define at least one vertex group using the Attribute Setter.");
            return;
        }

        // --- 2. Collect Indices and Calculate World Positions ---
        console.log("Calculating world positions for grouped vertices...");
        const vertexDataForContext = [];
        const processedIndices = new Set(); // Avoid processing the same index multiple times
        const positionAttribute = mesh.geometry.attributes.position;
        const vertex = new THREE.Vector3();
        mesh.updateMatrixWorld(); // Ensure world matrix is up-to-date

        // Use currentVertexGroups from mesh.userData
        for (const indexStr in currentVertexGroups) {
            const vertexIndex = parseInt(indexStr, 10);
            // Check bounds and if already processed
            if (!isNaN(vertexIndex) && vertexIndex >= 0 && vertexIndex < positionAttribute.count && !processedIndices.has(vertexIndex)) {
                processedIndices.add(vertexIndex); // Mark as processed

                // Calculate world position
                vertex.fromBufferAttribute(positionAttribute, vertexIndex);
                vertex.applyMatrix4(mesh.matrixWorld);

                // Store plain object for context
                vertexDataForContext.push({
                    index: vertexIndex,
                    position: { x: vertex.x, y: vertex.y, z: vertex.z }
                });
            }
        }

        // --- 3. Store Data in Context ---
        console.log(`Storing ${vertexDataForContext.length} grouped vertex data points in context.`);
        storeGroupedVertexData(vertexDataForContext);

        console.log("Storing mesh geometry in context.");
        storeModelGeometry(mesh.geometry); // Store the geometry

        // --- 4. Navigate ---
        console.log("Navigating to animation page...");
        router.push('/animation');
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
                    >
                        {editMode ? 'View Mode' : 'Edit Mode (Lasso)'}
                    </button>

                    {/* Conditionally render the Continue button */}
                    {hasAttributesSet && (
                        <button
                            className={styles.continueButton} // Add a style for this button
                            onClick={handleContinueToAnimation}
                        >
                            Continue to Animation
                        </button>
                    )}
                </div>

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
                        {editMode && modelMeshRef.current && ( // Ensure meshRef is current
                            <LassoController
                                targetMeshRef={modelMeshRef}
                                selectedIndices={selectedIndices}
                                onSelectionChange={setSelectedIndices}
                            />
                        )}

                        {/* Render the AttributeSetter component */}
                        {/* Pass the success callback */}
                        {editMode && modelMeshRef.current && selectedIndices.size > 0 && (
                            <AttributeSetter
                                targetMeshRef={modelMeshRef}
                                selectedIndices={selectedIndices}
                                onAttributeSetSuccess={handleAttributeSetSuccess} // Pass the callback
                            />
                        )}

                        <OrbitControls
                            enableDamping
                            dampingFactor={0.1}
                            enabled={!editMode} // Disable orbit controls in edit mode
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
            </main>
        </div>
    );
}