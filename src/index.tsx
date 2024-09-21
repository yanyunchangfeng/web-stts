import { createRoot } from 'react-dom/client';
import React, { useCallback, useMemo } from 'react';
import App from 'src/App';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(<App />);

if (module.hot) {
  module.hot.accept();
}
