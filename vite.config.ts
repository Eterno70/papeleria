import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/papeleria/', // ¡Asegúrate de que coincida con el nombre de tu repo!
  plugins: [react()],
});



// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';

// //https://vitejs.dev/config/
// export default defineConfig({
  // plugins: [react()],
  // optimizeDeps: {
    // exclude: ['lucide-react'],
  // },
// });
