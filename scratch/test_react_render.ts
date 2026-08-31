import React from 'react';
import { renderToString } from 'react-dom/server';
import App from '../src/App';

console.log('Testing server-side rendering of App component...');
try {
  const html = renderToString(React.createElement(App));
  console.log('✅ Rendered App successfully! HTML length:', html.length);
} catch (err) {
  console.error('❌ Error during App render:', err);
  process.exit(1);
}
