
// ==================== CATEGORÍAS ====================

export const CATEGORIAS = [
  { id: 'todas', nombre: 'Todas', icono: 'view-list', color: '#636e72' },
  { id: 'principal', nombre: 'Plato Principal', icono: 'silverware-fork-knife', color: '#e17055' },
  { id: 'sopas', nombre: 'Sopas', icono: 'bowl-mix', color: '#00b894' },
  { id: 'entradas', nombre: 'Entradas', icono: 'food-variant', color: '#0984e3' },
  { id: 'postres', nombre: 'Postres', icono: 'cupcake', color: '#a29bfe' },
  { id: 'saludable', nombre: 'Saludable', icono: 'leaf', color: '#2ecc71' },
  { id: 'vegetariano', nombre: 'Vegetariano', icono: 'food-apple', color: '#27ae60' },
  { id: 'vegano', nombre: 'Vegano', icono: 'soy-sauce', color: '#16a085' }
];



// ==================== FILTROS DE ALERGENOS Y DIETAS ====================
export const ALERGENOS = [
  { id: 'gluten', nombre: 'Sin Gluten', icono: 'barley-off', activo: false },
  { id: 'lacteos', nombre: 'Sin Lácteos', icono: 'cheese-off', activo: false },
  { id: 'huevo', nombre: 'Sin Huevo', icono: 'egg-off-outline', activo: false },
  { id: 'mariscos', nombre: 'Sin Mariscos', icono: 'water-off', activo: false },
  { id: 'pescado', nombre: 'Sin Pescado', icono: 'fish-off', activo: false },
  { id: 'carne', nombre: 'Sin Carne', icono: 'food-steak-off', activo: false }
];

export const TAGS_ESPECIALES = [
  { id: 'vegetariano', nombre: 'Vegetariano', icono: 'leaf', activo: false },
  { id: 'vegano', nombre: 'Vegano', icono: 'sprout', activo: false },
  { id: 'saludable', nombre: 'Saludable', icono: 'heart-pulse', activo: false },
  { id: 'fitness', nombre: 'Fitness', icono: 'dumbbell', activo: false },
  { id: 'rapido', nombre: 'Rápido (<30 min)', icono: 'clock-fast', activo: false },
  { id: 'tradicional', nombre: 'Tradicional', icono: 'flag', activo: false }
];