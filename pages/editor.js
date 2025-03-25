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

// Modify Model component to accept and forward a ref
const Model = forwardRef(({ url }, ref) => { // Use forwardRef
    const { scene } = useGLTF(url);
    const meshRef = useRef(); // Internal ref to find the mesh

    // Find the first mesh and assign it to the forwarded ref
    useEffect(() => {
        let foundMesh = null;
        scene.traverse((node) => {
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

        // Log model information
        scene.traverse((node) => {
            if (node.isMesh) {
                // console.log('Mesh found:', node.name); // Already logged above
            }
        });
    }, [scene, ref]);

    // Use the internal ref for the primitive object if needed,
    // but the main goal here is to populate the forwarded ref.
    return <primitive object={scene} scale={[1, 1, 1]} position={[0, 0, 0]} /* ref={meshRef} - Optional internal ref usage */ />;
});
Model.displayName = 'Model'; // Add display name for DevTools

export default function Editor() {
    const router = useRouter();
    const { modelData, clearModel } = useModelContext();
    const [isClient, setIsClient] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const targetMeshRef = useRef(); // Create a ref to hold the target mesh
    const modelMeshRef = useRef(null); // Ref to be populated by the Model component
    const [selectedIndices, setSelectedIndices] = useState(new Set()); // Lifted state
    const [hasAttributesSet, setHasAttributesSet] = useState(false); // State to track if attributes are set

    useEffect(() => {
        setIsClient(true);

        // Clean up function
        return () => {
            // Don't clear immediately as we might be navigating within the app
        };
    }, []);

    // Handle going back to the upload page
    const handleBack = () => {
        clearModel(); // Clear model data from context
        router.push('/'); // Navigate back to the home page
    };

    // Handler for the new button
    const handleContinueToAnimation = () => {
        // Navigate to the new animation page
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