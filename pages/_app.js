// pages/_app.js
import { ModelProvider } from '../contexts/ModelContext';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
    return (
        <ModelProvider>
            <Component {...pageProps} />
        </ModelProvider>
    );
}

export default MyApp;