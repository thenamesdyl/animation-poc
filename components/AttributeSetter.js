import React, { useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

/**
 * UI component for naming and setting a custom attribute on selected vertices.
 * @param {React.RefObject<THREE.Mesh>} targetMeshRef - Ref pointing to the target mesh.
 * @param {Set<number>} selectedIndices - Set of selected vertex indices.
 * @param {function} [onAttributeSet] - Optional callback after attribute is set.
 */
function AttributeSetter({ targetMeshRef, selectedIndices, onAttributeSet }) {
    const [attributeName, setAttributeName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSetAttribute = async () => {
        const mesh = targetMeshRef.current;
        const name = attributeName.trim();

        // --- Validation ---
        if (isProcessing) return;
        if (!mesh) {
            console.warn("Set Attribute: Target mesh is not available.");
            alert("Error: Target mesh not found.");
            return;
        }
        if (!mesh.geometry || !mesh.geometry.isBufferGeometry) {
            console.warn("Set Attribute: Mesh geometry is not a BufferGeometry.");
            alert("Error: Invalid mesh geometry.");
            return;
        }
        if (selectedIndices.size === 0) {
            // This component might not even render if size is 0, but good to double-check
            alert("No vertices selected.");
            return;
        }
        if (!name) {
            alert("Please enter a name for the attribute.");
            return;
        }
        const sanitizedName = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
        if (!sanitizedName) {
            alert("Invalid attribute name. Please use alphanumeric characters and underscores.");
            return;
        }
        const finalAttributeName = `custom_${sanitizedName}`;

        setIsProcessing(true);

        try {
            // --- Prepare Attribute Data ---
            const geometry = mesh.geometry;
            const vertexCount = geometry.attributes.position.count;
            const attributeArray = new Float32Array(vertexCount).fill(0.0);

            selectedIndices.forEach(index => {
                if (index < vertexCount) {
                    attributeArray[index] = 1.0;
                }
            });

            // --- Create and Set Attribute ---
            const bufferAttribute = new THREE.BufferAttribute(attributeArray, 1);
            geometry.setAttribute(finalAttributeName, bufferAttribute);

            console.log(`Attribute '${finalAttributeName}' set on geometry. Marked ${selectedIndices.size} vertices.`);
            alert(`Attribute '${finalAttributeName}' created successfully!`);

            // --- Cleanup & Callback ---
            setAttributeName('');
            if (onAttributeSet) {
                onAttributeSet(finalAttributeName); // Notify parent if needed
            }

        } catch (error) {
            console.error("Error setting attribute:", error);
            alert(`An error occurred while setting the attribute: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // Render the UI using Drei's Html component
    return (
        <Html position={[0, 0, 0]} wrapperClass="attribute-setter-ui-wrapper" style={{ pointerEvents: 'none' }}>
            <div style={{
                position: 'absolute',
                top: '20px', // Adjust position as needed, maybe below LassoController's UI
                right: '20px',
                background: 'rgba(0, 0, 0, 0.7)',
                padding: '15px',
                borderRadius: '8px',
                color: 'white',
                fontFamily: 'sans-serif',
                pointerEvents: 'auto', // Enable interaction
                minWidth: '200px' // Ensure it has some width
            }}>
                <h4 style={{ marginTop: 0, marginBottom: '10px', borderBottom: '1px solid #555', paddingBottom: '5px' }}>Set Vertex Group</h4>
                <p style={{ margin: '0 0 10px 0' }}>Selected: {selectedIndices.size} vertices</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input
                        type="text"
                        placeholder="Group Name"
                        value={attributeName}
                        onChange={(e) => setAttributeName(e.target.value)}
                        disabled={isProcessing}
                        style={{
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #555',
                            background: '#333',
                            color: 'white'
                        }}
                    />
                    <button
                        onClick={handleSetAttribute}
                        disabled={isProcessing || selectedIndices.size === 0}
                        style={{
                            padding: '10px 15px',
                            borderRadius: '4px',
                            border: 'none',
                            background: (isProcessing || selectedIndices.size === 0) ? '#555' : '#007bff', // Blue color
                            color: 'white',
                            cursor: (isProcessing || selectedIndices.size === 0) ? 'not-allowed' : 'pointer',
                            opacity: (isProcessing || selectedIndices.size === 0) ? 0.6 : 1,
                            transition: 'background 0.3s ease'
                        }}
                    >
                        {isProcessing ? 'Processing...' : 'Set Group Attribute'}
                    </button>
                </div>
            </div>
        </Html>
    );
}

export default AttributeSetter; 