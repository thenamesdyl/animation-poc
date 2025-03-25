import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../styles/Animation.module.css'; // Create this CSS module

export default function AnimationPage() {
    const router = useRouter();
    const [animationPrompt, setAnimationPrompt] = useState('');

    const handleBack = () => {
        // Navigate back to the editor page or home page as appropriate
        // You might need context or query params to know which model was being edited
        router.back(); // Simple back navigation
    };

    const handleGenerateAnimation = () => {
        // Placeholder for future logic
        console.log('Animation Prompt:', animationPrompt);
        alert(`Generating animation based on prompt: "${animationPrompt}" (Not implemented yet)`);
        // Here you would eventually call the AI service with the prompt and model data/vertex groups
    };

    return (
        <div className={styles.container}>
            <Head>
                <title>Create Animation</title>
                <meta name="description" content="Generate animations for your 3D model" />
            </Head>

            <main className={styles.main}>
                <div className={styles.header}>
                    <button className={styles.backButton} onClick={handleBack}>
                        Back to Editor
                    </button>
                    <h1 className={styles.title}>Generate Animation</h1>
                </div>

                <div className={styles.content}>
                    <p className={styles.instructions}>
                        Describe the animation you want to create for the selected parts of your model.
                    </p>
                    <textarea
                        className={styles.promptInput}
                        value={animationPrompt}
                        onChange={(e) => setAnimationPrompt(e.target.value)}
                        placeholder="e.g., 'Make the selected arm wave hello', 'Create a walking cycle for the legs'"
                        rows={5}
                    />
                    <button
                        className={styles.generateButton}
                        onClick={handleGenerateAnimation}
                        disabled={!animationPrompt.trim()}
                    >
                        Generate Animation (Placeholder)
                    </button>
                </div>
            </main>
        </div>
    );
} 