// utils/modelLoader.js
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { useState, useEffect } from 'react';
import { useLoader } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

/**
 * Load a GLB file using Three.js GLTFLoader
 * @param {string} url - URL of the GLB file to load
 * @param {Function} onProgress - Optional callback for loading progress
 * @returns {Promise} - Promise that resolves with the loaded model
 */
export const loadGLBModel = (url, onProgress) => {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();

        // Set up Draco decoder for compressed models
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
        loader.setDRACOLoader(dracoLoader);

        loader.load(
            url,
            (gltf) => {
                resolve(gltf);
            },
            (progress) => {
                if (onProgress) {
                    onProgress(progress.loaded / progress.total);
                }
            },
            (error) => {
                console.error('Error loading GLB model:', error);
                reject(error);
            }
        );
    });
};

/**
 * Load a GLB file from a File object
 * @param {File} file - File object containing the GLB data
 * @param {Function} onProgress - Optional callback for loading progress
 * @returns {Promise} - Promise that resolves with the loaded model
 */
export const loadGLBFromFile = (file, onProgress) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const loader = new GLTFLoader();

                // Set up Draco decoder for compressed models
                const dracoLoader = new DRACOLoader();
                dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
                loader.setDRACOLoader(dracoLoader);

                loader.parse(
                    event.target.result,
                    '',
                    (gltf) => {
                        resolve(gltf);
                    },
                    (error) => {
                        console.error('Error parsing GLB file:', error);
                        reject(error);
                    }
                );
            } catch (error) {
                console.error('Error loading GLB from file:', error);
                reject(error);
            }
        };

        reader.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                onProgress(event.loaded / event.total);
            }
        };

        reader.onerror = (error) => {
            console.error('Error reading file:', error);
            reject(error);
        };

        // Read the file as an ArrayBuffer
        reader.readAsArrayBuffer(file);
    });
};

/**
 * React hook for loading a GLB model from a URL
 * @param {string} url - URL of the GLB file to load
 * @returns {Object} - Object containing the loaded model and loading state
 */
export const useGLBModel = (url) => {
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);

    // Use the useLoader hook from @react-three/fiber
    const gltf = useLoader(
        GLTFLoader,
        url,
        (loader) => {
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
            loader.setDRACOLoader(dracoLoader);
        },
        (xhr) => {
            setProgress(xhr.loaded / xhr.total);
        },
        (error) => {
            console.error('Error loading model:', error);
            setError(error);
        }
    );

    return { gltf, progress, error };
};

/**
 * Simplified hook for loading GLB models using @react-three/drei's useGLTF
 * This is the recommended approach for most use cases
 * @param {string} path - Path to the GLB file
 * @param {boolean} useDraco - Whether to use Draco compression
 * @returns {Object} - The loaded GLTF object
 */
export const useModel = (path, useDraco = true) => {
    // Preload the model to improve performance
    useGLTF.preload(path);

    // Use drei's useGLTF hook which handles a lot of the boilerplate for us
    const model = useGLTF(path, useDraco ? 'https://www.gstatic.com/draco/v1/decoders/' : undefined);

    return model;
};

/**
 * Convert a File object to a URL for loading
 * @param {File} file - The File object to convert
 * @returns {string} - URL for the file
 */
export const fileToURL = (file) => {
    return URL.createObjectURL(file);
};

/**
 * Clean up object URLs to prevent memory leaks
 * @param {string} url - URL to revoke
 */
export const revokeObjectURL = (url) => {
    URL.revokeObjectURL(url);
};