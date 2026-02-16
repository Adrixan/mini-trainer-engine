/**
 * Application entry point for the Mini Trainer Engine.
 * 
 * Initializes i18n, sets up the router, and renders the app.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import '@core/i18n';
import '@/index.css';
import { createRouter } from '@core/router';
import { ConfigProvider } from '@core/config';

// Create the router instance
const router = createRouter();

// Render the application
createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ConfigProvider>
            <RouterProvider router={router} />
        </ConfigProvider>
    </StrictMode>
);
