import * as THREE from 'three';

/**
 * Creates THREE.Bone objects from an array of joint positions.
 * For now, it creates a flat hierarchy with all bones parented to the first bone.
 * @param {Array<{x: number, y: number, z: number}>} jointPositions - Array of joint positions.
 * @returns {Array<THREE.Bone>} An array of THREE.Bone objects.
 */
function createBones(jointPositions) {
    const bones = [];
    if (!jointPositions || jointPositions.length === 0) {
        console.warn("No joint positions provided to createBones.");
        return bones;
    }

    // Create the first bone (root or base)
    const firstBone = new THREE.Bone();
    firstBone.position.set(jointPositions[0].x, jointPositions[0].y, jointPositions[0].z);
    firstBone.name = `Bone_0`; // Naming convention
    bones.push(firstBone);

    // Create subsequent bones and parent them to the first bone for simplicity
    // A better approach would involve inferring hierarchy or getting it from the AI
    for (let i = 1; i < jointPositions.length; i++) {
        const bone = new THREE.Bone();
        const pos = jointPositions[i];

        // Position relative to the parent (first bone)
        bone.position.set(
            pos.x - firstBone.position.x,
            pos.y - firstBone.position.y,
            pos.z - firstBone.position.z
        );
        bone.name = `Bone_${i}`;
        firstBone.add(bone); // Add as child of the first bone
        bones.push(bone);
    }

    console.log(`Created ${bones.length} bones.`);
    return bones;
}

/**
 * Calculates simple skin weights and indices based on the nearest bone.
 * Assigns each vertex entirely to the single nearest bone.
 * @param {THREE.BufferGeometry} geometry - The geometry to skin.
 * @param {Array<THREE.Bone>} bones - The bones of the skeleton.
 */
function calculateNearestBoneWeights(geometry, bones) {
    if (!geometry.attributes.position) {
        console.error("Geometry is missing position attribute.");
        return;
    }
    if (!bones || bones.length === 0) {
        console.error("No bones provided for skin weighting.");
        return;
    }

    const positionAttribute = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    const numVertices = positionAttribute.count;
    const skinIndices = []; // Stores the index of the bone influencing the vertex
    const skinWeights = []; // Stores the weight of the influence (always 1.0 in this simple case)

    // Get world positions of bones for distance calculation
    const boneWorldPositions = bones.map(bone => {
        // Need to update world matrix if bones have hierarchy/transforms
        // For this simple flat structure relative to origin (or first bone),
        // we can approximate with their initial positions for now.
        // A proper implementation requires updating the skeleton's world matrices.
        const worldPos = new THREE.Vector3();
        bone.getWorldPosition(worldPos); // Get world position
        return worldPos;
    });

    if (boneWorldPositions.length === 0) {
        console.error("Could not determine bone world positions.");
        return; // Cannot proceed without bone positions
    }


    console.log(`Calculating nearest bone weights for ${numVertices} vertices and ${bones.length} bones...`);

    for (let i = 0; i < numVertices; i++) {
        vertex.fromBufferAttribute(positionAttribute, i);
        // Note: We are comparing vertex local positions to bone world positions.
        // This is an approximation. A more accurate method would transform
        // vertices to world space or bones to local space.
        // However, for a simple "nearest" heuristic on an untransformed mesh, this might suffice.

        let nearestBoneIndex = -1;
        let minDistanceSq = Infinity;

        for (let j = 0; j < boneWorldPositions.length; j++) {
            const distanceSq = vertex.distanceToSquared(boneWorldPositions[j]);
            if (distanceSq < minDistanceSq) {
                minDistanceSq = distanceSq;
                nearestBoneIndex = j;
            }
        }

        if (nearestBoneIndex !== -1) {
            // Each vertex is influenced by up to 4 bones in Three.js skinning
            // For this simple method, we assign 100% weight to the nearest bone.
            skinIndices.push(nearestBoneIndex, 0, 0, 0); // Bone index, followed by zeros
            skinWeights.push(1.0, 0, 0, 0); // Weight (1.0), followed by zeros
        } else {
            // Should not happen if there's at least one bone, but handle defensively
            skinIndices.push(0, 0, 0, 0);
            skinWeights.push(0, 0, 0, 0); // No influence
        }
    }

    // Add skinning attributes to the geometry
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

    console.log("Added skinIndex and skinWeight attributes to geometry.");
}


/**
 * Creates a Skeleton and binds it to the geometry by adding skinning attributes.
 * Uses a simple nearest-bone weighting strategy.
 * Modifies the input geometry directly.
 *
 * @param {THREE.BufferGeometry} geometry - The geometry to rig. Must have position attribute.
 * @param {Array<{x: number, y: number, z: number}>} jointPositions - Suggested joint positions.
 * @returns {THREE.Skeleton | null} The created Skeleton object, or null if failed.
 */
export function createAndBindSkeleton(geometry, jointPositions) {
    if (!geometry || !jointPositions || jointPositions.length === 0) {
        console.error("Invalid input: Geometry or joint positions missing.");
        return null;
    }

    // --- 1. Create Bones ---
    const bones = createBones(jointPositions);
    if (bones.length === 0) {
        console.error("Failed to create bones.");
        return null;
    }

    // --- 2. Calculate Skin Weights (Simple Nearest Bone) ---
    // This modifies the geometry, adding skinIndex and skinWeight attributes
    calculateNearestBoneWeights(geometry, bones);

    // --- 3. Create Skeleton ---
    const skeleton = new THREE.Skeleton(bones);

    // --- 4. Bind Skeleton to Geometry (Optional but good practice) ---
    // This step mainly ensures the geometry and skeleton are linked conceptually.
    // The actual binding happens via the skinIndex/skinWeight attributes and
    // using the skeleton in a SkinnedMesh.
    // We might store the skeleton reference in geometry.userData if needed later.
    geometry.userData.skeleton = skeleton; // Optional: Store reference

    console.log("Skeleton created and bound to geometry (attributes added).");

    return skeleton;
} 