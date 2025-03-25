// contexts/ModelContext.js
import { createContext, useState, useContext, useCallback } from 'react';
import * as THREE from 'three'; // Import THREE if needed for types, though maybe not strictly necessary here

// Create the context
const ModelContext = createContext({
    modelData: null,
    groupedVertexData: null,
    modelGeometry: null, // Add state for geometry
    storeModel: (data) => { },
    storeGroupedVertexData: (vertexData) => { },
    storeModelGeometry: (geometry) => { }, // Add function signature
    clearModel: () => { },
});

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
    const [modelGeometry, setModelGeometry] = useState(null); // State to hold geometry

    // Function to store model file/URL data
    const storeModel = useCallback((data) => {
        console.log("Storing model file data:", data);
        setModelData(data);
        setGroupedVertexData(null); // Clear vertex data when a new model file is stored
        setModelGeometry(null); // Clear geometry when new model file is stored
    }, []);

    // Function to store the pre-calculated vertex data
    const storeGroupedVertexData = useCallback((vertexData) => {
        console.log(`Storing ${vertexData?.length || 0} grouped vertex data points.`);
        setGroupedVertexData(vertexData);
    }, []);

    // Function to store the model's geometry
    const storeModelGeometry = useCallback((geometry) => {
        // We might want to clone or serialize/deserialize if context issues arise,
        // but let's start by storing the direct reference or a clone.
        // Cloning is safer to prevent accidental modifications elsewhere.
        if (geometry) {
            const clonedGeometry = geometry.clone();
            console.log("Storing cloned model geometry.");
            setModelGeometry(clonedGeometry);
        } else {
            console.log("Clearing model geometry.");
            setModelGeometry(null);
        }
    }, []);

    // Function to clear model data
    const clearModel = useCallback(() => {
        console.log("Clearing model, grouped vertex data, and geometry.");
        if (modelData?.modelUrl) {
            URL.revokeObjectURL(modelData.modelUrl);
        }
        setModelData(null);
        setGroupedVertexData(null); // Also clear vertex data
        setModelGeometry(null); // Clear geometry
    }, [modelData?.modelUrl]);

    return (
        <ModelContext.Provider value={{
            modelData,
            groupedVertexData,
            modelGeometry, // Provide geometry
            storeModel,
            storeGroupedVertexData,
            storeModelGeometry, // Provide setter
            clearModel
        }}>
            {children}
        </ModelContext.Provider>
    );
}
