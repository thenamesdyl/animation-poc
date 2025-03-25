// contexts/ModelContext.js
import { createContext, useState, useContext } from 'react';

// Create the context
const ModelContext = createContext();

// Provider component
export function ModelProvider({ children }) {
    const [modelData, setModelData] = useState(null);

    // Function to store model data
    const storeModel = (data) => {
        setModelData(data);
    };

    // Function to clear model data
    const clearModel = () => {
        if (modelData?.modelUrl) {
            URL.revokeObjectURL(modelData.modelUrl);
        }
        setModelData(null);
    };

    return (
        <ModelContext.Provider value={{ modelData, storeModel, clearModel }}>
            {children}
        </ModelContext.Provider>
    );
}
// Custom hook for using the context
export function useModelContext() {
    const context = useContext(ModelContext);
    if (!context) {
        throw new Error('useModelContext must be used within a ModelProvider');
    }
    return context;
}
