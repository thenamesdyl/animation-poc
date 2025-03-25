import * as THREE from 'three';

/**
 * Retrieves the names of vertex groups stored in a mesh's userData.
 * Assumes vertex groups are stored under mesh.userData.vertexGroups = { groupName: [indices...], ... }
 *
 * @param {THREE.Mesh} mesh - The mesh to inspect.
 * @returns {string[]} An array of vertex group names found, or an empty array if none exist or the structure is invalid.
 */
export function getVertexGroupNames(mesh) {
    // Basic validation for mesh and userData structure
    if (!mesh || !mesh.userData || typeof mesh.userData.vertexGroups !== 'object' || mesh.userData.vertexGroups === null) {
        console.warn("getVertexGroupNames: Mesh userData or vertexGroups not found or is not a valid object.");
        return []; // Return empty array if the expected structure isn't there
    }

    // Get the keys (group names) from the vertexGroups object
    const groupNames = Object.keys(mesh.userData.vertexGroups);

    // You could add filtering here if needed, e.g., to remove empty groups:
    // return groupNames.filter(name =>
    //     Array.isArray(mesh.userData.vertexGroups[name]) && mesh.userData.vertexGroups[name].length > 0
    // );

    // For now, return all found group names
    console.log("getVertexGroupNames: Found groups:", groupNames);
    return groupNames;
}

// You can add other mesh-related utility functions here in the future 