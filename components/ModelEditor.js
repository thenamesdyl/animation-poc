// components/ModelEditor.js
import { useEffect, useRef, useState, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Lasso selection component
export function ModelEditor({ url }) {
    const { scene, gl, camera, viewport } = useThree();
    const modelRef = useRef();
    const lassoRef = useRef(new THREE.Line());

    // States for lasso selection
    const [isSelecting, setIsSelecting] = useState(false);
    const [lassoPoints, setLassoPoints] = useState([]);
    const [selectedVertices, setSelectedVertices] = useState([]);
    const [meshes, setMeshes] = useState([]);
    const [vertexPositions, setVertexPositions] = useState([]);
    const [vertexScreenPositions, setVertexScreenPositions] = useState([]);

    // Load the model and extract mesh data
    useEffect(() => {
        if (!url) return;

        // Load the model
        const { scene: modelScene } = useGLTF(url);

        // Set model in ref
        modelRef.current = modelScene.clone();

        // Extract meshes and vertex positions
        const extractedMeshes = [];
        const positions = [];

        modelScene.traverse((node) => {
            if (node.isMesh) {
                extractedMeshes.push(node);

                // Get vertex positions
                const positionArray = node.geometry.attributes.position.array;
                for (let i = 0; i < positionArray.length; i += 3) {
                    const vertex = new THREE.Vector3(
                        positionArray[i],
                        positionArray[i + 1],
                        positionArray[i + 2]
                    );
                    // Transform to world space
                    vertex.applyMatrix4(node.matrixWorld);
                    positions.push({
                        position: vertex,
                        meshIndex: extractedMeshes.length - 1,
                        vertexIndex: i / 3
                    });
                }
            }
        });

        setMeshes(extractedMeshes);
        setVertexPositions(positions);

        // Setup lasso line
        const lassoGeometry = new THREE.BufferGeometry();
        const lassoMaterial = new THREE.LineBasicMaterial({
            color: 0xffff00,
            linewidth: 2
        });
        lassoRef.current = new THREE.Line(lassoGeometry, lassoMaterial);

        // Add lasso line to scene
        scene.add(lassoRef.current);

        // Cleanup
        return () => {
            scene.remove(lassoRef.current);
        };
    }, [url, scene]);

    // Convert world positions to screen positions
    useFrame(() => {
        if (vertexPositions.length === 0) return;

        const screenPositions = vertexPositions.map(({ position, meshIndex, vertexIndex }) => {
            const screenPosition = position.clone().project(camera);
            return {
                screenX: (screenPosition.x * 0.5 + 0.5) * viewport.width,
                screenY: ((-screenPosition.y) * 0.5 + 0.5) * viewport.height,
                meshIndex,
                vertexIndex,
                position
            };
        });

        setVertexScreenPositions(screenPositions);

        // Update lasso line if selecting
        if (isSelecting && lassoPoints.length > 1) {
            const points = lassoPoints.map(point =>
                new THREE.Vector3(
                    (point.x / viewport.width) * 2 - 1,
                    -((point.y / viewport.height) * 2 - 1),
                    0
                )
            );

            lassoRef.current.geometry.setFromPoints(points);
            lassoRef.current.geometry.computeBoundingSphere();
        }
    });

    // Start lasso selection
    const handlePointerDown = (e) => {
        e.stopPropagation();
        setIsSelecting(true);
        setLassoPoints([{
            x: e.clientX - viewport.left,
            y: e.clientY - viewport.top
        }]);
    };

    // Update lasso path
    const handlePointerMove = (e) => {
        if (!isSelecting) return;
        e.stopPropagation();

        setLassoPoints([
            ...lassoPoints,
            {
                x: e.clientX - viewport.left,
                y: e.clientY - viewport.top
            }
        ]);
    };

    // Complete lasso selection
    const handlePointerUp = (e) => {
        if (!isSelecting) return;
        e.stopPropagation();

        // Complete the lasso shape by connecting to the first point
        const closedLasso = [
            ...lassoPoints,
            lassoPoints[0]
        ];

        setLassoPoints(closedLasso);
        setIsSelecting(false);

        // Select vertices inside the lasso
        selectVerticesInLasso(closedLasso);
    };

    // Determine which vertices are inside the lasso
    const selectVerticesInLasso = (lassoPath) => {
        if (!vertexScreenPositions.length || lassoPath.length < 3) return;

        const selected = vertexScreenPositions.filter(vertexData => {
            return isPointInPolygon(
                vertexData.screenX,
                vertexData.screenY,
                lassoPath
            );
        });

        setSelectedVertices(selected);

        // Highlight selected vertices
        highlightSelectedVertices(selected);
    };

    // Check if a point is inside a polygon (lasso)
    const isPointInPolygon = (x, y, polygon) => {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x;
            const yi = polygon[i].y;
            const xj = polygon[j].x;
            const yj = polygon[j].y;

            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

            if (intersect) inside = !inside;
        }

        return inside;
    };

    // Highlight the selected vertices
    const highlightSelectedVertices = (selected) => {
        // Reset all meshes first
        meshes.forEach(mesh => {
            if (mesh.material.emissive) {
                mesh.material.emissive.setRGB(0, 0, 0);
            }

            // Reset vertex colors if available
            if (mesh.geometry.attributes.color) {
                const colors = mesh.geometry.attributes.color.array;
                for (let i = 0; i < colors.length; i += 3) {
                    colors[i] = 0;     // R
                    colors[i + 1] = 0; // G
                    colors[i + 2] = 0; // B
                }
                mesh.geometry.attributes.color.needsUpdate = true;
            }
        });

        // Now highlight selected vertices
        const meshMap = new Map();

        selected.forEach(({ meshIndex, vertexIndex }) => {
            if (!meshMap.has(meshIndex)) {
                meshMap.set(meshIndex, new Set());
            }
            meshMap.get(meshIndex).add(vertexIndex);
        });

        // Apply highlights to each mesh
        meshMap.forEach((vertexIndices, meshIndex) => {
            const mesh = meshes[meshIndex];

            // Create vertex colors if they don't exist
            if (!mesh.geometry.attributes.color) {
                const positions = mesh.geometry.attributes.position;
                const count = positions.count;
                const colors = new Float32Array(count * 3);

                mesh.geometry.setAttribute(
                    'color',
                    new THREE.BufferAttribute(colors, 3)
                );
            }

            // Set color for selected vertices
            const colors = mesh.geometry.attributes.color.array;
            vertexIndices.forEach(vIndex => {
                const i = vIndex * 3;
                colors[i] = 1;       // R
                colors[i + 1] = 0.5; // G
                colors[i + 2] = 0;   // B
            });

            mesh.geometry.attributes.color.needsUpdate = true;

            // Update material to use vertex colors
            if (mesh.material) {
                mesh.material.vertexColors = true;
                mesh.material.needsUpdate = true;
            }
        });
    };

    // Reset lasso selection
    const handleReset = () => {
        setLassoPoints([]);
        setSelectedVertices([]);

        // Clear lasso line
        lassoRef.current.geometry.setFromPoints([]);
        lassoRef.current.geometry.computeBoundingSphere();

        // Reset highlights
        meshes.forEach(mesh => {
            if (mesh.material.emissive) {
                mesh.material.emissive.setRGB(0, 0, 0);
            }

            if (mesh.geometry.attributes.color) {
                const colors = mesh.geometry.attributes.color.array;
                for (let i = 0; i < colors.length; i += 3) {
                    colors[i] = 0;
                    colors[i + 1] = 0;
                    colors[i + 2] = 0;
                }
                mesh.geometry.attributes.color.needsUpdate = true;
            }
        });
    };

    return (
        <group>
            {modelRef.current && (
                <primitive
                    object={modelRef.current}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                />
            )}

            {/* Overlay elements for UI */}
            <div className="absolute top-4 right-4">
                <button
                    onClick={handleReset}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    Reset Selection
                </button>
                <div className="mt-2">
                    {selectedVertices.length > 0 && (
                        <p className="text-white bg-black bg-opacity-50 p-2 rounded">
                            Selected vertices: {selectedVertices.length}
                        </p>
                    )}
                </div>
            </div>
        </group>
    );
}

// Helper components for visualization
export function VertexMarker({ position, color = 'red', size = 0.05 }) {
    return (
        <mesh position={position}>
            <sphereGeometry args={[size, 8, 8]} />
            <meshBasicMaterial color={color} />
        </mesh>
    );
}