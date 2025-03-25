import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import ModelEditorLasso from './ModelEditorLasso'; // Adjusted import path

/**
 * Manages the ModelEditorLasso instance and visualizes selected vertices.
 * @param {React.RefObject<THREE.Mesh>} targetMeshRef - Ref pointing to the mesh.
 */
function LassoController({ targetMeshRef }) {
    const { camera, gl } = useThree();
    const lassoInstanceRef = useRef(null);
    const [selectedIndices, setSelectedIndices] = useState(new Set()); // State for selected indices
    const pointsRef = useRef(); // Ref for the visualization points

    // Callback function to update selected indices state
    const handleSelectionChange = (indices) => {
        // Create a new Set to ensure state update triggers re-render
        setSelectedIndices(new Set(indices));
    };

    useEffect(() => {
        const mesh = targetMeshRef.current;
        const domElement = gl.domElement;

        if (mesh && domElement && camera) {
            console.log('LassoController: Initializing Lasso Tool for mesh:', mesh.name);
            // Pass the callback to the constructor
            lassoInstanceRef.current = new ModelEditorLasso(camera, domElement, mesh, handleSelectionChange);

            return () => {
                console.log('LassoController: Disposing Lasso Tool');
                if (lassoInstanceRef.current) {
                    lassoInstanceRef.current.dispose();
                    lassoInstanceRef.current = null;
                }
                setSelectedIndices(new Set()); // Clear selection on dispose
            };
        } else {
            // Ensure cleanup if dependencies become invalid
            if (lassoInstanceRef.current) {
                console.log('LassoController: Disposing Lasso Tool (invalid dependencies)');
                lassoInstanceRef.current.dispose();
                lassoInstanceRef.current = null;
            }
            if (!mesh) {
                console.warn("LassoController: Target mesh ref is not set or mesh not found.");
            }
            setSelectedIndices(new Set()); // Clear selection if dependencies invalid
        }
        // Dependencies for the effect
    }, [camera, gl.domElement, targetMeshRef]); // Removed handleSelectionChange from deps

    // Memoize the geometry for the points visualization
    const pointsGeometry = useMemo(() => {
        const geometry = new THREE.BufferGeometry();
        // Initialize with empty attributes to avoid errors before selection
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
        return geometry;
    }, []);

    // Update points geometry when selection changes or mesh updates
    useFrame(() => {
        const mesh = targetMeshRef.current;
        if (!mesh || !mesh.geometry || !mesh.geometry.attributes.position || !pointsGeometry) {
            // Ensure geometry is empty if no mesh or selection
            if (pointsGeometry && pointsGeometry.attributes.position.count > 0) {
                pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
                pointsGeometry.attributes.position.needsUpdate = true;
            }
            return;
        }

        const originalPositionAttribute = mesh.geometry.attributes.position;
        const selectedPositions = [];
        const tempVertex = new THREE.Vector3();

        // Apply mesh's world matrix to get world coordinates
        mesh.updateMatrixWorld(); // Ensure matrixWorld is up-to-date

        selectedIndices.forEach(index => {
            if (index < originalPositionAttribute.count) {
                // Get vertex position in local space
                tempVertex.fromBufferAttribute(originalPositionAttribute, index);
                // Transform vertex position to world space
                tempVertex.applyMatrix4(mesh.matrixWorld);
                selectedPositions.push(tempVertex.x, tempVertex.y, tempVertex.z);
            }
        });

        // Update the points geometry
        pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(selectedPositions, 3));
        pointsGeometry.attributes.position.needsUpdate = true; // Mark attribute for update
        pointsGeometry.computeBoundingSphere(); // Update bounding sphere for visibility checks
    });

    // Render the points visualization if there are selected vertices
    return (
        <points ref={pointsRef} geometry={pointsGeometry}>
            <pointsMaterial
                color="yellow"
                size={10}
                sizeAttenuation={false}
                depthTest={false}
                transparent={true}
                opacity={0.1}
            />
        </points>
    );
}

export default LassoController; 