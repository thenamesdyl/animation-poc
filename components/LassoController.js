import React, { useEffect, useRef, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import ModelEditorLasso from './ModelEditorLasso';

/**
 * Manages the ModelEditorLasso instance and visualizes selected vertices.
 * @param {React.RefObject<THREE.Mesh>} targetMeshRef - Ref pointing to the mesh.
 * @param {Set<number>} selectedIndices - Current set of selected indices (from parent state).
 * @param {(indices: Set<number>) => void} onSelectionChange - Callback to update parent state.
 */
function LassoController({ targetMeshRef, selectedIndices, onSelectionChange }) {
    const { camera, gl } = useThree();
    const lassoInstanceRef = useRef(null);
    const pointsRef = useRef(); // Ref for the visualization points

    // Callback function passed to ModelEditorLasso instance
    const handleInternalSelectionChange = (indices) => {
        // Call the prop function to update the parent state
        onSelectionChange(new Set(indices));
    };

    useEffect(() => {
        const mesh = targetMeshRef.current;
        const domElement = gl.domElement;

        if (mesh && domElement && camera) {
            console.log('LassoController: Initializing Lasso Tool for mesh:', mesh.name);
            // Pass the internal callback to the constructor
            lassoInstanceRef.current = new ModelEditorLasso(camera, domElement, mesh, handleInternalSelectionChange); // Use internal handler

            return () => {
                console.log('LassoController: Disposing Lasso Tool');
                if (lassoInstanceRef.current) {
                    lassoInstanceRef.current.dispose();
                    lassoInstanceRef.current = null;
                }
                onSelectionChange(new Set()); // Clear selection in parent state on dispose
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
            onSelectionChange(new Set()); // Clear selection if dependencies invalid
        }
        // Dependencies for the effect
    }, [camera, gl.domElement, targetMeshRef, onSelectionChange]); // Added onSelectionChange to deps

    // Memoize the geometry for the points visualization
    const pointsGeometry = useMemo(() => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
        return geometry;
    }, []);

    // Update points geometry when selection changes (read from props) or mesh updates
    useFrame(() => {
        const mesh = targetMeshRef.current;
        if (!mesh || !mesh.geometry || !mesh.geometry.attributes.position || !pointsGeometry) {
            if (pointsGeometry && pointsGeometry.attributes.position.count > 0) {
                pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
                pointsGeometry.attributes.position.needsUpdate = true;
            }
            return;
        }

        const originalPositionAttribute = mesh.geometry.attributes.position;
        const selectedPositions = [];
        const tempVertex = new THREE.Vector3();

        mesh.updateMatrixWorld();

        // Use selectedIndices from props
        selectedIndices.forEach(index => {
            if (index < originalPositionAttribute.count) {
                tempVertex.fromBufferAttribute(originalPositionAttribute, index);
                tempVertex.applyMatrix4(mesh.matrixWorld);
                selectedPositions.push(tempVertex.x, tempVertex.y, tempVertex.z);
            }
        });

        // Update the points geometry
        pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(selectedPositions, 3));
        pointsGeometry.attributes.position.needsUpdate = true;
        pointsGeometry.computeBoundingSphere();
    });

    // Render only the points visualization
    return (
        <points ref={pointsRef}>
            <primitive object={pointsGeometry} attach="geometry" />
            <pointsMaterial size={5} sizeAttenuation={false} color="yellow" depthTest={false} renderOrder={1} />
        </points>
    );
}

export default LassoController; 