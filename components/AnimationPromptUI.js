import React from 'react';
import styles from '../styles/Editor.module.css'; // Reuse editor styles or create specific ones

/**
 * UI component for entering the animation prompt and triggering skeleton generation.
 * @param {object} props
 * @param {string} props.prompt - Current prompt text.
 * @param {(value: string) => void} props.onPromptChange - Handler for textarea changes.
 * @param {() => void} props.onGenerate - Handler for the Generate button click.
 * @param {() => void} props.onCancel - Handler for the Cancel button click.
 * @param {boolean} props.isLoading - Indicates if generation is in progress.
 * @param {string | null} props.error - Error message to display, if any.
 */
function AnimationPromptUI({ prompt, onPromptChange, onGenerate, onCancel, isLoading, error }) {
    return (
        <div className={styles.animationPromptOverlay}> {/* Use styles from Editor.module.css or new */}
            <div className={styles.animationPromptContainer}>
                <h3>Generate Skeleton</h3>
                <p>Describe the animation to generate joints for the selected region:</p>
                <textarea
                    className={styles.promptInput}
                    value={prompt}
                    onChange={(e) => onPromptChange(e.target.value)}
                    placeholder="e.g., 'Make the selected arm wave hello', 'Create a walking cycle for the legs'"
                    rows={4}
                    disabled={isLoading}
                />
                <div className={styles.promptActions}>
                    <button
                        className={styles.generateButton}
                        onClick={onGenerate}
                        disabled={!prompt.trim() || isLoading}
                    >
                        {isLoading ? 'Generating...' : 'Generate Skeleton'}
                    </button>
                    <button
                        className={styles.cancelButton} // Ensure this style exists
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                </div>
                {isLoading && <p className={styles.loadingText}>Processing request...</p>}
                {error && <p className={styles.errorText}>Error: {error}</p>}
            </div>
        </div>
    );
}

export default AnimationPromptUI; 