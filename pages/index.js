import { useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';
import { loadGLBFromFile, fileToURL } from './modelLoader';
import { useModelContext } from '../contexts/ModelContext';

export default function Home() {
    const router = useRouter();
    const { storeModel } = useModelContext();
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Handle file drop
    const onDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && isValidFile(droppedFile)) {
            setFile(droppedFile);
            processGLBFile(droppedFile);
        } else {
            setUploadStatus('Invalid file format. Please upload a GLB file.');
        }
    }, []);

    // Handle file selection via input
    const onFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && isValidFile(selectedFile)) {
            setFile(selectedFile);
            processGLBFile(selectedFile);
        } else if (selectedFile) {
            setUploadStatus('Invalid file format. Please upload a GLB file.');
        }
    };

    // Check if file is valid (GLB)
    const isValidFile = (file) => {
        return file.name.toLowerCase().endsWith('.glb');
    };

    // Process the GLB file
    const processGLBFile = (file) => {
        setIsLoading(true);
        setUploadStatus('Loading model...');
        setUploadProgress(0);

        // Create object URL for the file
        const modelUrl = fileToURL(file);

        // Load the GLB file to verify it's valid
        loadGLBFromFile(file, (progress) => {
            setUploadProgress(progress * 100);
        })
            .then((modelData) => {
                setUploadStatus('Model loaded successfully!');
                setUploadProgress(100);
                setIsLoading(false);

                // Store the model data in context
                storeModel({
                    file,
                    modelUrl,
                    modelName: file.name,
                    loaded: true
                });

                // Navigate to editor page
                router.push('/editor');
            })
            .catch((error) => {
                console.error('Error loading model:', error);
                setUploadStatus('Error loading model. Please try a different file.');
                setIsLoading(false);
                setUploadProgress(0);

                // Clean up URL if there was an error
                URL.revokeObjectURL(modelUrl);
            });
    };

    return (
        <div className={styles.container}>
            <Head>
                <title>3D Animation Tool - Upload Model</title>
                <meta name="description" content="Upload your 3D model for animation" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className={styles.main}>
                <h1 className={styles.title}>3D Animation Tool</h1>

                <p className={styles.description}>
                    Upload your 3D model (.glb) to get started
                </p>

                <div
                    className={`${styles.uploadArea} ${isDragging ? styles.dragging : ''}`}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                >
                    {!file ? (
                        <>
                            <div className={styles.uploadIcon}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="17 8 12 3 7 8"></polyline>
                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                            </div>
                            <p>Drag and drop your GLB file here, or</p>
                            <label className={styles.fileInputLabel}>
                                Browse Files
                                <input
                                    type="file"
                                    accept=".glb"
                                    onChange={onFileSelect}
                                    className={styles.fileInput}
                                />
                            </label>
                        </>
                    ) : (
                        <div className={styles.uploadProgress}>
                            <h3>{file.name}</h3>
                            <div className={styles.progressContainer}>
                                <div
                                    className={styles.progressBar}
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                            <p className={styles.statusText}>{uploadStatus}</p>
                            {uploadProgress === 100 && !isLoading && (
                                <button
                                    className={styles.nextButton}
                                    onClick={() => router.push('/editor')}
                                >
                                    Continue to Editor
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </main>

            <footer className={styles.footer}>
                <p>Animation-POC - 3D Animation Tool</p>
            </footer>
        </div>
    );
}