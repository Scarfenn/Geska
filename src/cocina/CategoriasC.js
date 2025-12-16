

// ==================== CATEGORÍAS ====================
export const CATEGORIAS = [
  { id: 'todas', nombre: 'Todas', icono: '📋', color: '#636e72' },
  { id: 'principal', nombre: 'Plato Principal', icono: '🍽️', color: '#e17055' },
  { id: 'sopas', nombre: 'Sopas', icono: '🥣', color: '#00b894' },
  { id: 'entradas', nombre: 'Entradas', icono: '🥟', color: '#0984e3' },
  { id: 'postres', nombre: 'Postres', icono: '🍮', color: '#a29bfe' },
  { id: 'saludable', nombre: 'Saludable', icono: '🥗', color: '#2ecc71' },
  { id: 'vegetariano', nombre: 'Vegetariano', icono: '🌱', color: '#27ae60' },
  { id: 'vegano', nombre: 'Vegano', icono: '🌿', color: '#16a085' }
];


// ==================== FILTROS DE ALERGENOS Y DIETAS ====================
export const ALERGENOS = [
  { id: 'gluten', nombre: '🌾 Sin Gluten', activo: false },
  { id: 'lacteos', nombre: '🥛 Sin Lácteos', activo: false },
  { id: 'huevo', nombre: '🥚 Sin Huevo', activo: false },
  { id: 'mariscos', nombre: '🦐 Sin Mariscos', activo: false },
  { id: 'pescado', nombre: '🐟 Sin Pescado', activo: false },
  { id: 'carne', nombre: '🥩 Sin Carne', activo: false }
];

export const TAGS_ESPECIALES = [
  { id: 'vegetariano', nombre: '🌱 Vegetariano', activo: false },
  { id: 'vegano', nombre: '🌿 Vegano', activo: false },
  { id: 'saludable', nombre: '🥗 Saludable', activo: false },
  { id: 'fitness', nombre: '💪 Fitness', activo: false },
  { id: 'rapido', nombre: '⚡ Rápido (<30 min)', activo: false },
  { id: 'tradicional', nombre: '🇨🇱 Tradicional', activo: false }
];