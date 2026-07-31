import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // 1. Importe o BrowserRouter
import App from './App';
import './index.css'; // ou seu arquivo de estilos global

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    { }
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);