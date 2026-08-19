import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Proveedor } from './app/Proveedor';
import { ProveedorToast } from './componentes';
import { App } from './App';
import './styles/global.css';

const contenedor = document.getElementById('root');
if (!contenedor) throw new Error('No se encontró el elemento #root.');

createRoot(contenedor).render(
  <StrictMode>
    <Proveedor>
      <BrowserRouter>
        <ProveedorToast>
          <App />
        </ProveedorToast>
      </BrowserRouter>
    </Proveedor>
  </StrictMode>,
);
