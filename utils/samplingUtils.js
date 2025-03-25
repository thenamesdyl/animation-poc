import * as THREE from 'three';

/**
 * Samples a specified ratio of vertex positions from a given set of indices.
 *
 * @param {THREE.Mesh} mesh - The mesh containing the vertices.
 * @param {Set<number>} selectedIndices - A Set containing the indices of the selected vertices.
 * @param {number} samplingRatio - The fraction (0.0 to 1.0) of selected vertices to sample.
 * @returns {Array<THREE.Vector3>} An array of THREE.Vector3 objects representing the sampled vertex positions in world space.
 * @throws {Error} If mesh, geometry, position attribute, or selectedIndices are invalid.
 */
export function sampleVertexPositions(mesh, selectedIndices, samplingRatio) {
    // --- Input Validation ---
    if (!mesh || !mesh.isMesh) {
        throw new Error("Invalid mesh provided.");
    }
    if (!mesh.geometry || !mesh.geometry.isBufferGeometry) {
        throw new Error("Mesh geometry is missing or not BufferGeometry.");
    }
    const positionAttribute = mesh.geometry.attributes.position;
    if (!positionAttribute || !positionAttribute.isBufferAttribute) {
        throw new Error("Mesh geometry is missing position attribute.");
    }
    if (!(selectedIndices instanceof Set) || selectedIndices.size === 0) {
        console.warn("sampleVertexPositions: selectedIndices is empty or not a Set. Returning empty array.");
        return [];
    }
    if (typeof samplingRatio !== 'number' || samplingRatio < 0 || samplingRatio > 1) {
        console.warn(`sampleVertexPositions: Invalid samplingRatio (${samplingRatio}). Clamping to [0, 1].`);
        samplingRatio = Math.max(0, Math.min(1, samplingRatio));
    }

    // --- Sampling Logic ---
    const indicesArray = Array.from(selectedIndices);
    const totalSelected = indicesArray.length;
    const sampleSize = Math.max(1, Math.min(totalSelected, Math.ceil(totalSelected * samplingRatio))); // Ensure at least 1 sample if possible

    const sampledPositions = [];
    const sampledIndices = new Set(); // To avoid picking the same index twice

    // Update world matrix to ensure correct world positions
    mesh.updateMatrixWorld();
    const worldMatrix = mesh.matrixWorld;

    // Randomly select unique indices
    while (sampledIndices.size < sampleSize) {
        const randomIndex = Math.floor(Math.random() * totalSelected);
        const vertexIndex = indicesArray[randomIndex];

        // Ensure the index is valid for the geometry
        if (vertexIndex >= 0 && vertexIndex < positionAttribute.count) {
            sampledIndices.add(vertexIndex);
        } else {
            console.warn(`sampleVertexPositions: Selected index ${vertexIndex} is out of bounds for geometry positions (${positionAttribute.count}). Skipping.`);
            // If we skip an invalid index, we might need to adjust logic if strict sampleSize is required,
            // but for now, we just won't add it. This could lead to slightly fewer samples than requested
            // if the input selectedIndices contains invalid values.
        }
        // Basic protection against infinite loops if all indices are invalid (unlikely)
        if (sampledIndices.size >= totalSelected) break;
    }

    // Retrieve and transform positions for sampled indices
    const vertex = new THREE.Vector3();
    sampledIndices.forEach(index => {
        vertex.fromBufferAttribute(positionAttribute, index); // Get local position
        vertex.applyMatrix4(worldMatrix); // Transform to world position
        sampledPositions.push(vertex.clone()); // Add a clone to the results array
    });

    console.log(`Sampled ${sampledPositions.length} vertex positions out of ${totalSelected} selected (Ratio: ${samplingRatio}, Target Size: ${sampleSize}).`);
    return sampledPositions;
} 