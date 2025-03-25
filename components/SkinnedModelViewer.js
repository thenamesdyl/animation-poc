import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stats, GridHelper } from '@react-three/drei';
import * as THREE from 'three';

/**
 * A component to display a SkinnedMesh using provided geometry and skeleton.
 * @param {object} props
 * @param {THREE.BufferGeometry} props.geometry - The geometry with skinIndex/skinWeight attributes.
 * @param {THREE.Skeleton} props.skeleton - The skeleton containing the bones.
 */
function SkinnedModelViewer({ geometry, skeleton }) {
    const skinnedMeshRef = useRef();

    // Memoize the creation of the SkinnedMesh, material, and helper
    const { skinnedMesh, skeletonHelper } = useMemo(() => {
        if (!geometry || !skeleton || !skeleton.bones || skeleton.bones.length === 0) {
            console.log("SkinnedModelViewer: Waiting for geometry and skeleton...");
            return { skinnedMesh: null, skeletonHelper: null };
        }

        console.log("SkinnedModelViewer: Creating SkinnedMesh and SkeletonHelper...");

        // 1. Create a default material
        const material = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            metalness: 0.1,
            roughness: 0.8,
            skinning: true,
            // Make material slightly transparent to see bones inside
            transparent: true,
            opacity: 0.8,
        });

        // 2. Create the SkinnedMesh
        const mesh = new THREE.SkinnedMesh(geometry, material);

        // 3. Add the root bone as a child of the mesh
        mesh.add(skeleton.bones[0]);

        // 4. Bind the skeleton to the mesh
        mesh.bind(skeleton);

        // 5. Create the SkeletonHelper
        // The helper takes the *root* object that contains the bones, which is our SkinnedMesh
        const helper = new THREE.SkeletonHelper(mesh);
        helper.material.linewidth = 2; // Make lines thicker

        console.log("SkinnedModelViewer: SkinnedMesh and SkeletonHelper created.", mesh, helper);

        return { skinnedMesh: mesh, skeletonHelper: helper };
    }, [geometry, skeleton]);

    // --- Add useEffect for position adjustment ---
    /* // Remove or comment out this entire useEffect block
    useEffect(() => {
        if (skinnedMesh && skinnedMesh.geometry) {
            // Ensure the geometry's bounding box is computed
            if (!skinnedMesh.geometry.boundingBox) {
                skinnedMesh.geometry.computeBoundingBox();
            }

            if (skinnedMesh.geometry.boundingBox && !skinnedMesh.geometry.boundingBox.isEmpty()) {
                // Calculate offset based on the geometry's local bounding box
                const offsetY = -skinnedMesh.geometry.boundingBox.min.y;

                // Apply the offset to the SkinnedMesh position
                skinnedMesh.position.y = offsetY;
                skinnedMesh.updateMatrixWorld(true); // Update world matrix
                console.log(`SkinnedMesh adjusted by offsetY: ${offsetY}`);
            } else {
                console.warn("SkinnedModelViewer: Could not calculate geometry bounding box for repositioning.");
            }
        }
    }, [skinnedMesh]); // Run this effect when skinnedMesh changes
    */
    // --- End of position adjustment ---

    if (!skinnedMesh || !skeletonHelper) {
        return <div>Preparing skinned model...</div>;
    }

    return (
        <div style={{ height: '400px', width: '100%', border: '1px solid #ccc', marginTop: '20px' }}>
            <Canvas camera={{ position: [0, 1, 3], fov: 50 }}>
                <ambientLight intensity={0.6} />
                <directionalLight position={[5, 5, 5]} intensity={1.0} />
                <directionalLight position={[-3, -3, 2]} intensity={0.5} />

                {/* Render the created SkinnedMesh */}
                <primitive object={skinnedMesh} ref={skinnedMeshRef} />

                {/* Render the SkeletonHelper */}
                <primitive object={skeletonHelper} />

                <OrbitControls />
                <Stats />
                <gridHelper args={[10, 10]} />
            </Canvas>
        </div>
    );
}

export default SkinnedModelViewer; 