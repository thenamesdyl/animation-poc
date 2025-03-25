// contexts/ModelContext.js
import { createContext, useState, useContext, useCallback } from 'react';
import * as THREE from 'three'; // Import THREE if needed for types, though maybe not strictly necessary here

// Create the context
const ModelContext = createContext();

// Custom hook to use the context
export function useModelContext() {
    const context = useContext(ModelContext);
    if (!context) {
        throw new Error('useModelContext must be used within a ModelProvider');
    }
    return context;
}

// Provider component
export function ModelProvider({ children }) {
    const [modelData, setModelData] = useState(null);
    // Store pre-calculated vertex data for animation page
    const [groupedVertexData, setGroupedVertexData] = useState(null); // Array of { index: number, position: {x,y,z} }

    // Function to store model file/URL data
    const storeModel = useCallback((data) => {
        console.log("Storing model file data:", data);
        setModelData(data);
        setGroupedVertexData(null); // Clear vertex data when a new model file is stored
    }, []);

    // Function to store the pre-calculated vertex data
    const storeGroupedVertexData = useCallback((vertexData) => {
        console.log(`Storing ${vertexData?.length || 0} grouped vertex data points.`);
        setGroupedVertexData(vertexData);
    }, []);

    // Function to clear model data
    const clearModel = useCallback(() => {
        console.log("Clearing model and grouped vertex data.");
        if (modelData?.modelUrl) {
            URL.revokeObjectURL(modelData.modelUrl);
        }
        setModelData(null);
        setGroupedVertexData(null); // Also clear vertex data
    }, [modelData?.modelUrl]);

    return (
        <ModelContext.Provider value={{ modelData, groupedVertexData, storeModel, storeGroupedVertexData, clearModel }}>
            {children}
        </ModelContext.Provider>
    );
}
