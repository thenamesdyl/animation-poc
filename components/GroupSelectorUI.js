import React from 'react';
// Optional: Add some basic styling
// import styles from './GroupSelectorUI.module.css';

/**
 * UI component for selecting a vertex group.
 * @param {boolean} isVisible - Controls whether the component is displayed.
 * @param {string[]} groups - Array of available group names.
 * @param {string} selectedGroup - The currently selected group name.
 * @param {(groupName: string) => void} onGroupChange - Callback when the dropdown selection changes.
 * @param {() => void} onConfirm - Callback when the 'Confirm' button is clicked.
 * @param {() => void} onCancel - Callback when the 'Cancel' button is clicked.
 * @param {boolean} [isProcessing=false] - Optional flag to disable controls during processing.
 */
function GroupSelectorUI({
    isVisible,
    groups,
    selectedGroup,
    onGroupChange,
    onConfirm,
    onCancel,
    isProcessing = false // Use isPreparing from the hook here
}) {
    if (!isVisible) {
        return null;
    }

    const handleConfirm = (e) => {
        e.preventDefault(); // Prevent potential form submission
        if (!isProcessing) {
            onConfirm();
        }
    };

    const handleCancel = (e) => {
        e.preventDefault();
        if (!isProcessing) {
            onCancel();
        }
    };

    const handleSelectChange = (e) => {
        if (!isProcessing) {
            onGroupChange(e.target.value);
        }
    };

    // Basic inline styles for positioning and appearance (replace with CSS module if preferred)
    const popupStyle = {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'rgba(40, 40, 40, 0.95)',
        padding: '25px',
        borderRadius: '10px',
        border: '1px solid #555',
        color: 'white',
        zIndex: 100, // Ensure it's above other UI elements
        fontFamily: 'sans-serif',
        minWidth: '300px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
        pointerEvents: 'auto', // Make sure it's interactive',
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '8px',
        fontWeight: 'bold',
    };

    const selectStyle = {
        width: '100%',
        padding: '8px',
        marginBottom: '20px',
        borderRadius: '4px',
        border: '1px solid #666',
        backgroundColor: '#333',
        color: 'white',
    };

    const buttonContainerStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '15px',
    };

    const buttonStyle = {
        padding: '10px 15px',
        borderRadius: '5px',
        border: 'none',
        cursor: 'pointer',
        minWidth: '80px',
    };

    const confirmButtonStyle = {
        ...buttonStyle,
        backgroundColor: '#4CAF50', // Green
        color: 'white',
    };

    const cancelButtonStyle = {
        ...buttonStyle,
        backgroundColor: '#f44336', // Red
        color: 'white',
    };

    const disabledStyle = {
        opacity: 0.6,
        cursor: 'not-allowed',
    };


    return (
        <div style={popupStyle}>
            <h4 style={{ marginTop: 0, marginBottom: '15px', borderBottom: '1px solid #666', paddingBottom: '10px' }}>Select Vertex Group</h4>
            <form onSubmit={handleConfirm}>
                <label htmlFor="group-select" style={labelStyle}>Group:</label>
                <select
                    id="group-select"
                    value={selectedGroup}
                    onChange={handleSelectChange}
                    style={selectStyle}
                    disabled={isProcessing || groups.length === 0}
                >
                    {groups.length === 0 ? (
                        <option value="">No groups available</option>
                    ) : (
                        groups.map(groupName => (
                            <option key={groupName} value={groupName}>
                                {groupName}
                            </option>
                        ))
                    )}
                </select>

                <div style={buttonContainerStyle}>
                    <button
                        type="button"
                        onClick={handleCancel}
                        style={{ ...cancelButtonStyle, ...(isProcessing ? disabledStyle : {}) }}
                        disabled={isProcessing}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit" // Use submit for form handling (Enter key)
                        style={{ ...confirmButtonStyle, ...(isProcessing || groups.length === 0 ? disabledStyle : {}) }}
                        disabled={isProcessing || groups.length === 0}
                    >
                        {isProcessing ? 'Processing...' : 'Confirm'}
                    </button>
                </div>
            </form>
            {/* Optional: Display error message here if needed */}
        </div>
    );
}

export default GroupSelectorUI; 