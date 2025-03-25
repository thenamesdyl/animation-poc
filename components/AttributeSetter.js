import React, { useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

/**
 * UI component for naming and setting a custom attribute on selected vertices.
 * @param {React.RefObject<THREE.Mesh>} targetMeshRef - Ref pointing to the target mesh.
 * @param {Set<number>} selectedIndices - Set of selected vertex indices.
 * @param {() => void} onAttributeSetSuccess - Callback function when an attribute is successfully set.
 */
function AttributeSetter({ targetMeshRef, selectedIndices, onAttributeSetSuccess }) {
    const [attributeName, setAttributeName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [feedback, setFeedback] = useState('');

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
            // --- 1. Update mesh.userData.vertexGroups (Corrected Structure) ---
            if (!mesh.userData) { mesh.userData = {}; } // Ensure userData exists
            mesh.userData.vertexGroups = mesh.userData.vertexGroups || {}; // Initialize if needed

            // Ensure the array for this specific group name exists
            const groupKey = sanitizedName; // Use the sanitized name as the key
            mesh.userData.vertexGroups[groupKey] = mesh.userData.vertexGroups[groupKey] || [];

            // Add each selected index to the array for this group name
            selectedIndices.forEach(index => {
                // Ensure the index is valid before using it
                if (index < mesh.geometry.attributes.position.count) {
                    // Add the index to the array if it's not already there (optional check)
                    if (!mesh.userData.vertexGroups[groupKey].includes(index)) {
                        mesh.userData.vertexGroups[groupKey].push(index);
                    }
                } else {
                    console.warn(`AttributeSetter: Index ${index} out of bounds, skipping for userData.`);
                }
            });
            console.log(`Updated mesh.userData.vertexGroups for group "${groupKey}" with ${selectedIndices.size} vertices.`);
            // --- End of Corrected Structure Update ---


            // --- 2. Prepare and Set Geometry Attribute (Optional - Keep if needed elsewhere) ---
            const geometry = mesh.geometry;
            const vertexCount = geometry.attributes.position.count;
            // Check if this specific attribute already exists
            let bufferAttribute;
            if (geometry.attributes[finalAttributeName]) {
                bufferAttribute = geometry.attributes[finalAttributeName];
                // Reset relevant parts to 0 before setting new 1s? Or just overwrite? Overwriting is simpler.
                console.log(`Attribute '${finalAttributeName}' already exists, updating...`);
            } else {
                // Create new attribute if it doesn't exist
                const attributeArray = new Float32Array(vertexCount).fill(0.0);
                bufferAttribute = new THREE.BufferAttribute(attributeArray, 1);
                geometry.setAttribute(finalAttributeName, bufferAttribute);
                console.log(`Attribute '${finalAttributeName}' created.`);
            }

            // Set 1.0 for selected vertices in the geometry attribute
            selectedIndices.forEach(index => {
                if (index < vertexCount) {
                    bufferAttribute.setX(index, 1.0); // Set value for the vertex index
                }
            });
            bufferAttribute.needsUpdate = true; // Mark the attribute as needing update
            console.log(`Geometry attribute '${finalAttributeName}' updated.`);


            // --- Cleanup & Callback ---
            setFeedback(`Group "${sanitizedName}" set for ${selectedIndices.size} vertices.`); // Update feedback
            setAttributeName('');
            if (onAttributeSetSuccess) {
                onAttributeSetSuccess();
            }

            // Optional: Clear feedback after a delay
            setTimeout(() => setFeedback(''), 3000);

        } catch (error) {
            console.error("Error setting attribute/group:", error); // Updated log message
            alert(`An error occurred while setting the group/attribute: ${error.message}`);
            setFeedback(`Error: ${error.message}`); // Show error feedback
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
                        {isProcessing ? 'Processing...' : 'Set Group'}
                    </button>
                </div>
                {feedback && <p style={{ marginTop: '10px', color: feedback.startsWith('Error') ? '#f56565' : '#90cdf4' }}>{feedback}</p>}
            </div>
        </Html>
    );
}

export default AttributeSetter; 