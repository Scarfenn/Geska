/**
 * Rescate del módulo experimental de cocina. Sin UI, red ni persistencia.
 * Las futuras integraciones con APIs deben adaptar sus respuestas a este modelo.
 * No contiene el antiguo catálogo hardcodeado ni está conectado a la aplicación.
 * Historial: catálogo en f54ce2d:src/shared/storage/recetas.js;
 * estilos originales en d655eb4^:src/cocina/stylesC.js.
 */

// Modelo conservado de src/storage/recetas.js. Cada llamada crea arrays propios.
// id debe ser estable y único entre proveedores (por ejemplo, "proveedor:123").
// null significa dato desconocido; allergens: [] significa lista conocida vacía.
// Los adaptadores deben normalizar ingredientes/pasos a arrays de strings,
// duración a minutos y categorías/etiquetas a identificadores estables.
export function createRecipeTemplate() {
  return {
    id: '',
    source: 'local',
    sourceId: '',
    name: '',
    category: 'main',
    estimatedMinutes: null,
    effort: null,
    servings: null,
    description: '',
    ingredients: [],
    steps: [],
    tags: [],
    allergens: null,
    imageUrl: null,
    originalUrl: null,
  };
}

// Dietas y atributos se representan como tags, no como categorías de platos.
export const RECIPE_CATEGORIES = ['main', 'soups', 'starters', 'desserts'];
export const RECIPE_TAGS = [
  'vegetarian', 'vegan', 'healthy', 'fitness', 'traditional',
];
export const RECIPE_EFFORTS = ['easy', 'medium', 'hard'];

const normalizeText = (value) => String(value ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/**
 * Búsqueda por nombre, descripción e ingredientes; filtros combinados con AND.
 * requiredTags exige todas las etiquetas. excludedAllergens usa los IDs del
 * adaptador: este rescate no define un catálogo exhaustivo de alérgenos.
 * Cuando se excluyen alérgenos, se omiten recetas con información desconocida.
 * quickOnly significa menos de 30 minutos. No se infieren dietas de ingredientes.
 */
export function filterRecipes(recipes, {
  query = '', category = null, maxMinutes = null, efforts = [],
  requiredTags = [], excludedAllergens = [], quickOnly = false,
} = {}) {
  const search = normalizeText(query);
  return recipes.filter((recipe) => {
    const searchable = [recipe.name, recipe.description, ...(recipe.ingredients ?? [])];
    if (search && !searchable.some((text) => normalizeText(text).includes(search))) return false;
    if (category && recipe.category !== category) return false;
    const minutes = recipe.estimatedMinutes;
    if (maxMinutes != null || quickOnly) {
      if (!Number.isFinite(minutes) || minutes < 0) return false;
      if (maxMinutes != null && minutes > maxMinutes) return false;
      if (quickOnly && minutes >= 30) return false;
    }
    if (efforts.length && !efforts.includes(recipe.effort)) return false;
    if (!requiredTags.every((tag) => (recipe.tags ?? []).includes(tag))) return false;
    if (excludedAllergens.length && (!Array.isArray(recipe.allergens) ||
      excludedAllergens.some((allergen) => recipe.allergens.includes(allergen)))) return false;
    return true;
  });
}

// Fisher–Yates sobre una copia: no modifica el catálogo recibido de la API.
export function recommendRecipes(recipes, filters = {}, count = 5) {
  if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('Cantidad inválida');
  const candidates = filterRecipes(recipes, filters);
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [candidates[index], candidates[other]] = [candidates[other], candidates[index]];
  }
  return candidates.slice(0, count);
}

// Mantener únicamente IDs como fuente de verdad; la UI deriva si es favorita.
// La persistencia futura debe usar una clave propia, no la antigua "favoritos".
export function toggleRecipeFavorite(favoriteIds, recipeId) {
  const ids = new Set(favoriteIds);
  if (ids.has(recipeId)) ids.delete(recipeId);
  else ids.add(recipeId);
  return [...ids];
}

// Paginación local; APIs con cursores deben gestionar su propia paginación.
export function paginateRecipes(recipes, page = 1, pageSize = 20) {
  if (!Number.isSafeInteger(page) || page < 1 ||
    !Number.isSafeInteger(pageSize) || pageSize < 1) throw new RangeError('Paginación inválida');
  const totalPages = Math.max(1, Math.ceil(recipes.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * pageSize;
  return { items: recipes.slice(offset, offset + pageSize), page: currentPage,
    totalPages, totalItems: recipes.length };
}

/**
 * Rescata la acción "Preparar receta" como borrador, sin escribir en SQLite.
 * Entregar el resultado a createTask de tasks/services/taskCommands.
 * categoryId debe proceder de las categorías reales de la aplicación.
 */
export function createRecipeTaskDraft(recipe, { date = new Date(), categoryId = null } = {}) {
  if (typeof recipe.name !== 'string' || !recipe.name.trim()) throw new Error('Falta el nombre de la receta');
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new Error('Fecha inválida');
  return {
    text: `Preparar ${recipe.name.trim()}`,
    categoryId,
    subtasks: [],
    schedule: {
      selectedDate: new Date(date), selectedTime: null,
      repeatMode: 'none', repeatDays: [], repeatInterval: 1,
      endDate: null, reminder: null,
    },
  };
}